import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders, photos } from "@/db/schema";
import { getPhotoStorage, getLocalDiskStorage } from "@/lib/services/photo-storage";
import { validatePhotoMagicBytes } from "@/lib/security";
import { buildPhotoPreviewUrl } from "@/lib/orders";
import { handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { isVisualDuplicate } from "@/lib/image-fingerprint";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      draftToken?: string;
      sessionId?: string;
      storageFileId?: string;
      caption?: string;
      category?: "solo" | "shared";
      contentHash?: string;
      perceptualHash?: string;
    };

    if (!body.draftToken || !body.sessionId) {
      throw new ValidationError("Missing draftToken or sessionId.");
    }

    await ensureDbReady();
    const order = await db.query.orders.findFirst({
      where: eq(orders.draftToken, body.draftToken),
    });

    if (!order) {
      throw new NotFoundError("Order draft");
    }

    const storage = getPhotoStorage();
    const finalized = await storage.finalizeUpload(
      order.id,
      body.sessionId,
      body.storageFileId
    );

    // If stored locally, verify magic bytes on disk to prevent spoofed file extensions
    let verifiedMime = finalized.mime;
    let finalContentHash = body.contentHash;

    if (finalized.storageProvider === "local") {
      const local = getLocalDiskStorage();
      const fileData = await local.getFile(finalized.storageFileId, order.id);
      const magicCheck = validatePhotoMagicBytes(
        fileData.buffer.subarray(0, 64),
        finalized.originalName
      );

      if (!magicCheck.valid) {
        await local.deleteFile(finalized.storageFileId, order.id);
        throw new ValidationError(magicCheck.error);
      }
      verifiedMime = magicCheck.detectedMime;
      finalContentHash = crypto.createHash("sha256").update(fileData.buffer).digest("hex");
    }

    // Check for duplicate photos against already uploaded photos for this order
    const existingPhotos = await db.query.photos.findMany({
      where: eq(photos.orderId, order.id),
    });

    for (let i = 0; i < existingPhotos.length; i++) {
      const existing = existingPhotos[i]!;
      const isExactDuplicate =
        finalContentHash &&
        existing.contentHash &&
        finalContentHash === existing.contentHash;

      const isVisDuplicate =
        body.perceptualHash &&
        existing.perceptualHash &&
        isVisualDuplicate(body.perceptualHash, existing.perceptualHash, 8);

      if (isExactDuplicate || isVisDuplicate) {
        if (finalized.storageProvider === "local") {
          const local = getLocalDiskStorage();
          await local.deleteFile(finalized.storageFileId, order.id).catch(() => {});
        }
        return NextResponse.json(
          {
            error: {
              code: "DUPLICATE_PHOTO",
              message: `"${finalized.originalName}" is ${
                isExactDuplicate ? "an exact duplicate of" : "visually nearly identical to"
              } Photo ${i + 1} ("${existing.originalName}"). Each photo in your keepsake must be a unique image.`,
              conflictingPhoto: existing.originalName,
              conflictingIndex: i + 1,
            },
          },
          { status: 409 }
        );
      }
    }

    const category = body.category === "shared" ? "shared" : "solo";

    // Determine sort order & whether this is the first solo photo (default to cover)
    const existingCount = existingPhotos.length;
    const hasCover = existingPhotos.some((p) => p.isCover);
    const isCover = category === "solo" && !hasCover;

    const [inserted] = await db
      .insert(photos)
      .values({
        orderId: order.id,
        storageProvider: finalized.storageProvider,
        storageFileId: finalized.storageFileId,
        originalName: finalized.originalName,
        mime: verifiedMime,
        sizeBytes: finalized.sizeBytes,
        caption: body.caption?.trim() || "",
        isCover,
        sortOrder: existingCount,
        category,
        contentHash: finalContentHash ?? null,
        perceptualHash: body.perceptualHash ?? null,
      })
      .returning();

    if (!inserted) {
      throw new Error("Failed to save photo record.");
    }

    await db
      .update(orders)
      .set({ updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      photo: {
        id: inserted.id,
        storageProvider: inserted.storageProvider as "local" | "drive",
        storageFileId: inserted.storageFileId,
        originalName: inserted.originalName,
        mime: inserted.mime,
        sizeBytes: inserted.sizeBytes,
        caption: inserted.caption,
        isCover: inserted.isCover,
        sortOrder: inserted.sortOrder,
        category: inserted.category as "solo" | "shared",
        contentHash: inserted.contentHash ?? undefined,
        perceptualHash: inserted.perceptualHash ?? undefined,
        previewUrl: buildPhotoPreviewUrl(inserted.id, order.id),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
