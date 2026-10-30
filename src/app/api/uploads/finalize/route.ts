import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders, photos } from "@/db/schema";
import { getPhotoStorage, getLocalDiskStorage } from "@/lib/services/photo-storage";
import { validatePhotoMagicBytes } from "@/lib/security";
import { buildPhotoPreviewUrl } from "@/lib/orders";
import { handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      draftToken?: string;
      sessionId?: string;
      storageFileId?: string;
      caption?: string;
      category?: "solo" | "shared";
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
    }

    const category = body.category === "shared" ? "shared" : "solo";

    // Determine sort order & whether this is the first solo photo (default to cover)
    const existingCountRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photos)
      .where(eq(photos.orderId, order.id));
    const existingCount = existingCountRes[0]?.count ?? 0;

    const existingCoverRes = await db
      .select({ id: photos.id })
      .from(photos)
      .where(sql`${photos.orderId} = ${order.id} AND ${photos.isCover} = true`);
    const hasCover = existingCoverRes.length > 0;
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
        previewUrl: buildPhotoPreviewUrl(inserted.id, order.id),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
