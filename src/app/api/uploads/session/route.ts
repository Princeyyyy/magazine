import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders, photos } from "@/db/schema";
import { getPhotoStorage } from "@/lib/services/photo-storage";
import { PHOTO_UPLOAD_CONFIG } from "@/config/form";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit, sanitizeFileName } from "@/lib/security";
import { generateNextOrderReference } from "@/lib/orders";
import { NotFoundError, RateLimitError, ValidationError } from "@/lib/errors";

const folderCreationLocks = new Map<string, Promise<string>>();

async function getOrCreateOrderDriveFolder(orderId: string): Promise<string> {
  const existingLock = folderCreationLocks.get(orderId);
  if (existingLock) {
    return existingLock;
  }

  const promise = (async () => {
    try {
      const freshOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
      if (!freshOrder) {
        throw new NotFoundError("Order draft");
      }
      if (freshOrder.driveFolderId) {
        return freshOrder.driveFolderId;
      }

      const storage = getPhotoStorage();
      const folderLabel = `${freshOrder.herName || "Magazine Order"} - ${freshOrder.reference}`;
      const newFolderId = await storage.createOrderFolder(
        freshOrder.id,
        folderLabel
      );
      const newFolderUrl = await storage.getFolderUrl(
        freshOrder.id,
        newFolderId
      );
      await db
        .update(orders)
        .set({
          driveFolderId: newFolderId,
          driveFolderUrl: newFolderUrl,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, freshOrder.id));
      return newFolderId;
    } finally {
      folderCreationLocks.delete(orderId);
    }
  })();

  folderCreationLocks.set(orderId, promise);
  return promise;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`upload:session:${ip}`, 60, 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const body = (await req.json()) as {
      draftToken?: string;
      fileName?: string;
      mimeType?: string;
      sizeBytes?: number;
      category?: "solo" | "shared";
    };

    if (!body.fileName || typeof body.sizeBytes !== "number") {
      throw new ValidationError("Missing upload parameters.");
    }

    const safeFileName = sanitizeFileName(body.fileName);
    const ext = safeFileName.toLowerCase().slice(safeFileName.lastIndexOf("."));
    const allowedExts: readonly string[] = PHOTO_UPLOAD_CONFIG.acceptedExtensions;
    if (!allowedExts.includes(ext)) {
      throw new ValidationError(
        `Unsupported file format (${ext}). Accepted: JPG, JPEG, PNG, HEIC, HEIF.`
      );
    }

    if (body.sizeBytes <= 0 || body.sizeBytes > PHOTO_UPLOAD_CONFIG.maxFileSizeBytes) {
      throw new ValidationError(
        `Each photo must be under ${PHOTO_UPLOAD_CONFIG.maxFileSizeMB} MB.`
      );
    }

    await ensureDbReady();
    let order = body.draftToken?.trim()
      ? await db.query.orders.findFirst({
          where: eq(orders.draftToken, body.draftToken.trim()),
        })
      : null;

    if (!order) {
      const reference = await generateNextOrderReference();
      const newDraftToken = crypto.randomBytes(24).toString("hex");
      const [createdOrder] = await db
        .insert(orders)
        .values({
          reference,
          draftToken: newDraftToken,
          status: "draft",
        })
        .returning();

      if (!createdOrder) {
        throw new Error("Failed to initialize draft for photo upload.");
      }
      order = createdOrder;
    }

    if (order.status !== "draft") {
      throw new ValidationError("This order has already been submitted and locked.");
    }

    const category = body.category === "shared" ? "shared" : "solo";

    // Check existing photo count for this category
    const countRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photos)
      .where(sql`${photos.orderId} = ${order.id} AND ${photos.category} = ${category}`);
    const currentCount = countRes[0]?.count ?? 0;

    const maxAllowed =
      category === "shared"
        ? PHOTO_UPLOAD_CONFIG.sharedMaxFiles
        : PHOTO_UPLOAD_CONFIG.soloMaxFiles;

    if (currentCount >= maxAllowed) {
      throw new ValidationError(
        `Maximum of ${maxAllowed} ${category === "shared" ? "shared" : "solo"} photos reached.`
      );
    }

    const storage = getPhotoStorage();

    // Ensure order folder exists (race-safe when uploading photos at once)
    const driveFolderId =
      order.driveFolderId || (await getOrCreateOrderDriveFolder(order.id));

    const origin = req.headers.get("origin") ?? undefined;
    const session = await storage.createUploadSession(
      order.id,
      {
        fileName: safeFileName,
        mimeType: body.mimeType || "image/jpeg",
        sizeBytes: body.sizeBytes,
        origin,
        category,
      },
      driveFolderId
    );

    return NextResponse.json({
      session: {
        ...session,
        draftToken: order.draftToken,
        reference: order.reference,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
