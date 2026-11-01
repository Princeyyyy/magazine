/**
 * Visual Image Fingerprinting & Perceptual Deduplication
 *
 * Combines:
 * 1. SHA-256 binary hash for exact file duplicates (detects renamed copies).
 * 2. 128-bit dual-gradient Perceptual Difference Hash (dHash) for visual duplicates
 *    (detects re-saved copies, WhatsApp/Instagram recompression, and burst shots).
 */

export interface ImageFingerprint {
  contentHash: string; // 64-char hex string (SHA-256)
  perceptualHash: string; // 32-char hex string (128-bit dual-gradient dHash)
}

export interface PhotoConflict {
  incomingName: string;
  conflictingName: string;
  conflictingIndex?: number;
  reason: "exact_file" | "visual_duplicate";
  similarityPercent: number;
}

/**
 * Calculates the Hamming distance (number of differing bits) between two
 * 128-bit hexadecimal hashes (32 characters each).
 */
export function computeHammingDistance(hashA: string, hashB: string): number {
  if (!hashA || !hashB || hashA.length !== hashB.length) {
    return 128; // Maximum difference if invalid
  }

  try {
    // Process in two 64-bit BigInt chunks to prevent overflow
    const half = Math.floor(hashA.length / 2);
    const a1 = BigInt("0x" + hashA.slice(0, half));
    const a2 = BigInt("0x" + hashA.slice(half));
    const b1 = BigInt("0x" + hashB.slice(0, half));
    const b2 = BigInt("0x" + hashB.slice(half));

    let xor1 = a1 ^ b1;
    let xor2 = a2 ^ b2;
    let dist = 0;

    while (xor1 > 0n) {
      dist += Number(xor1 & 1n);
      xor1 >>= 1n;
    }
    while (xor2 > 0n) {
      dist += Number(xor2 & 1n);
      xor2 >>= 1n;
    }

    return dist;
  } catch {
    return 128;
  }
}

/**
 * Returns true if two photos are visual duplicates.
 * Default threshold is 8 bits out of 128 (>= 93.75% bit match).
 */
export function isVisualDuplicate(
  hashA: string,
  hashB: string,
  maxDistance = 8
): boolean {
  if (!hashA || !hashB) return false;
  return computeHammingDistance(hashA, hashB) <= maxDistance;
}

/**
 * Computes SHA-256 content hash of a file or Blob.
 */
export async function computeContentHash(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for non-subtle crypto environments (e.g. Node tests)
  const nodeCrypto = await import("crypto");
  return nodeCrypto.createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");
}

/**
 * Computes a 128-bit dual-gradient dHash from a 9x9 grayscale grid (81 pixels).
 * - First 64 bits: horizontal gradient (row[x] > row[x+1])
 * - Next 64 bits: vertical gradient (col[y] > col[y+1])
 */
export function computeDHashFromGrayscale(pixels: number[]): string {
  if (pixels.length < 81) {
    throw new Error("Expected at least 81 pixels for 9x9 grid.");
  }

  let hBits = 0n;
  let vBits = 0n;

  // 1. Horizontal gradient (8 comparisons per row across 8 rows = 64 bits)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = pixels[row * 9 + col] ?? 0;
      const right = pixels[row * 9 + (col + 1)] ?? 0;
      if (left > right) {
        hBits |= 1n << BigInt(63 - (row * 8 + col));
      }
    }
  }

  // 2. Vertical gradient (8 comparisons per column across 8 columns = 64 bits)
  for (let col = 0; col < 8; col++) {
    for (let row = 0; row < 8; row++) {
      const top = pixels[row * 9 + col] ?? 0;
      const bottom = pixels[(row + 1) * 9 + col] ?? 0;
      if (top > bottom) {
        vBits |= 1n << BigInt(63 - (col * 8 + row));
      }
    }
  }

  const hHex = hBits.toString(16).padStart(16, "0");
  const vHex = vBits.toString(16).padStart(16, "0");
  return `${hHex}${vHex}`;
}

/**
 * Computes perceptual 128-bit dHash in browser environment using HTML5 Canvas.
 */
export async function computePerceptualHash(file: File | Blob): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    // If running in pure Node.js server test, fallback to SHA-derived hash
    const content = await computeContentHash(file);
    return content.slice(0, 32);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 9;
        canvas.height = 9;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve("0".repeat(32));
          return;
        }

        ctx.drawImage(img, 0, 0, 9, 9);
        const imgData = ctx.getImageData(0, 0, 9, 9).data;
        const grayscale: number[] = [];

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i] ?? 0;
          const g = imgData[i + 1] ?? 0;
          const b = imgData[i + 2] ?? 0;
          // Standard ITU-R BT.601 luma formula
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          grayscale.push(gray);
        }

        const hash = computeDHashFromGrayscale(grayscale);
        resolve(hash);
      } catch {
        resolve("0".repeat(32));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve("0".repeat(32));
    };

    img.src = objectUrl;
  });
}

/**
 * Full fingerprint calculation for an image file.
 */
export async function generateImageFingerprint(file: File | Blob): Promise<ImageFingerprint> {
  const [contentHash, perceptualHash] = await Promise.all([
    computeContentHash(file),
    computePerceptualHash(file),
  ]);
  return { contentHash, perceptualHash };
}
