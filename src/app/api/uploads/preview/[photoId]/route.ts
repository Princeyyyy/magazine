import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { photos } from "@/db/schema";
import { verifyPhotoPreviewToken } from "@/lib/security";
import { getPhotoStorage, getLocalDiskStorage } from "@/lib/services/photo-storage";
import { handleApiError } from "@/lib/api-response";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await context.params;
    const orderId = req.nextUrl.searchParams.get("orderId") ?? "";
    const sig = req.nextUrl.searchParams.get("sig") ?? "";

    if (!orderId || !sig || !verifyPhotoPreviewToken(photoId, orderId, sig)) {
      throw new ForbiddenError("Invalid or expired photo preview signature.");
    }

    await ensureDbReady();
    const photo = await db.query.photos.findFirst({
      where: and(eq(photos.id, photoId), eq(photos.orderId, orderId)),
    });

    if (!photo) {
      throw new NotFoundError("Photo");
    }

    const adapter =
      photo.storageProvider === "local"
        ? getLocalDiskStorage()
        : getPhotoStorage();

    const { buffer, mimeType } = await adapter.getThumbnail(
      photo.storageFileId,
      orderId
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
