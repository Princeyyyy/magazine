import { NextRequest, NextResponse } from "next/server";
import { getLocalDiskStorage } from "@/lib/services/photo-storage";
import { PHOTO_UPLOAD_CONFIG } from "@/config/form";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import { RateLimitError, ValidationError } from "@/lib/errors";

const SAFE_SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId || !SAFE_SESSION_ID_REGEX.test(sessionId)) {
      throw new ValidationError("Invalid or missing sessionId");
    }
    const local = getLocalDiskStorage();
    const offset = await local.getSessionOffset(sessionId);
    return NextResponse.json({ offset });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`upload:chunk:${ip}`, 180, 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId || !SAFE_SESSION_ID_REGEX.test(sessionId)) {
      throw new ValidationError("Invalid or missing sessionId");
    }

    const contentRange = req.headers.get("content-range");
    let offset: number | undefined;
    if (contentRange) {
      // e.g. "bytes 0-524287/1234567"
      const match = /bytes\s+(\d+)-/i.exec(contentRange);
      if (match && match[1]) {
        offset = Number(match[1]);
      }
    }

    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength > PHOTO_UPLOAD_CONFIG.maxFileSizeBytes) {
      throw new ValidationError("Chunk exceeds maximum file size.");
    }
    const chunk = Buffer.from(arrayBuffer);

    const local = getLocalDiskStorage();
    const result = await local.appendChunk(sessionId, chunk, offset);

    return NextResponse.json({
      ok: true,
      receivedBytes: result.receivedBytes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
