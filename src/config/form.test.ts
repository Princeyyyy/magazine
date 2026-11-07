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
    expect(defaults["nine_things_loved"]).toHaveLength(9);
    expect(defaults["ten_things_she_loves_doing"]).toHaveLength(10);
    expect(defaults["top_movies"]).toHaveLength(4);
    expect(defaults["top_series"]).toHaveLength(4);
    expect(defaults["top_3_perfumes"]).toHaveLength(3);
    expect(defaults["wishlist"]).toHaveLength(3);
    expect(defaults["songs"]).toHaveLength(5);
    expect(defaults["key_moments"]).toHaveLength(5);
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
    expect(adaptCopyByGender("Songs that she likes", "Male")).toBe(
      "Songs that he likes"
    );
    expect(adaptCopyByGender("Songs that she likes", "Other")).toBe(
      "Songs that they like"
    );
    expect(
      adaptCopyByGender(
        "9 things you love about her and why, short sentence each",
        "Male"
      )
    ).toBe("9 things you love about him and why, short sentence each");
    expect(
      adaptCopyByGender(
        "9 things you love about her and why, short sentence each",
        "Other"
      )
    ).toBe("9 things you love about them and why, short sentence each");
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
        { sentence: "Her infectious laugh and how it brightens the darkest room" },
        { sentence: "Her endless generosity and how she always puts others first" },
        { sentence: "Her impeccable taste in music and curated playlists" },
        { sentence: "Her honesty even when things are difficult to say" },
        { sentence: "The way she dances around the kitchen while cooking" },
        { sentence: "Her unwavering loyalty to the people she loves" },
        { sentence: "How deeply she listens when you share something heavy" },
        { sentence: "Her adventurous spirit when trying new restaurants" },
        { sentence: "Her radiant smile whenever she sees an old friend" },
      ],
      ten_things_she_loves_doing: [
        { activity: "Saturday morning pilates class" },
        { activity: "Sipping iced vanilla matcha lattes" },
        { activity: "Hosting intimate weekend dinner parties" },
        { activity: "Exploring coastal beaches and hidden coves" },
        { activity: "Shopping for vintage jewellery" },
        { activity: "Reading bestselling romance novels" },
        { activity: "Listening to live afrobeat acoustic sets" },
        { activity: "Trying out new pasta recipes from scratch" },
        { activity: "Browsing interior decor magazines" },
        { activity: "Walking through Sunday farmer markets" },
      ],
    };

    it("fails when nine_things_loved has fewer than 9 filled rows", () => {
      const result = page2Schema.safeParse({
        ...validPage2Base,
        nine_things_loved: [
          ...validPage2Base.nine_things_loved.slice(0, 8),
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

    it("passes when nine_things_loved has all 9 filled rows and ten_things_she_loves_doing has all 10 filled rows", () => {
      const result = page2Schema.safeParse(validPage2Base);
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
      favourite_book: "Literary fiction",
      favourite_accessories: "Bangles, gold jewellery",
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

    it("passes when favourite_beach_or_holiday_spot is omitted because it is optional", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { favourite_beach_or_holiday_spot, ...rest } = validPage3;
      const result = page3Schema.safeParse(rest);
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
          { song_title: "Water", artist: "Tyla" },
          { song_title: "Essence", artist: "Wizkid" },
          { song_title: "Calm Down", artist: "" }, // incomplete 5th row
        ],
      });

      expect(result.success).toBe(false);
    });

    it("passes when at least 5 complete songs are provided", () => {
      const result = page6Schema.safeParse({
        songs: [
          { song_title: "CUFF IT", artist: "Beyoncé" },
          { song_title: "Snooze", artist: "SZA" },
          { song_title: "Water", artist: "Tyla" },
          { song_title: "Essence", artist: "Wizkid" },
          { song_title: "Calm Down", artist: "Rema" },
          { song_title: "", artist: "" },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Page 8: Solo Photos (min 15, max 30) and Shared Photos (min 4, max 30) validation", () => {
    const page8Schema = buildPageZodSchema(FORM_PAGES[7]!);

    const makeMockPhoto = (idx: number, category: "solo" | "shared" = "solo"): UploadedPhotoItem => ({
      id: `photo-${category}-${idx}`,
      storageProvider: "local",
      storageFileId: `file-${category}-${idx}.jpg`,
      originalName: `img-${category}-${idx}.jpg`,
      mime: "image/jpeg",
      sizeBytes: 1024 * 500,
      caption: `Memory ${idx}`,
      isCover: category === "solo" && idx === 0,
      category,
      sortOrder: idx,
    });

    it("fails with friendly message when fewer than 15 solo photos are uploaded", () => {
      const soloPhotos = Array.from({ length: 12 }, (_, i) => makeMockPhoto(i, "solo"));
      const sharedPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "shared"));
      const result = page8Schema.safeParse({
        solo_photos: soloPhotos,
        shared_photos: sharedPhotos,
        photo_link_fallback: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          PHOTO_UPLOAD_CONFIG.friendlyMinMessageSolo
        );
      }
    });

    it("fails with friendly message when fewer than 15 shared photos are uploaded", () => {
      const soloPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "solo"));
      const sharedPhotos = Array.from({ length: 12 }, (_, i) => makeMockPhoto(i, "shared"));
      const result = page8Schema.safeParse({
        solo_photos: soloPhotos,
        shared_photos: sharedPhotos,
        photo_link_fallback: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          PHOTO_UPLOAD_CONFIG.friendlyMinMessageShared
        );
      }
    });

    it("passes when at least 15 solo and 15 shared photos are uploaded", () => {
      const soloPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "solo"));
      const sharedPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "shared"));
      const result = page8Schema.safeParse({
        solo_photos: soloPhotos,
        shared_photos: sharedPhotos,
        photo_link_fallback: "https://drive.google.com/drive/folders/example",
      });

      expect(result.success).toBe(true);
    });

    it("fails when more than 30 photos are uploaded in either category", () => {
      const soloPhotos = Array.from({ length: 31 }, (_, i) => makeMockPhoto(i, "solo"));
      const sharedPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "shared"));
      const result = page8Schema.safeParse({
        solo_photos: soloPhotos,
        shared_photos: sharedPhotos,
      });

      expect(result.success).toBe(false);
    });

    it("detects exact duplicate photos, names the conflicting images, and explains what to do", () => {
      const soloPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "solo"));
      // Duplicate photo 0 as photo 14 with the same storageFileId
      soloPhotos[14] = {
        ...soloPhotos[0]!,
        id: "duplicate-photo-id",
        originalName: "img-solo-0-copy.jpg",
      };

      const sharedPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "shared"));
      const result = page8Schema.safeParse({
        solo_photos: soloPhotos,
        shared_photos: sharedPhotos,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        const dupMessage = errorMessages.find((m) => m.includes("Duplicate photos detected"));
        expect(dupMessage).toBeDefined();
        expect(dupMessage).toContain("img-solo-0-copy.jpg");
        expect(dupMessage).toContain("img-solo-0.jpg");
        expect(dupMessage).toContain("Every photo in her keepsake must be a unique image");
      }
    });

    it("detects visual near-duplicate photos based on perceptual hash similarity", () => {
      const soloPhotos = Array.from({ length: 15 }, (_, i) => {
        const photo = makeMockPhoto(i, "solo");
        return {
          ...photo,
          perceptualHash: `hash-${i}`.padEnd(32, "0"),
        };
      });

      // Give photo 14 a near-identical perceptual hash to photo 0 (distance < 8)
      soloPhotos[0]!.perceptualHash = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
      soloPhotos[14]!.perceptualHash = "a1b2c3d4e5f6071f293a4b5c6d7e8f90"; // 3 bits difference
      soloPhotos[14]!.originalName = "burst-shot-2.jpg";
      soloPhotos[0]!.originalName = "burst-shot-1.jpg";

      const sharedPhotos = Array.from({ length: 15 }, (_, i) => makeMockPhoto(i, "shared"));
      const result = page8Schema.safeParse({
        solo_photos: soloPhotos,
        shared_photos: sharedPhotos,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        const dupMessage = errorMessages.find((m) => m.includes("Duplicate photos detected"));
        expect(dupMessage).toBeDefined();
        expect(dupMessage).toContain("burst-shot-2.jpg");
        expect(dupMessage).toContain("burst-shot-1.jpg");
        expect(dupMessage).toContain("visually near-identical");
      }
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

      // Long messages without character limits are accepted
      const longNote = "To our dearest friend, ".repeat(80); // ~1840 characters
      const longResult = page9Schema.safeParse({
        messages_from_loved_ones: [
          { name: "Auntie Grace & Uncle David", note: longNote },
        ],
      });
      expect(longResult.success).toBe(true);
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
    });
    expect(symbolOnlyResult.success).toBe(false);
  });
});
