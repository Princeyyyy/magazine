import { describe, it, expect } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { LocalDiskStorage } from "@/lib/services/photo-storage";
import { signPhotoPreviewToken, verifyPhotoPreviewToken } from "@/lib/security";

describe("LocalDiskStorage & Security Preview Tokens", () => {
  it("stores, reads, renames folder, and deletes a photo on local disk", async () => {
    const tempBase = await fs.mkdtemp(path.join(os.tmpdir(), "hcm-storage-test-"));
    const storage = new LocalDiskStorage(tempBase);
    const orderId = `test-order-${Date.now()}`;

    const folderId = await storage.createOrderFolder(
      orderId,
      "Zuri Mwangi - HM-2026-0099"
    );
    expect(folderId).toBe(`local-folder:${orderId}`);

    const sampleBytes = Buffer.from("fake-jpeg-binary-content", "utf8");
    const session = await storage.createUploadSession(orderId, {
      fileName: "zuri-cover.jpg",
      mimeType: "image/jpeg",
      sizeBytes: sampleBytes.length,
    });

    await storage.appendChunk(session.sessionId, sampleBytes, 0);
    const finalized = await storage.finalizeUpload(orderId, session.sessionId);

    expect(finalized.storageProvider).toBe("local");
    expect(finalized.storageFileId).toContain("zuri-cover.jpg");

    const readBack = await storage.getFile(finalized.storageFileId, orderId);
    expect(readBack.buffer.toString("utf8")).toBe("fake-jpeg-binary-content");

    await storage.deleteFile(finalized.storageFileId, orderId);
    await fs.rm(tempBase, { recursive: true, force: true });
  });

  it("signs and verifies HMAC photo preview tokens", () => {
    const photoId = "photo-uuid-123";
    const orderId = "order-uuid-456";
    const sig = signPhotoPreviewToken(photoId, orderId);

    expect(verifyPhotoPreviewToken(photoId, orderId, sig)).toBe(true);
    expect(verifyPhotoPreviewToken(photoId, "wrong-order", sig)).toBe(false);
    expect(verifyPhotoPreviewToken(photoId, orderId, "invalid-sig")).toBe(false);
  });
});
