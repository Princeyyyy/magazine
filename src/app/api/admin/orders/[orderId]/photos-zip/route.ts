import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import archiver from "archiver";
import { PassThrough } from "stream";
import { db, ensureDbReady } from "@/db";
import { orders, photos } from "@/db/schema";
import { getAuthenticatedAdminEmail } from "@/auth";
import { getPhotoStorage, getLocalDiskStorage } from "@/lib/services/photo-storage";
import { handleApiError } from "@/lib/api-response";
import { NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail();
    if (!adminEmail) {
      throw new UnauthorizedError();
    }

    const { orderId } = await context.params;
    await ensureDbReady();

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    const orderPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.orderId, order.id))
      .orderBy(asc(photos.sortOrder), asc(photos.uploadedAt));

    if (orderPhotos.length === 0) {
      throw new ValidationError("This order has no uploaded photos to export.");
    }

    const archive = archiver("zip", { zlib: { level: 5 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    // Populate archive asynchronously so response streams immediately
    void (async () => {
      try {
        const captionsManifest: string[] = [
          `# Photo Manifest — ${order.reference} (${order.herName || "Her"})`,
          "",
        ];

        for (let i = 0; i < orderPhotos.length; i++) {
          const p = orderPhotos[i]!;
          const adapter =
            p.storageProvider === "local"
              ? getLocalDiskStorage()
              : getPhotoStorage();

          try {
            const fileData = await adapter.getFile(p.storageFileId, order.id);
            const prefix = p.isCover
              ? `00_COVER_${String(i + 1).padStart(2, "0")}`
              : String(i + 1).padStart(2, "0");
            const entryName = `${prefix}_${p.originalName}`;

            archive.append(fileData.buffer, { name: entryName });
            captionsManifest.push(
              `${entryName}${p.isCover ? " [COVER PHOTO]" : ""} — Caption: ${
                p.caption || "(none)"
              }`
            );
          } catch (err) {
            captionsManifest.push(
              `[MISSING FILE] ${p.originalName} (${
                err instanceof Error ? err.message : "read error"
              })`
            );
          }
        }

        archive.append(captionsManifest.join("\n"), {
          name: "captions-manifest.txt",
        });

        await archive.finalize();
      } catch (err) {
        archive.destroy(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        passThrough.on("end", () => {
          controller.close();
        });
        passThrough.on("error", (err) => {
          controller.error(err);
        });
      },
    });

    const zipFilename = `${order.reference}-${(order.herName || "Magazine")
      .replace(/[^a-zA-Z0-9_-]/g, "_")}-Photos.zip`;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
