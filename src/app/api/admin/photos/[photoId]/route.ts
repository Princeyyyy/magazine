import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { photos } from "@/db/schema";
import { getAuthenticatedAdminEmail } from "@/auth";
import { getPhotoStorage, getLocalDiskStorage } from "@/lib/services/photo-storage";
import { handleApiError } from "@/lib/api-response";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail();
    if (!adminEmail) {
      throw new UnauthorizedError();
    }

    const { photoId } = await context.params;
    const isFull = req.nextUrl.searchParams.get("size") === "full";
    const isDownload = req.nextUrl.searchParams.get("download") === "1";

    await ensureDbReady();
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, photoId),
    });

    if (!photo) {
      throw new NotFoundError("Photo", photoId);
    }

    const adapter =
      photo.storageProvider === "local"
        ? getLocalDiskStorage()
        : getPhotoStorage();

    if (isFull || isDownload) {
      const { buffer, mimeType } = await adapter.getFile(
        photo.storageFileId,
        photo.orderId
      );
      const headers: Record<string, string> = {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      };
      if (isDownload) {
        headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(
          photo.originalName
        )}"`;
      }
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers,
      });
    } else {
      const { buffer, mimeType } = await adapter.getThumbnail(
        photo.storageFileId,
        photo.orderId
      );
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
