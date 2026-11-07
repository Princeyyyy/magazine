import { describe, it, expect } from "vitest";
import {
  splitTextAndEmojis,
  cleanXmlControlChars,
  cleanClipboardText,
} from "./editorial-text";

describe("editorial-text utilities", () => {
  it("splits text and emojis correctly", () => {
    const input = "became my wifey. 🥺❤️";
    const segments = splitTextAndEmojis(input);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ text: "became my wifey. ", isEmoji: false });
    expect(segments[1]!.isEmoji).toBe(true);
    expect(segments[1]!.text).toContain("🥺");
  });

  it("handles complex emoji chains, flags, and skin tones", () => {
    const input = "Trip to Paris ✈️🇫🇷 with friends 🥂🍾 and love 🥺❤️!";
    const segments = splitTextAndEmojis(input);

    const emojiSegments = segments.filter((s) => s.isEmoji);
    const textSegments = segments.filter((s) => !s.isEmoji);

    expect(emojiSegments.length).toBeGreaterThanOrEqual(3);
    expect(textSegments[0]!.text).toBe("Trip to Paris ");
    expect(textSegments[textSegments.length - 1]!.text).toBe("!");
  });

  it("strips harmful XML control characters like form feed \\x0C while keeping emojis and newlines", () => {
    const input = "trauma bonding over our past relationships 😂💀😭\x0C\x00\x08 and more \n new line";
    const cleaned = cleanXmlControlChars(input);

    expect(cleaned).not.toContain("\x0C");
    expect(cleaned).not.toContain("\x00");
    expect(cleaned).not.toContain("\x08");
    expect(cleaned).toContain("😂💀😭");
    expect(cleaned).toContain("\n new line");
  });

  it("normalizes clipboard text while preserving all emojis and paragraph structure", () => {
    const input = "Our level of weirdness is   genuinely unmatched. 😂  \n\nThe things we do together \x0C";
    const clipboard = cleanClipboardText(input);

    expect(clipboard).toBe("Our level of weirdness is genuinely unmatched. 😂\n\nThe things we do together");
  });

  it("returns empty array for empty or falsy strings", () => {
    expect(splitTextAndEmojis("")).toEqual([]);
    expect(cleanXmlControlChars("")).toBe("");
    expect(cleanClipboardText("")).toBe("");
  });
});
