import { NextRequest, NextResponse } from "next/server";
import { getLocalDiskStorage } from "@/lib/services/photo-storage";
import { handleApiError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      throw new ValidationError("Missing sessionId");
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
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      throw new ValidationError("Missing sessionId");
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
