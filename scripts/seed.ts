import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import crypto from "crypto";
import { Readable } from "stream";
import sharp from "sharp";
import { google } from "googleapis";
import { type OrderStatus } from "../src/db/schema";

const isDriveLive = Boolean(
  process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
    process.env.DRIVE_ROOT_FOLDER_ID
);

function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  });
  return google.drive({ version: "v3", auth: oauth2Client });
}

async function generateEditorialSampleJpeg(
  starName: string,
  caption: string,
  index: number,
  bgHex: string,
  accentHex: string
): Promise<Buffer> {
  const safeStar = starName.replace(/[<>&"']/g, "");
  const safeCaption = caption.replace(/[<>&"']/g, "").slice(0, 52);
  const svg = `
    <svg width="900" height="1200" viewBox="0 0 900 1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="1200" fill="${bgHex}" />
      <rect x="48" y="48" width="804" height="1104" fill="none" stroke="${accentHex}" stroke-width="3" opacity="0.55" />
      <rect x="68" y="68" width="764" height="1064" fill="none" stroke="${accentHex}" stroke-width="1" opacity="0.3" />
      <circle cx="450" cy="470" r="190" fill="${accentHex}" opacity="0.16" />
      <text x="450" y="155" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="6" fill="${accentHex}">
        CUSTOM MAGAZINE ARCHIVE
      </text>
      <text x="450" y="460" text-anchor="middle" font-family="Georgia, serif" font-size="68" font-weight="bold" fill="#FFFFFF">
        ${safeStar}
      </text>
      <text x="450" y="535" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="30" fill="${accentHex}">
        Editorial Portrait ${String(index + 1).padStart(2, "0")}${index === 0 ? " (Cover Selection)" : ""}
      </text>
      <text x="450" y="1020" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#F8EEF3">
        "${safeCaption}"
      </text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

async function clearPreviousDriveSubfolders() {
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!isDriveLive || !rootId) return;
  const drive = getDriveClient();
  const listRes = await drive.files.list({
    q: `'${rootId}' in parents and trashed = false`,
    fields: "files(id, name)",
    pageSize: 100,
  });
  const existing = listRes.data.files ?? [];
  if (existing.length > 0) {
    console.log(
      `[db:seed] Removing ${existing.length} previous folder(s)/file(s) from Google Drive root folder...`
    );
    for (const f of existing) {
      if (f.id) {
        await drive.files.delete({ fileId: f.id }).catch(() => {});
      }
    }
  }
}

async function createDriveOrderFolder(folderLabel: string): Promise<{
  folderId: string;
  folderUrl: string;
}> {
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID;
  if (isDriveLive && rootId) {
    const drive = getDriveClient();
    const res = await drive.files.create({
      requestBody: {
        name: folderLabel,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootId],
      },
      fields: "id",
    });
    const folderId = res.data.id ?? "";
    return {
      folderId,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
    };
  }
  const { getLocalDiskStorage } = await import("../src/lib/services/photo-storage");
  const local = getLocalDiskStorage();
  const folderId = await local.createOrderFolder(folderLabel, folderLabel);
  return {
    folderId,
    folderUrl: "",
  };
}

async function uploadSamplePhoto(
  orderId: string,
  driveFolderId: string,
  fileName: string,
  buffer: Buffer
): Promise<{
  storageProvider: "drive" | "local";
  storageFileId: string;
  sizeBytes: number;
}> {
  if (isDriveLive && driveFolderId && !driveFolderId.startsWith("local-folder:")) {
    const drive = getDriveClient();
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "image/jpeg",
        parents: [driveFolderId],
        appProperties: { orderId },
      },
      media: {
        mimeType: "image/jpeg",
        body: Readable.from(buffer),
      },
      fields: "id,size",
    });
    return {
      storageProvider: "drive",
      storageFileId: res.data.id ?? fileName,
      sizeBytes: Number(res.data.size ?? buffer.length),
    };
  }

  const { getLocalDiskStorage } = await import("../src/lib/services/photo-storage");
  const local = getLocalDiskStorage();
  const session = await local.createUploadSession(orderId, {
    fileName,
    mimeType: "image/jpeg",
    sizeBytes: buffer.length,
  });
  await local.appendChunk(session.sessionId, buffer, 0);
  const finalized = await local.finalizeUpload(orderId, session.sessionId);
  return {
    storageProvider: "local",
    storageFileId: finalized.storageFileId,
    sizeBytes: finalized.sizeBytes,
  };
}

interface SeedOrderSpec {
  reference: string;
  status: OrderStatus;
  customerName: string;
  relationship: string;
  herName: string;
  herNickname: string;
  gender: "Female" | "Male" | "Other";
  birthdayDate: string;
  ageTurning: number;
  colourTheme: string;
  coverHeadline: string;
  email: string;
  phoneE164: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  palette: { bg: string; accent: string };
  photoCaptions: string[];
  transitions: { from: OrderStatus | null; to: OrderStatus; by: string; at: Date }[];
  answers: Record<string, unknown>;
}

async function seed() {
  const { db, ensureDbReady } = await import("../src/db");
  const { orders, answers, photos, statusHistory, devOutbox } = await import(
    "../src/db/schema"
  );

  console.log("[db:seed] Ensuring database schema is ready...");
  await ensureDbReady();

  console.log("[db:seed] Deleting all existing database entries...");
  await db.delete(statusHistory);
  await db.delete(photos);
  await db.delete(answers);
  await db.delete(devOutbox);
  await db.delete(orders);

  await clearPreviousDriveSubfolders();

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000);

  const seedSpecs: SeedOrderSpec[] = [
    // 1. Most Recently Updated — In Design (4 Photos in Google Drive)
    {
      reference: "HM-2026-0005",
      status: "in_design",
      customerName: "Amara Okafor",
      relationship: "Best friend",
      herName: "Zuri Mwangi",
      herNickname: "Zuzu",
      gender: "Female",
      birthdayDate: "2001-11-14",
      ageTurning: 25,
      colourTheme: "Pink and girly",
      coverHeadline: "Zuri: Turning 25 in Full Bloom",
      email: "amara.okafor@example.com",
      phoneE164: "+254722998877",
      createdAt: hoursAgo(48),
      submittedAt: hoursAgo(36),
      updatedAt: hoursAgo(1),
      palette: { bg: "#3B1827", accent: "#E8A6BE" },
      photoCaptions: [
        "Golden hour in Diani Beach, December 2025 (Cover Choice)",
        "Sunday brunch at Cultiva Nairobi with the girls",
        "Sunset dhow cruise in Stone Town, Zanzibar",
        "All-pink 25th birthday dinner toast",
      ],
      transitions: [
        { from: "draft", to: "submitted", by: "customer_submission", at: hoursAgo(36) },
        { from: "submitted", to: "in_progress", by: "princemumo80@gmail.com", at: hoursAgo(18) },
        { from: "in_progress", to: "in_design", by: "princemumo80@gmail.com", at: hoursAgo(1) },
      ],
      answers: {
        subject_gender: "Female",
        customer_name: "Amara Okafor",
        relationship: "Best friend",
        her_name: "Zuri Mwangi",
        her_nickname: "Zuzu",
        birthday_date: "2001-11-14",
        age_turning: 25,
        colour_theme: "Pink and girly",
        how_did_you_meet:
          "We sat next to each other during our first week at Strathmore University and bonded over iced caramel lattes.",
        how_long_known: "7 unforgettable years",
        what_she_means_to_you:
          "Zuri is the heart of our entire friend group. She celebrates everyone's wins as if they were her own and brings glamour and warmth to every ordinary Tuesday.",
        three_words_describe_her: "Radiant, fiercely loyal, magnetic",
        what_makes_her_different:
          "She remembers every small detail someone mentions in passing and turns it into the most thoughtful surprise months later.",
        her_job_studies_passions:
          "Brand strategist by day, interior design enthusiast and host of the best dinner parties in Kilimani by night.",
        nine_things_loved: [
          { sentence: "Her infectious laugh that fills an entire restaurant" },
          { sentence: "How she sends voice notes that sound like mini podcasts" },
          { sentence: "Her unmatched eye for colour and table styling" },
          { sentence: "She never lets a friend walk to their car alone" },
          { sentence: "Her encyclopedic knowledge of 2000s R&B" },
        ],
        ten_things_she_loves_doing: [
          { activity: "Saturday morning reformer pilates" },
          { activity: "Trying every new brunch spot in Nairobi" },
          { activity: "Curating Pinterest moodboards for coastal trips" },
        ],
        favourite_drink: "Iced strawberry matcha latte",
        favourite_sweet_treat: "Warm pistachio croissant",
        favourite_meal: "Prawn linguine with lemon butter",
        dream_destination: "Amalfi Coast, Italy",
        favourite_beach_or_holiday_spot: "Diani Beach",
        favourite_hobby: "Floral arranging and hosting",
        favourite_flowers: "Blush pink peonies and white ranunculus",
        favourite_colours: "Rosewater pink, champagne, espresso",
        favourite_book: "Everything I Know About Love by Dolly Alderton",
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
        top_3_perfumes: [
          {
            perfume_name: "Parfums de Marly Delina Exclusif",
            why: "Her ultimate signature scent — soft rose, vanilla, and pure luxury",
          },
          {
            perfume_name: "YSL Libre Intense",
            why: "Her power fragrance for big presentations and evening events",
          },
          {
            perfume_name: "Jo Malone Peony & Blush Suede",
            why: "Her everyday Sunday brunch scent",
          },
        ],
        signature_lip_combo:
          "MAC Chestnut lip liner, Charlotte Tilbury Pillow Talk Medium, and Fenty gloss",
        skincare_or_hair_favourites:
          "Summer Fridays Jet Lag Mask, Laneige Lip Sleeping Mask, Kerastase Elixir Ultime hair oil",
        favourite_beauty_products:
          "Rare Beauty Soft Pinch Blush in Happy, Dior Backstage Glow Face Palette, Laura Mercier setting powder",
        favourite_outfits:
          "Silk midi dresses with strappy heels, or a tailored cream linen set with gold hoops",
        her_style_in_her_own_words:
          "Soft feminine glamour meets effortless coastal tailoring.",
        favourite_brands: "House of CB, Zara Atelier, Cult Gaia, Polène, Jacquemus",
        goto_outfit_essential: "Chunky gold dome earrings and cat-eye sunglasses",
        what_she_carries_in_bag:
          "Fenty lip gloss, mini Delina atomizer, gold claw clip, Cartier Tank watch, digital camera",
        wishlist: [
          { item: "Sculpted leather handbag", brand_colour_model: "Polène Numéro Neuf Mini in Chalk" },
          { item: "Slingback heels", brand_colour_model: "YSL Lee 60 in Patent Burgundy" },
          { item: "Silk pyjama set", brand_colour_model: "Sleeper Party Pajama Set in Soft Pink" },
        ],
        songs: [
          { song_title: "Love on Top", artist: "Beyoncé" },
          { song_title: "Snooze", artist: "SZA" },
          { song_title: "Water", artist: "Tyla" },
          { song_title: "Golden", artist: "Jill Scott" },
          { song_title: "Adorn", artist: "Miguel" },
        ],
        key_moments: [
          { what_happened: "The day we met in university orientation and talked for four hours straight." },
          { what_happened: "Our first girls' coastal trip where we watched the sunrise on Diani beach." },
          { what_happened: "Sunset dhow cruise in Zanzibar celebrating her promotion!" },
        ],
        funniest_or_most_iconic_moment:
          "When she accidentally ordered a family-sized seafood tower for just the two of us in Mombasa and insisted we pose with it like a magazine shoot.",
        inside_jokes_and_catchphrases:
          "'Wait, let me set the lighting first', 'We are only staying for one hour'",
        hopes_and_wishes:
          "May your 25th chapter bring boundless joy, bold adventures, and every dream on your vision board.",
        messages_from_loved_ones: [
          {
            name: "Wanjiku (Older Sister)",
            note: "Watching you blossom into the most graceful, driven woman has been the greatest privilege. Shine on, Zuzu!",
          },
          {
            name: "Tunde (Uni Bestie)",
            note: "To the queen of aesthetics and the truest friend — here is to decades more laughter!",
          },
        ],
        email: "amara.okafor@example.com",
        phone_e164: "+254722998877",
        permission_consent: true,
      },
    },

    // 2. Second Most Recently Updated — Submitted (3 Photos in Google Drive)
    {
      reference: "HM-2026-0004",
      status: "submitted",
      customerName: "Njeri Kamau",
      relationship: "Sister",
      herName: "Wanjiku Kamau",
      herNickname: "Shiku",
      gender: "Female",
      birthdayDate: "1996-11-02",
      ageTurning: 30,
      colourTheme: "Neutral and minimal",
      coverHeadline: "Thirty, Thriving & Unstoppable",
      email: "njeri.kamau@example.com",
      phoneE164: "+254733445566",
      createdAt: hoursAgo(60),
      submittedAt: hoursAgo(5),
      updatedAt: hoursAgo(5),
      palette: { bg: "#2B2421", accent: "#D8C3B5" },
      photoCaptions: [
        "Architectural portrait in Karen (Cover Selection)",
        "Morning espresso in Milan",
        "Celebrating her firm's design award",
      ],
      transitions: [
        { from: "draft", to: "submitted", by: "customer_submission", at: hoursAgo(5) },
      ],
      answers: {
        subject_gender: "Female",
        customer_name: "Njeri Kamau",
        relationship: "Sister",
        her_name: "Wanjiku Kamau",
        her_nickname: "Shiku",
        birthday_date: "1996-11-02",
        age_turning: 30,
        colour_theme: "Neutral and minimal",
        how_did_you_meet: "Sisters from day one — my biggest role model and confidante.",
        how_long_known: "All 30 years of her life",
        what_she_means_to_you:
          "Shiku is the pillar of our family. She combines quiet elegance with razor-sharp ambition and makes everyone around her feel deeply cared for.",
        three_words_describe_her: "Poised, brilliant, grounded",
        her_job_studies_passions:
          "Lead architect specializing in sustainable East African hospitality spaces.",
        nine_things_loved: [
          { sentence: "Her calm composure even under tight project deadlines" },
          { sentence: "Her Sunday roast dinners that bring the whole family together" },
          { sentence: "Her minimalist wardrobe that always looks effortlessly chic" },
        ],
        favourite_drink: "Single-origin Ethiopian pour-over coffee",
        favourite_meal: "Grilled sea bass with herb risotto",
        dream_destination: "Kyoto, Japan",
        favourite_colours: "Warm travertine, oat milk, charcoal, brushed bronze",
        top_3_perfumes: [
          { perfume_name: "Le Labo Santal 33", why: "Woody, architectural, and unmistakably her" },
          { perfume_name: "Byredo Bal d'Afrique", why: "Warm, radiant, and nostalgic" },
        ],
        favourite_outfits: "Tailored wide-leg linen trousers, crisp white silk shirts, and suede loafers",
        her_style_in_her_own_words: "Quiet luxury with clean architectural lines.",
        songs: [
          { song_title: "Essence", artist: "Wizkid ft. Tems" },
          { song_title: "Best Part", artist: "Daniel Caesar & H.E.R." },
          { song_title: " Smooth Operator", artist: "Sade" },
        ],
        key_moments: [
          { what_happened: "Passed her professional architectural registration on the first attempt." },
          { what_happened: "Our sisters trip to Salone del Mobile in Milan." },
        ],
        hopes_and_wishes:
          "Welcome to your thirties, Shiku! May this decade bring your own studio, serene travels, and endless joy.",
        email: "njeri.kamau@example.com",
        phone_e164: "+254733445566",
        permission_consent: true,
      },
    },

    // 3. Third Most Recently Updated — In Progress (Male Subject, 3 Photos in Google Drive)
    {
      reference: "HM-2026-0003",
      status: "in_progress",
      customerName: "Efua Mensah",
      relationship: "Wife",
      herName: "Kwame Mensah",
      herNickname: "Kwa",
      gender: "Male",
      birthdayDate: "1994-10-30",
      ageTurning: 32,
      colourTheme: "Black and white",
      coverHeadline: "The Gentleman's Issue: Kwame at 32",
      email: "efua.mensah@example.com",
      phoneE164: "+254744112233",
      createdAt: hoursAgo(96),
      submittedAt: hoursAgo(40),
      updatedAt: hoursAgo(12),
      palette: { bg: "#18181B", accent: "#D4AF37" },
      photoCaptions: [
        "Black-tie evening portrait in Accra (Cover Selection)",
        "Weekend drive in the classic Land Cruiser",
        "Father-and-daughter Sunday morning pancakes",
      ],
      transitions: [
        { from: "draft", to: "submitted", by: "customer_submission", at: hoursAgo(40) },
        { from: "submitted", to: "in_progress", by: "princemumo80@gmail.com", at: hoursAgo(12) },
      ],
      answers: {
        subject_gender: "Male",
        customer_name: "Efua Mensah",
        relationship: "Wife",
        her_name: "Kwame Mensah",
        her_nickname: "Kwa",
        birthday_date: "1994-10-30",
        age_turning: 32,
        colour_theme: "Black and white",
        how_did_you_meet: "At a contemporary art gallery opening in Westlands six years ago.",
        how_long_known: "6 years together, 3 years married",
        what_she_means_to_you:
          "Kwame is my anchor, the most intentional husband and father, and the man whose wisdom and humour make our home the happiest place on earth.",
        three_words_describe_her: "Steadfast, charismatic, visionary",
        her_job_studies_passions:
          "Fintech product director, vinyl jazz collector, and marathon runner.",
        nine_things_loved: [
          { sentence: "How he brews my coffee every single morning before I wake up" },
          { sentence: "His deep, unmistakable laugh" },
          { sentence: "His patience and storytelling at bedtime" },
        ],
        favourite_drink: "Negroni Sbagliato or aged single-malt Scotch",
        favourite_meal: "Chargrilled ribeye steak with truffle mash",
        dream_destination: "Tokyo & Hokkaido, Japan",
        top_3_perfumes: [
          { perfume_name: "Creed Aventus", why: "His wedding day and signature celebration scent" },
          { perfume_name: "Tom Ford Oud Wood", why: "Warm, timeless evening classic" },
        ],
        favourite_outfits: "Bespoke double-breasted navy suits or monochrome cashmere knits",
        her_style_in_her_own_words: "Classic sartorial tailoring with modern minimalism.",
        songs: [
          { song_title: "Prototype", artist: "OutKast" },
          { song_title: "September", artist: "Earth, Wind & Fire" },
          { song_title: " Joy", artist: "Black Coffee" },
        ],
        hopes_and_wishes:
          "Happy 32nd birthday, my love. Here is to a lifetime of health, adventure, and building our legacy together.",
        email: "efua.mensah@example.com",
        phone_e164: "+254744112233",
        permission_consent: true,
      },
    },

    // 4. Fourth Most Recently Updated — Ready for Delivery (3 Photos in Google Drive)
    {
      reference: "HM-2026-0002",
      status: "ready",
      customerName: "Tariq Ali",
      relationship: "Partner",
      herName: "Amina Hassan",
      herNickname: "Mina",
      gender: "Female",
      birthdayDate: "1999-10-28",
      ageTurning: 27,
      colourTheme: "Bright and colourful",
      coverHeadline: "Golden Hour: The Amina Issue",
      email: "tariq.ali@example.com",
      phoneE164: "+254755667788",
      createdAt: hoursAgo(120),
      submittedAt: hoursAgo(90),
      updatedAt: hoursAgo(24),
      palette: { bg: "#5B2333", accent: "#F4B942" },
      photoCaptions: [
        "Lamu rooftop at sunset (Cover Selection)",
        "Painting in her sunlit studio",
        "Laughing over spiced chai in Old Town Mombasa",
      ],
      transitions: [
        { from: "draft", to: "submitted", by: "customer_submission", at: hoursAgo(90) },
        { from: "submitted", to: "in_progress", by: "princemumo80@gmail.com", at: hoursAgo(72) },
        { from: "in_progress", to: "in_design", by: "princemumo80@gmail.com", at: hoursAgo(48) },
        { from: "in_design", to: "ready", by: "princemumo80@gmail.com", at: hoursAgo(24) },
      ],
      answers: {
        subject_gender: "Female",
        customer_name: "Tariq Ali",
        relationship: "Partner",
        her_name: "Amina Hassan",
        her_nickname: "Mina",
        birthday_date: "1999-10-28",
        age_turning: 27,
        colour_theme: "Bright and colourful",
        how_did_you_meet: "On a flight from Nairobi to Lamu where we ended up talking the entire journey.",
        how_long_known: "4 magical years",
        what_she_means_to_you:
          "Amina turns life into technicolour. Her creativity, kindness, and fearless spirit inspire everyone lucky enough to know her.",
        three_words_describe_her: "Vibrant, soulful, fearless",
        her_job_studies_passions: "Textile designer and contemporary ceramicist.",
        favourite_drink: "Cardamom rose iced latte",
        favourite_meal: "Swahili coconut fish curry with chapati",
        dream_destination: "Marrakech, Morocco",
        favourite_colours: "Marigold, bougainvillea magenta, turquoise, terracotta",
        top_3_perfumes: [
          { perfume_name: "Diptyque Do Son", why: "White florals that remind her of coastal evenings" },
        ],
        her_style_in_her_own_words: "Bold resort prints, artisanal gold jewellery, and flowing silhouettes.",
        hopes_and_wishes:
          "May 27 bring your solo exhibition and endless coastal sunrises.",
        email: "tariq.ali@example.com",
        phone_e164: "+254755667788",
        permission_consent: true,
      },
    },

    // 5. Oldest Updated — Draft Order (0 Photos uploaded yet — showcases intelligent export hiding!)
    {
      reference: "HM-2026-0001",
      status: "draft",
      customerName: "Tariro Moyo",
      relationship: "Sister",
      herName: "Nyasha Moyo",
      herNickname: "Nash",
      gender: "Female",
      birthdayDate: "1998-11-24",
      ageTurning: 28,
      colourTheme: "Neutral and minimal",
      coverHeadline: "Nyasha: Effortless Grace at 28",
      email: "tariro.moyo@example.com",
      phoneE164: "+254711223344",
      createdAt: hoursAgo(140),
      submittedAt: null,
      updatedAt: hoursAgo(72),
      palette: { bg: "#2E2528", accent: "#C9A9A6" },
      photoCaptions: [],
      transitions: [],
      answers: {
        subject_gender: "Female",
        customer_name: "Tariro Moyo",
        relationship: "Sister",
        her_name: "Nyasha Moyo",
        her_nickname: "Nash",
        birthday_date: "1998-11-24",
        age_turning: 28,
        colour_theme: "Neutral and minimal",
        what_she_means_to_you:
          "She has been my built-in best friend since day one, the calm in every storm and the woman with the best advice in Nairobi.",
        three_words_describe_her: "Poised, warm-hearted, visionary",
      },
    },
  ];

  for (const spec of seedSpecs) {
    console.log(`[db:seed] Creating order ${spec.reference} (${spec.herName} — ${spec.status})...`);

    let driveFolderId: string | null = null;
    let driveFolderUrl: string | null = null;

    if (spec.photoCaptions.length > 0) {
      const folderLabel = `${spec.herName} - ${spec.reference}`;
      const folderInfo = await createDriveOrderFolder(folderLabel);
      driveFolderId = folderInfo.folderId;
      driveFolderUrl = folderInfo.folderUrl || null;
    }

    const [insertedOrder] = await db
      .insert(orders)
      .values({
        reference: spec.reference,
        status: spec.status,
        draftToken: `seed-token-${spec.reference.toLowerCase()}-${crypto.randomBytes(6).toString("hex")}`,
        customerName: spec.customerName,
        relationship: spec.relationship,
        herName: spec.herName,
        herNickname: spec.herNickname,
        birthdayDate: spec.birthdayDate,
        ageTurning: spec.ageTurning,
        colourTheme: spec.colourTheme,
        coverHeadline: spec.coverHeadline,
        email: spec.email,
        phoneE164: spec.phoneE164,
        driveFolderId,
        driveFolderUrl,
        consentAt: spec.submittedAt,
        submittedAt: spec.submittedAt,
        createdAt: spec.createdAt,
        updatedAt: spec.updatedAt,
      })
      .returning();

    if (!insertedOrder) continue;

    // Insert answers
    const answerRows = Object.entries(spec.answers).map(([questionKey, value]) => ({
      orderId: insertedOrder.id,
      questionKey,
      value: value as object,
    }));
    if (answerRows.length > 0) {
      await db.insert(answers).values(answerRows);
    }

    // Generate & upload sample editorial photos to Google Drive
    for (let i = 0; i < spec.photoCaptions.length; i++) {
      const caption = spec.photoCaptions[i]!;
      const slug = spec.herName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const fileName = `${slug}-portrait-${String(i + 1).padStart(2, "0")}.jpg`;
      const jpegBuffer = await generateEditorialSampleJpeg(
        spec.herName,
        caption,
        i,
        spec.palette.bg,
        spec.palette.accent
      );

      const uploaded = await uploadSamplePhoto(
        insertedOrder.id,
        driveFolderId || "",
        fileName,
        jpegBuffer
      );

      const photoCategory = i >= 2 ? "shared" : "solo";
      await db.insert(photos).values({
        orderId: insertedOrder.id,
        storageProvider: uploaded.storageProvider,
        storageFileId: uploaded.storageFileId,
        originalName: fileName,
        mime: "image/jpeg",
        sizeBytes: uploaded.sizeBytes,
        caption,
        isCover: i === 0,
        sortOrder: i,
        category: photoCategory,
        uploadedAt: new Date(spec.createdAt.getTime() + i * 60_000),
      });
    }

    // Insert status workflow transitions
    for (const tr of spec.transitions) {
      await db.insert(statusHistory).values({
        orderId: insertedOrder.id,
        fromStatus: tr.from,
        toStatus: tr.to,
        adminEmail: tr.by,
        createdAt: tr.at,
      });
    }
  }

  console.log(
    `[db:seed] Seed complete! Created 5 realistic orders (${isDriveLive ? "with real sample photos uploaded to Google Drive" : "with local sample photos"}).`
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("[db:seed] Failed:", err);
  process.exit(1);
});
