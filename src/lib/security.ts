import crypto from "crypto";
import { env } from "@/env";
import { PHOTO_UPLOAD_CONFIG } from "@/config/form";

/**
 * Generates a short-lived HMAC-SHA256 signature for customer photo preview access
 * so customers can only view photos belonging to their order draft.
 */
export function signPhotoPreviewToken(
  photoId: string,
  orderId: string,
  expiresInSeconds = 3600 * 24 // 24 hours for draft session
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${photoId}:${orderId}:${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(payload)
    .digest("hex");
  return `${expiresAt}.${hmac}`;
}

export function verifyPhotoPreviewToken(
  photoId: string,
  orderId: string,
  token: string
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiresAtStr, signature] = parts;
  if (!expiresAtStr || !signature) return false;

  const expiresAt = Number(expiresAtStr);
  if (Number.isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
    return false;
  }

  const payload = `${photoId}:${orderId}:${expiresAt}`;
  const expected = crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Validates file extension and magic bytes for .jpg, .jpeg, .png, .heic, .heif
 */
export function validatePhotoMagicBytes(
  buffer: Buffer,
  fileName: string
): { valid: true; detectedMime: string } | { valid: false; error: string } {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  const allowedExts: readonly string[] = PHOTO_UPLOAD_CONFIG.acceptedExtensions;

  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension (${ext}). Accepted formats: JPG, PNG, HEIC, HEIF.`,
    };
  }

  if (buffer.length < 12) {
    return { valid: false, error: "File is empty or corrupted." };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // 3. HEIC / HEIF: ISO Base Media File Format (ftyp box at offset 4..8)
  const boxType = buffer.subarray(4, 8).toString("ascii");
  if (boxType === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    const heicBrands = [
      "heic",
      "heix",
      "hevc",
      "hevx",
      "heim",
      "heis",
      "hevm",
      "hevs",
      "mif1",
      "msf1",
    ];
    if (heicBrands.includes(brand)) {
      return {
        valid: true,
        detectedMime: ext === ".heif" ? "image/heif" : "image/heic",
      };
    }
  }

  return {
    valid: false,
    error: "File content does not match a valid JPG, PNG, or HEIC/HEIF image.",
  };
}

/**
 * Simple in-memory rate limiter for draft creation, upload session creation, and submissions.
 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = rateBuckets.get(key);

  if (!existing || now > existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Sanitizes text input to strip control characters while preserving normal punctuation and newlines.
 */
export function sanitizeText(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}
