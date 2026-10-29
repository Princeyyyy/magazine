import { describe, it, expect } from "vitest";
import {
  FORM_PAGES,
  PHOTO_UPLOAD_CONFIG,
  buildPageZodSchema,
  buildFullFormZodSchema,
  normalizePhoneToE164,
  getAllFields,
  getDefaultFormValues,
  adaptCopyByGender,
  autoCapitalizeFirst,
  isValidCalendarDate,
  isValidHttpUrl,
  type UploadedPhotoItem,
} from "./form";

describe("Form Configuration & Generated Zod Schemas", () => {
  it("defines all 9 pages in the exact required order", () => {
    expect(FORM_PAGES).toHaveLength(9);
    expect(FORM_PAGES.map((p) => p.title)).toEqual([
      "Order Details",
      "About Her",
      "Her Favourites",
      "Beauty",
      "Style and Wishlist",
      "Music and Movies",
      "Memories",
      "Photos",
      "Final Details",
    ]);
    expect(FORM_PAGES.map((p) => p.subtitle)).toEqual([
      "The cover and the basics",
      "Her feature story",
      "The favourites spread",
      "Her beauty edit",
      "Her fashion pages",
      "Her playlist page",
      "Memory lane",
      "Her photo spreads",
      "Her letters page",
    ]);
  });

  it("generates initial default values for every field in config", () => {
    const defaults = getDefaultFormValues();
    const allFields = getAllFields();

    for (const field of allFields) {
      expect(defaults).toHaveProperty(field.key);
    }

    // Check repeatable rows initial row counts (starts with minRows when minRows > 0, or 1 when optional)
    expect(defaults["nine_things_loved"]).toHaveLength(3);
    expect(defaults["ten_things_she_loves_doing"]).toHaveLength(3);
    expect(defaults["top_movies"]).toHaveLength(4);
    expect(defaults["top_series"]).toHaveLength(4);
    expect(defaults["top_3_perfumes"]).toHaveLength(1);
    expect(defaults["wishlist"]).toHaveLength(1);
    expect(defaults["songs"]).toHaveLength(3);
    expect(defaults["key_moments"]).toHaveLength(3);
    expect(defaults["messages_from_loved_ones"]).toHaveLength(1);
    expect(defaults["subject_gender"]).toBe("Female");
  });

  it("adapts pronouns and verbs for Male and Other gender selections and auto-capitalizes inputs", () => {
    expect(adaptCopyByGender("About Her", "Male")).toBe("About Him");
    expect(adaptCopyByGender("What does she mean to you?", "Male")).toBe(
      "What does he mean to you?"
    );
    expect(adaptCopyByGender("What does she mean to you?", "Other")).toBe(
      "What do they mean to you?"
    );
    expect(adaptCopyByGender("10 things she loves doing", "Other")).toBe(
      "10 things they love doing"
    );
    expect(autoCapitalizeFirst("sarah mwangi")).toBe("Sarah mwangi");
  });

  describe("Page 1: Order Details & Conditional Required Logic", () => {
    const page1Schema = buildPageZodSchema(FORM_PAGES[0]!);

    it("passes when required fields are valid and colour_theme is not 'Other'", () => {
      const result = page1Schema.safeParse({
        customer_name: "Amara Okafor",
        relationship: "Best friend",
        her_name: "Zuri Mwangi",
        her_nickname: "Zuzu",
        birthday_date: "2001-11-15",
        age_turning: "25",
        colour_theme: "Pink and girly",
        other_colour_theme: "",
        cover_headline: "Zuri: Turning 25 in Style",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age_turning).toBe(25);
      }
    });

    it("fails when colour_theme is 'Other' and other_colour_theme is empty", () => {
      const result = page1Schema.safeParse({
        customer_name: "Amara Okafor",
        relationship: "Best friend",
        her_name: "Zuri Mwangi",
        her_nickname: "Zuzu",
        birthday_date: "2001-11-15",
        age_turning: 25,
        colour_theme: "Other",
        other_colour_theme: "   ",
        cover_headline: "Turning 25 in Style",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join("."));
        expect(paths).toContain("other_colour_theme");
      }
    });

    it("passes when colour_theme is 'Other' and other_colour_theme is provided", () => {
      const result = page1Schema.safeParse({
        customer_name: "Amara Okafor",
        relationship: "Best friend",
        her_name: "Zuri Mwangi",
        her_nickname: "Zuzu",
        birthday_date: "2001-11-15",
        age_turning: 25,
        colour_theme: "Other",
        other_colour_theme: "Champagne gold and emerald",
        cover_headline: "Turning 25 in Style",
      });

      expect(result.success).toBe(true);
    });

    it("enforces age_turning whole number between 1 and 120", () => {
      const zeroResult = page1Schema.safeParse({
        customer_name: "Amara",
        relationship: "Sister",
        her_name: "Zuri",
        her_nickname: "Zuzu",
        birthday_date: "2001-11-15",
        age_turning: 0,
        colour_theme: "Black and white",
        cover_headline: "Turning 25",
      });
      expect(zeroResult.success).toBe(false);

      const floatResult = page1Schema.safeParse({
        customer_name: "Amara",
        relationship: "Sister",
        her_name: "Zuri",
        her_nickname: "Zuzu",
        birthday_date: "2001-11-15",
        age_turning: 25.5,
        colour_theme: "Black and white",
        cover_headline: "Turning 25",
      });
      expect(floatResult.success).toBe(false);
    });
  });

  describe("Page 2: RepeatableRows min/max and character limits", () => {
    const page2Schema = buildPageZodSchema(FORM_PAGES[1]!);

    const validPage2Base = {
      how_did_you_meet: "We met at university orientation week back in 2018.",
      how_long_known: "6 wonderful years",
      what_she_means_to_you:
        "She has been my anchor and my biggest cheerleader through every season of life.",
      three_words_describe_her: "Warm, brilliant, unstoppable",
      what_makes_her_different: "Her radiant laughter and unmatched empathy.",
      her_job_studies_passions: "Interior design and sustainable fashion.",
      nine_things_loved: [
        { sentence: "Her infectious laugh" },
        { sentence: "Her generosity" },
        { sentence: "Her impeccable taste in music" },
      ],
      ten_things_she_loves_doing: [
        { activity: "Saturday pilates class" },
        { activity: "Iced matcha lattes" },
        { activity: "Hosting weekend dinner parties" },
      ],
    };

    it("fails when nine_things_loved has fewer than 3 filled rows", () => {
      const result = page2Schema.safeParse({
        ...validPage2Base,
        nine_things_loved: [
          { sentence: "Her infectious laugh" },
          { sentence: "Her generosity" },
          { sentence: "" },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("nine_things_loved"))).toBe(
          true
        );
      }
    });

    it("passes when nine_things_loved and ten_things_she_loves_doing have at least 3 filled rows", () => {
      const result = page2Schema.safeParse({
        ...validPage2Base,
        nine_things_loved: [
          { sentence: "Her infectious laugh" },
          { sentence: "Her generosity" },
          { sentence: "Her impeccable taste in music" },
          { sentence: "" },
          { sentence: "" },
        ],
        ten_things_she_loves_doing: [
          { activity: "Saturday pilates class" },
          { activity: "Iced matcha lattes" },
          { activity: "Hosting weekend dinner parties" },
          { activity: "" },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("fails when what_she_means_to_you is shorter than 20 characters", () => {
      const result = page2Schema.safeParse({
        ...validPage2Base,
        what_she_means_to_you: "Too short",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Page 3: Her Favourites & 4 Movies / 4 Series Validation", () => {
    const page3Schema = buildPageZodSchema(FORM_PAGES[2]!);

    const validPage3 = {
      favourite_drink: "Iced vanilla matcha",
      favourite_sweet_treat: "Pistachio croissant",
      favourite_meal: "Prawn linguine",
      dream_destination: "Amalfi Coast",
      favourite_beach_or_holiday_spot: "Diani Beach",
      favourite_hobby: "Pottery and floral design",
      favourite_flowers: "Blush peonies",
      favourite_colours: "Rose and sage",
      favourite_book_or_genre: "Literary fiction",
      favourite_film_genre: "2000s rom-coms",
      top_movies: [
        { title: "The Devil Wears Prada" },
        { title: "How to Lose a Guy in 10 Days" },
        { title: "Legally Blonde" },
        { title: "13 Going on 30" },
      ],
      top_series: [
        { title: "Sex and the City" },
        { title: "Bridgerton" },
        { title: "Gossip Girl" },
        { title: "The Crown" },
      ],
    };

    it("passes when all favourite fields and exactly 4 movies and 4 series are filled", () => {
      const result = page3Schema.safeParse(validPage3);
      expect(result.success).toBe(true);
    });

    it("fails when top_movies has fewer than 4 filled rows", () => {
      const result = page3Schema.safeParse({
        ...validPage3,
        top_movies: [
          { title: "The Devil Wears Prada" },
          { title: "How to Lose a Guy in 10 Days" },
          { title: "Legally Blonde" },
          { title: "" },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.path.includes("top_movies"))
        ).toBe(true);
      }
    });

    it("fails when top_series has fewer than 4 filled rows", () => {
      const result = page3Schema.safeParse({
        ...validPage3,
        top_series: [
          { title: "Sex and the City" },
          { title: "" },
          { title: "" },
          { title: "" },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Page 6 & 7: Multi-subfield RepeatableRows validation", () => {
    const page6Schema = buildPageZodSchema(FORM_PAGES[5]!);

    it("flags partial rows where song_title is provided without artist", () => {
      const result = page6Schema.safeParse({
        songs: [
          { song_title: "CUFF IT", artist: "Beyoncé" },
          { song_title: "Snooze", artist: "SZA" },
          { song_title: "Water", artist: "" }, // incomplete 3rd row
        ],
      });

      expect(result.success).toBe(false);
    });

    it("passes when at least 3 complete songs are provided", () => {
      const result = page6Schema.safeParse({
        songs: [
          { song_title: "CUFF IT", artist: "Beyoncé" },
          { song_title: "Snooze", artist: "SZA" },
          { song_title: "Water", artist: "Tyla" },
          { song_title: "", artist: "" },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Page 8: Photo Upload minimum 15 and maximum 30 validation", () => {
    const page8Schema = buildPageZodSchema(FORM_PAGES[7]!);

    const makeMockPhoto = (idx: number): UploadedPhotoItem => ({
      id: `photo-${idx}`,
      storageProvider: "local",
      storageFileId: `file-${idx}.jpg`,
      originalName: `img-${idx}.jpg`,
      mime: "image/jpeg",
      sizeBytes: 1024 * 500,
      caption: `Memory ${idx}`,
      isCover: idx === 0,
      sortOrder: idx,
    });

    it("fails with friendly message when fewer than 15 photos are uploaded", () => {
      const photos = Array.from({ length: 12 }, (_, i) => makeMockPhoto(i));
      const result = page8Schema.safeParse({
        photos,
        photo_link_fallback: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          PHOTO_UPLOAD_CONFIG.friendlyMinMessage
        );
      }
    });

    it("passes when 15 to 30 photos are uploaded", () => {
      const photos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i));
      const result = page8Schema.safeParse({
        photos,
        photo_link_fallback: "https://drive.google.com/drive/folders/example",
      });

      expect(result.success).toBe(true);
    });

    it("fails when more than 30 photos are uploaded", () => {
      const photos = Array.from({ length: 31 }, (_, i) => makeMockPhoto(i));
      const result = page8Schema.safeParse({
        photos,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Phone Normalisation & Page 9 (Messages Optionality)", () => {
    it("normalises Kenyan local numbers (+254 default) and international numbers to E.164", () => {
      const keLocal = normalizePhoneToE164("0712 345 678", "KE");
      expect(keLocal).toEqual({ valid: true, e164: "+254712345678" });

      const keNoZero = normalizePhoneToE164("712345678", "KE");
      expect(keNoZero).toEqual({ valid: true, e164: "+254712345678" });

      const ukIntl = normalizePhoneToE164("+44 7911 123456", "KE");
      expect(ukIntl).toEqual({ valid: true, e164: "+447911123456" });

      const invalid = normalizePhoneToE164("123", "KE");
      expect(invalid.valid).toBe(false);
    });

    it("treats Page 9 messages_from_loved_ones as strictly optional", () => {
      const page9Schema = buildPageZodSchema(FORM_PAGES[8]!);

      // Empty is valid
      const emptyResult = page9Schema.safeParse({
        messages_from_loved_ones: [],
      });
      expect(emptyResult.success).toBe(true);

      // Populated with entries is valid
      const validResult = page9Schema.safeParse({
        messages_from_loved_ones: [
          { name: "Chloe", note: "So proud of the woman you are becoming!" },
        ],
      });
      expect(validResult.success).toBe(true);
    });
  });

  it("builds fullFormSchema that validates all pages together", () => {
    const schema = buildFullFormZodSchema();
    expect(schema).toBeDefined();
  });

  it("rejects impossible calendar dates, symbol-only text, and invalid URLs", () => {
    expect(isValidCalendarDate("2001-11-15")).toBe(true);
    expect(isValidCalendarDate("2024-02-29")).toBe(true); // leap year
    expect(isValidCalendarDate("2025-02-29")).toBe(false); // non-leap year
    expect(isValidCalendarDate("2001-13-01")).toBe(false);
    expect(isValidCalendarDate("1850-01-01")).toBe(false);

    expect(isValidHttpUrl("https://drive.google.com/drive/folders/123")).toBe(true);
    expect(isValidHttpUrl("not-a-url")).toBe(false);

    const page1Schema = buildPageZodSchema(FORM_PAGES[0]!);
    const symbolOnlyResult = page1Schema.safeParse({
      customer_name: "---",
      relationship: "Sister",
      her_name: "Zuri Mwangi",
      her_nickname: "Zuzu",
      birthday_date: "2001-11-15",
      age_turning: 25,
      colour_theme: "Pink and girly",
      cover_headline: "Turning 25",
    });
    expect(symbolOnlyResult.success).toBe(false);
  });
});
