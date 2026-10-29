import { describe, it, expect, beforeEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { LocalDiskStorage } from "@/lib/services/photo-storage";
import { WhatsAppLinkProvider, ConsoleWhatsApp } from "@/lib/services/whatsapp";
import {
  validatePhotoMagicBytes,
  signPhotoPreviewToken,
  verifyPhotoPreviewToken,
  checkRateLimit,
  sanitizeText,
} from "@/lib/security";

describe("Security Utilities & Magic Byte Validation", () => {
  it("validates genuine JPEG, PNG, and HEIC magic bytes and rejects spoofed files", () => {
    // Valid JPEG: FF D8 FF E0 ...
    const jpegBuf = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    expect(validatePhotoMagicBytes(jpegBuf, "portrait.jpg")).toEqual({
      valid: true,
      detectedMime: "image/jpeg",
    });

    // Valid PNG: 89 50 4E 47 0D 0A 1A 0A ...
    const pngBuf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(validatePhotoMagicBytes(pngBuf, "cover.png")).toEqual({
      valid: true,
      detectedMime: "image/png",
    });

    // Valid HEIC: 00 00 00 18 'f' 't' 'y' 'p' 'h' 'e' 'i' 'c'
    const heicBuf = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    expect(validatePhotoMagicBytes(heicBuf, "iphone.heic")).toEqual({
      valid: true,
      detectedMime: "image/heic",
    });

    // Spoofed executable or text renamed to .jpg
    const fakeJpg = Buffer.from("MZ-this-is-not-an-image-at-all");
    const checkFake = validatePhotoMagicBytes(fakeJpg, "spoofed.jpg");
    expect(checkFake.valid).toBe(false);

    // Disallowed file extension
    const checkExt = validatePhotoMagicBytes(jpegBuf, "archive.zip");
    expect(checkExt.valid).toBe(false);
  });

  it("signs and verifies short-lived HMAC customer photo preview tokens", () => {
    const token = signPhotoPreviewToken("photo-123", "order-456", 300);
    expect(verifyPhotoPreviewToken("photo-123", "order-456", token)).toBe(true);
    expect(verifyPhotoPreviewToken("photo-999", "order-456", token)).toBe(false);
    expect(verifyPhotoPreviewToken("photo-123", "order-999", token)).toBe(false);

    // Expired token
    const expiredToken = signPhotoPreviewToken("photo-123", "order-456", -10);
    expect(verifyPhotoPreviewToken("photo-123", "order-456", expiredToken)).toBe(
      false
    );
  });

  it("enforces rate limits per key and window", () => {
    const key = `test-rate-${Date.now()}`;
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(true);
    const blocked = checkRateLimit(key, 2, 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("sanitizes control characters from user text", () => {
    expect(sanitizeText("  Hello\u0000 World\u0007  ")).toBe("Hello World");
  });
});

describe("LocalDiskStorage & WhatsApp Adapters", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hcm-test-uploads-"));
  });

  it("performs resumable chunked uploads, finalizes files, and lists photos", async () => {
    const storage = new LocalDiskStorage(tempDir);
    const folderId = await storage.createOrderFolder(
      "order-test-1",
      "Zuri Mwangi - HM-2026-0001"
    );
    expect(folderId).toContain("order-test-1");

    const session = await storage.createUploadSession("order-test-1", {
      fileName: "test-photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 12,
    });

    const chunk1 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const chunk2 = Buffer.from([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

    await storage.appendChunk(session.sessionId, chunk1, 0);
    expect(await storage.getSessionOffset(session.sessionId)).toBe(6);

    await storage.appendChunk(session.sessionId, chunk2, 6);
    expect(await storage.getSessionOffset(session.sessionId)).toBe(12);

    const finalized = await storage.finalizeUpload(
      "order-test-1",
      session.sessionId
    );
    expect(finalized.sizeBytes).toBe(12);
    expect(finalized.storageProvider).toBe("local");

    const list = await storage.listPhotos("order-test-1");
    expect(list).toHaveLength(1);

    const fetched = await storage.getFile(
      finalized.storageFileId,
      "order-test-1"
    );
    expect(fetched.buffer.length).toBe(12);
  });

  it("generates prefilled wa.me links with order reference", () => {
    const waLinkProvider = new WhatsAppLinkProvider();
    const customerLink = waLinkProvider.buildCustomerWaLink(
      "HM-2026-0002",
      "Zuri Mwangi"
    );
    expect(customerLink).toContain("https://wa.me/");
    expect(customerLink).toContain("HM-2026-0002");

    const mockWa = new ConsoleWhatsApp();
    expect(
      mockWa.buildAdminToCustomerWaLink(
        "+254712345678",
        "HM-2026-0002",
        "Zuri",
        "Amara"
      )
    ).toContain("https://wa.me/254712345678");
  });
});
