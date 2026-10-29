import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders, photos } from "@/db/schema";
import { getPhotoStorage, getLocalDiskStorage } from "@/lib/services/photo-storage";
import { sanitizeText } from "@/lib/security";
import { handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await context.params;
    const body = (await req.json()) as {
      draftToken?: string;
      caption?: string;
      isCover?: boolean;
    };

    if (!body.draftToken) {
      throw new ValidationError("Missing draftToken.");
    }

    await ensureDbReady();
    const order = await db.query.orders.findFirst({
      where: eq(orders.draftToken, body.draftToken),
    });

    if (!order) {
      throw new NotFoundError("Order draft");
    }

    const photo = await db.query.photos.findFirst({
      where: and(eq(photos.id, photoId), eq(photos.orderId, order.id)),
    });

    if (!photo) {
      throw new NotFoundError("Photo");
    }

    if (body.isCover === true) {
      // Unset isCover on all other photos of this order, then set on this photo
      await db
        .update(photos)
        .set({ isCover: false })
        .where(eq(photos.orderId, order.id));
    }

    const updates: Partial<typeof photos.$inferInsert> = {};
    if (typeof body.caption === "string") {
      updates.caption = sanitizeText(body.caption).slice(0, 200);
    }
    if (typeof body.isCover === "boolean") {
      updates.isCover = body.isCover;
    }

    const [updated] = await db
      .update(photos)
      .set(updates)
      .where(eq(photos.id, photo.id))
      .returning();

    return NextResponse.json({ photo: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await context.params;
    const draftToken = req.nextUrl.searchParams.get("draftToken");

    if (!draftToken) {
      throw new ValidationError("Missing draftToken.");
    }

    await ensureDbReady();
    const order = await db.query.orders.findFirst({
      where: eq(orders.draftToken, draftToken),
    });

    if (!order) {
      throw new NotFoundError("Order draft");
    }

    if (order.status !== "draft") {
      throw new ValidationError("Cannot delete photos from a submitted order.");
    }

    const photo = await db.query.photos.findFirst({
      where: and(eq(photos.id, photoId), eq(photos.orderId, order.id)),
    });

    if (!photo) {
      throw new NotFoundError("Photo");
    }

    if (photo.storageProvider === "local") {
      await getLocalDiskStorage().deleteFile(photo.storageFileId, order.id);
    } else {
      await getPhotoStorage().deleteFile(photo.storageFileId, order.id);
    }

    await db.delete(photos).where(eq(photos.id, photo.id));

    // If the deleted photo was the cover photo, promote the first remaining photo
    if (photo.isCover) {
      const remaining = await db.query.photos.findFirst({
        where: eq(photos.orderId, order.id),
      });
      if (remaining) {
        await db
          .update(photos)
          .set({ isCover: true })
          .where(eq(photos.id, remaining.id));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
