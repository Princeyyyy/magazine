/**
 * Editorial Text & Emoji Utilities for Custom Magazine
 *
 * Ensures all customer content (including Unicode emojis, punctuation,
 * quotes, and formatting) is preserved with 100% fidelity across:
 * - Word (.docx) exports
 * - PDF print generation
 * - Admin clipboard copying
 */

// Regex matching all modern Unicode emojis, pictographs, flags,
// skin tone modifiers, zero-width joiners (ZWJ), variation selectors,
// keycaps, transport symbols, and dingbats.
export const EMOJI_REGEX =
  /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\u200D|\u20E3|\uD83C[\uDFFB-\uDFFF]|\p{Extended_Pictographic})*|[\uFE0E\uFE0F\u20E3]|\uD83C[\uDDE6-\uDDFF]{2}|[\u2600-\u26FF]|[\u2700-\u27BF])/gu;

export interface TextSegment {
  text: string;
  isEmoji: boolean;
}

/**
 * Splits a string into regular prose text segments and emoji segments.
 * Used by Word (.docx) export to assign font fallback ('Segoe UI Emoji' / 'Apple Color Emoji')
 * to emojis while keeping 'Georgia' for prose text.
 */
export function splitTextAndEmojis(input: string): TextSegment[] {
  if (!input) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(EMOJI_REGEX.source, "gu");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, match.index),
        isEmoji: false,
      });
    }
    segments.push({
      text: match[0],
      isEmoji: true,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({
      text: input.slice(lastIndex),
      isEmoji: false,
    });
  }

  return segments;
}

/**
 * Cleans illegal XML 1.0 control characters that can corrupt Word (.docx)
 * and PDF files, while PRESERVING all emojis, Unicode characters,
 * newlines (\n), tabs (\t), and carriage returns (\r).
 */
export function cleanXmlControlChars(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";
  // XML 1.0 valid characters: 0x09 (tab), 0x0A (LF), 0x0D (CR), and >= 0x20
  // Remove 0x00-0x08, 0x0B, 0x0C (form feed), 0x0E-0x1F, 0x7F-0x9F, BOM \uFEFF
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFEFF]/g, "");
}

/**
 * Cleans text for clipboard copying in Admin panels:
 * - Keeps ALL emojis intact (100% preservation)
 * - Removes harmful control characters (like form feeds \x0C or nulls)
 * - Normalizes multiple spaces into a single space while keeping paragraph line breaks
 */
export function cleanClipboardText(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";
  const cleaned = cleanXmlControlChars(input);
  return cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
