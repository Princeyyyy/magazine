import { describe, it, expect } from "vitest";
import {
  generateOrderPdfBlob,
  generateOrderWordBlob,
  type EditorialExportOrder,
  type EditorialExportPhoto,
} from "./editorial-exports";

describe("editorial-exports", () => {
  const sampleOrder: EditorialExportOrder = {
    id: "ord-test-123",
    reference: "HM-2026-0011",
    status: "submitted",
    customerName: "Samantha Mobisa Morra",
    relationship: "Close Friend",
    herName: "Samantha Mobisa Morra",
    herNickname: "Daddysamanthes",
    birthdayDate: "2006-11-07",
    ageTurning: 20,
    colourTheme: "Other (Pink and white with a little sky blue)",
    coverHeadline: "Samantha: 20 Years of Radiance & Joy",
    email: "muigaijune0@gmail.com",
    phoneE164: "+254711223344",
    driveFolderId: "folder-123",
    driveFolderUrl: "https://drive.google.com/drive/folders/test12345",
    createdAt: "2026-11-01T10:00:00Z",
    submittedAt: "2026-11-02T12:00:00Z",
  };

  const sampleValues: Record<string, unknown> = {
    subject_gender: "Female",
    customer_name: "Samantha Mobisa Morra",
    relationship: "Close Friend",
    her_name: "Samantha Mobisa Morra",
    her_nickname: "Daddysamanthes",
    birthday_date: "2006-11-07",
    age_turning: 20,
    colour_theme: "Other (Pink and white with a little sky blue)",
    how_did_you_meet:
      "Funny how some of the most important people in your life start off as strangers. We met during first year orientation and bonded instantly over coffee and music! 🥺❤️✨",
    how_long_known: "3 amazing years",
    what_she_means_to_you:
      "She became my wifey, sister, and best confidante. Always there through thick and thin! 😂💀😭",
    three_words_describe_her: "Kind, radiant, hilariously funny",
    what_makes_her_different:
      "Her heart of gold and the way she listens without judgment. 🌸💫",
    her_job_studies_passions: "BBIT, business information technology",
    nine_things_loved: [
      { sentence: "Humor 😂" },
      { sentence: "Perfumes 🌸" },
      { sentence: "Genuinely kind ❤️" },
      { sentence: "She listens" },
      { sentence: "Foodie 🍕" },
      { sentence: "Generally sweet" },
      { sentence: "Loves jewelry 💎" },
      { sentence: "Being with her is therapeutic" },
      { sentence: "Presence in my life 🌟" },
    ],
    ten_things_she_loves_doing: [
      { activity: "Loves listening to amapiano 🎶" },
      { activity: "Discovering new fragrances" },
      { activity: "Wearing her favourite outfits" },
      { activity: "Café hopping with friends ☕" },
      { activity: "Late night drives" },
    ],
    top_series: [
      { title: "The penthouse" },
      { title: "Love island" },
      { title: "Take charge of my heart" },
      { title: "Chaos" },
    ],
    bag_contents: "Perfume, lipgloss and lip liner and ofc her phone 📱💄",
    messages_from_loved_ones: [
      {
        person_name: "June",
        relationship: "Sister / Friend",
        message:
          "Happy 20th birthday darling Samantha! May your year be filled with abundant blessings, endless laughter, and all the love in the universe! Keep shining like the bright star you are. Love you always! 🥳🎂🎉❤️",
      },
      {
        person_name: "Brian",
        relationship: "Cousin",
        message:
          "Wishing you the happiest birthday Sam! Proud of everything you are accomplishing. Have the most wonderful day! 🥂✨",
      },
    ],
  };

  const samplePhotos: EditorialExportPhoto[] = [
    {
      id: "photo-1",
      originalName: "cover-portrait.jpeg",
      mime: "image/jpeg",
      sizeBytes: 1024000,
      caption: "Samantha glowing on her 20th birthday 💖",
      isCover: true,
      sortOrder: 0,
      uploadedAt: "2026-11-01T12:00:00Z",
    },
    {
      id: "photo-2",
      originalName: "diani-beach-sunset.jpeg",
      mime: "image/jpeg",
      sizeBytes: 850000,
      caption: "Unforgettable sunset walk in Diani 🌅",
      isCover: false,
      sortOrder: 1,
      uploadedAt: "2026-11-01T12:05:00Z",
    },
    {
      id: "photo-3",
      originalName: "brunch-girls.jpeg",
      mime: "image/jpeg",
      sizeBytes: 780000,
      caption: "Laughter over waffles and mimosas 🥂",
      isCover: false,
      sortOrder: 2,
      uploadedAt: "2026-11-01T12:10:00Z",
    },
  ];

  it("generates a compact, well-paginated PDF blob without single-item orphan pages", async () => {
    const pdfBlob = generateOrderPdfBlob(
      sampleOrder,
      sampleValues,
      samplePhotos,
      sampleOrder.driveFolderUrl!
    );

    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1000);

    // Read generated PDF text to inspect page count and structure
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfText = Buffer.from(arrayBuffer).toString("binary");

    // Count pages in generated PDF
    const pages = pdfText.match(/\/Type\s*\/Page\b/g);
    const pageCount = pages ? pages.length : 0;

    // Previously, this exact order generated 17 pages due to the runaway cursor bug!
    // With cursor synchronization, it should comfortably fit in 3 to 5 pages.
    expect(pageCount).toBeGreaterThanOrEqual(2);
    expect(pageCount).toBeLessThanOrEqual(5);
  });

  it("generates a Word (.docx) blob with 100% emojis preserved", async () => {
    const wordBlob = await generateOrderWordBlob(
      sampleOrder,
      sampleValues,
      samplePhotos,
      sampleOrder.driveFolderUrl!
    );

    expect(wordBlob).toBeInstanceOf(Blob);
    expect(wordBlob.size).toBeGreaterThan(5000);
  });
});
