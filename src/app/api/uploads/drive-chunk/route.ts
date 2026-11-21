import { NextRequest, NextResponse } from "next/server";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit, verifyDriveUploadUrl } from "@/lib/security";
import { ForbiddenError, RateLimitError, ValidationError } from "@/lib/errors";

const MAX_PROXY_CHUNK_BYTES = 3.5 * 1024 * 1024; // 3.5 MB (safely below Vercel 4.5 MB body limit)

/**
 * Same-origin server-to-server chunk proxy for Google Drive resumable uploads.
 *
 * Eliminates browser CORS errors, Safari/iOS HTTP 308 Resume Incomplete quirks,
 * ad-blocker interference on googleapis.com, and unreadable cross-origin response bodies
 * so `driveFileId` is always captured reliably on the final chunk.
 */
export async function PUT(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`upload:drive-chunk:${ip}`, 360, 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const uploadUrl = req.headers.get("x-upload-url")?.trim() ?? "";
    const uploadSig = req.headers.get("x-upload-sig")?.trim() ?? "";
    const orderId = req.headers.get("x-order-id")?.trim() ?? "";
    const contentRange = req.headers.get("content-range")?.trim() ?? "";
    const contentType =
      req.headers.get("content-type")?.trim() || "application/octet-stream";

    if (!uploadUrl || !uploadSig || !orderId) {
      throw new ValidationError("Missing Drive upload proxy headers.");
    }

    if (!verifyDriveUploadUrl(uploadUrl, orderId, uploadSig)) {
      throw new ForbiddenError("Invalid or expired Drive upload signature.");
    }

    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new ValidationError("Empty upload chunk.");
    }
    if (arrayBuffer.byteLength > MAX_PROXY_CHUNK_BYTES) {
      throw new ValidationError("Upload chunk exceeds maximum proxy chunk size.");
    }

    const forwardHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(arrayBuffer.byteLength),
    };
    if (contentRange) {
      forwardHeaders["Content-Range"] = contentRange;
    }

    const driveRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: forwardHeaders,
      body: Buffer.from(arrayBuffer),
    });

    // Google Drive returns 308 Resume Incomplete for intermediate chunks
    if (driveRes.status === 308) {
      return NextResponse.json({
        ok: true,
        complete: false,
        status: 308,
        range: driveRes.headers.get("range") ?? undefined,
      });
    }

    // Google Drive returns 200 or 201 on the final chunk with the created file metadata JSON
    if (driveRes.status === 200 || driveRes.status === 201) {
      const text = await driveRes.text();
      let driveFileId: string | undefined;
      try {
        const parsed = JSON.parse(text) as { id?: string };
        driveFileId = parsed.id;
      } catch {
        // Fallback resolution in /api/uploads/finalize will still locate it
      }

      return NextResponse.json({
        ok: true,
        complete: true,
        status: driveRes.status,
        driveFileId,
      });
    }

    const errText = await driveRes.text().catch(() => "");
    console.warn(
      `[DriveChunkProxy] Google Drive returned HTTP ${driveRes.status}: ${errText.slice(0, 300)}`
    );

    const isRetryable =
      driveRes.status === 408 ||
      driveRes.status === 429 ||
      driveRes.status >= 500;

    return NextResponse.json(
      {
        error: {
          code: isRetryable ? "DRIVE_TRANSIENT_ERROR" : "DRIVE_UPLOAD_ERROR",
          message: isRetryable
            ? "Temporary storage connection hiccup. Retrying..."
            : `Storage rejected upload chunk (HTTP ${driveRes.status}). Please retry.`,
          retryable: isRetryable,
        },
      },
      { status: isRetryable ? 502 : 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
