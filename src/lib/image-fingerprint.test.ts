import { describe, it, expect } from "vitest";
import {
  computeHammingDistance,
  isVisualDuplicate,
  computeDHashFromGrayscale,
  computeContentHash,
} from "./image-fingerprint";

describe("Image Fingerprinting & Deduplication", () => {
  it("computes Hamming distance correctly between two 128-bit hex strings", () => {
    const hashA = "ffffffffffffffff0000000000000000";
    const hashB = "ffffffffffffffff0000000000000000";
    expect(computeHammingDistance(hashA, hashB)).toBe(0);

    // 1 bit flipped in first chunk
    const hashC = "fffffffffffffffe0000000000000000";
    expect(computeHammingDistance(hashA, hashC)).toBe(1);

    // Completely inverted
    const hashD = "0000000000000000ffffffffffffffff";
    expect(computeHammingDistance(hashA, hashD)).toBe(128);
  });

  it("identifies visual duplicates when Hamming distance is 8 or fewer bits", () => {
    const original = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    // Flip 3 bits: 0xa1b2c3d4e5f60718 vs 0xa1b2c3d4e5f6071f (3 bits difference: 8 = 1000, f = 1111)
    const slightlyAltered = "a1b2c3d4e5f6071f293a4b5c6d7e8f90";
    expect(computeHammingDistance(original, slightlyAltered)).toBe(3);
    expect(isVisualDuplicate(original, slightlyAltered)).toBe(true);

    // Completely different hash
    const completelyDifferent = "1234567890abcdef1234567890abcdef";
    expect(isVisualDuplicate(original, completelyDifferent)).toBe(false);
  });

  it("generates a 32-character hex dHash from an 81-pixel grayscale matrix", () => {
    // Generate simple gradient pixels
    const pixels = Array.from({ length: 81 }, (_, i) => i * 3);
    const hash = computeDHashFromGrayscale(pixels);
    expect(hash).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(hash)).toBe(true);
  });

  it("computes SHA-256 content hash of binary blob", async () => {
    const blob = new Blob(["test image content 12345"], { type: "image/jpeg" });
    const hash = await computeContentHash(blob);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });
});
