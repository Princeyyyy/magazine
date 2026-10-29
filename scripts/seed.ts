import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db, ensureDbReady } from "../src/db";
import {
  orders,
  answers,
  photos,
  notes,
  messageLog,
  statusHistory,
  devOutbox,
} from "../src/db/schema";

// Valid 1x1 PNG buffer (passes magic byte checks and renders cleanly in browser)
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function writePlaceholderPhotoFile(
  orderId: string,
  fileName: string
): Promise<{ storageFileId: string; sizeBytes: number }> {
  const dir = path.join(process.cwd(), ".local-uploads", orderId);
  await fs.mkdir(dir, { recursive: true });
  const buf = Buffer.from(SAMPLE_PNG_BASE64, "base64");
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, buf);
  return { storageFileId: fileName, sizeBytes: buf.length };
}

async function seed() {
  console.log("[db:seed] Ensuring database schema is ready...");
  await ensureDbReady();

  // Clear existing sample orders if re-running seed
  console.log("[db:seed] Creating 3 realistic sample magazine orders...");

  // --------------------------------------------------------------------------
  // ORDER 1: Draft Order (in progress by customer)
  // --------------------------------------------------------------------------
  const [draftOrder] = await db
    .insert(orders)
    .values({
      reference: "HM-2026-0001",
      status: "draft",
      draftToken: "sample-draft-token-hm-2026-0001",
      customerName: "Tariro Moyo",
      relationship: "Sister",
      herName: "Nyasha Moyo",
      herNickname: "Nash",
      birthdayDate: "1998-08-24",
      ageTurning: 28,
      colourTheme: "Neutral and minimal",
      coverHeadline: "Nyasha: Effortless Grace at 28",
      email: "tariro@example.com",
      phoneE164: "+254711223344",
    })
    .onConflictDoNothing()
    .returning();

  if (draftOrder) {
    await db.insert(answers).values([
      {
        orderId: draftOrder.id,
        questionKey: "customer_name",
        value: "Tariro Moyo",
      },
      {
        orderId: draftOrder.id,
        questionKey: "relationship",
        value: "Sister",
      },
      {
        orderId: draftOrder.id,
        questionKey: "her_name",
        value: "Nyasha Moyo",
      },
      {
        orderId: draftOrder.id,
        questionKey: "what_she_means_to_you",
        value:
          "She has been my built-in best friend since day one, the calm in every storm and the woman with the best advice in Nairobi.",
      },
      {
        orderId: draftOrder.id,
        questionKey: "three_words_describe_her",
        value: "Poised, warm-hearted, visionary",
      },
    ]);
  }

  // --------------------------------------------------------------------------
  // ORDER 2: Submitted Order with 20 Placeholder Photos
  // --------------------------------------------------------------------------
  const [submittedOrder] = await db
    .insert(orders)
    .values({
      reference: "HM-2026-0002",
      status: "submitted",
      draftToken: crypto.randomBytes(20).toString("hex"),
      customerName: "Amara Okafor",
      relationship: "Best friend",
      herName: "Zuri Mwangi",
      herNickname: "Zuzu",
      birthdayDate: "2001-11-14",
      ageTurning: 25,
      colourTheme: "Pink and girly",
      coverHeadline: "Zuri: Turning 25 in Full Bloom",
      email: "amara.okafor@example.com",
      phoneE164: "+254722998877",
      driveFolderId: "local-folder:HM-2026-0002",
      consentAt: new Date(Date.now() - 86400_000 * 2),
      submittedAt: new Date(Date.now() - 86400_000 * 2),
    })
    .onConflictDoNothing()
    .returning();

  if (submittedOrder) {
    const sampleAnswers: Record<string, unknown> = {
      customer_name: "Amara Okafor",
      relationship: "Best friend",
      her_name: "Zuri Mwangi",
      her_nickname: "Zuzu",
      birthday_date: "2001-11-14",
      age_turning: 25,
      colour_theme: "Pink and girly",
      cover_headline: "Zuri: Turning 25 in Full Bloom",
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
        { activity: "Curating Pinterest moodboards for trips" },
      ],
      favourite_drink: "Iced strawberry matcha latte",
      favourite_sweet_treat: "Warm pistachio croissant",
      favourite_meal: "Prawn linguine with lemon butter",
      dream_destination: "Amalfi Coast, Italy",
      favourite_beach_or_holiday_spot: "Diani Beach",
      favourite_hobby: "Floral arranging and hosting",
      favourite_flowers: "Blush pink peonies and white ranunculus",
      favourite_colours: "Rosewater pink, champagne, espresso",
      favourite_book_or_genre: "Everything I Know About Love by Dolly Alderton",
      favourite_film_genre: "Classic 2000s rom-coms",
      favourite_tv_shows_and_movies:
        "The Devil Wears Prada, Sex and the City, Bridgerton, How to Lose a Guy in 10 Days",
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
        "MAC Chestnut lip liner, Charlotte Tilbury Pillow Talk Medium, and Fenty Fu$$y gloss",
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
        {
          date: "September 2019",
          place: "Nairobi",
          what_happened: "The day we met in university orientation and talked for four hours straight.",
        },
        {
          date: "December 2022",
          place: "Diani Beach",
          what_happened: "Our first girls' coastal trip where we watched the sunrise on the beach.",
        },
        {
          date: "July 2024",
          place: "Zanzibar",
          what_happened: "Sunset dhow cruise celebrating her promotion!",
        },
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
    };

    for (const [k, v] of Object.entries(sampleAnswers)) {
      await db.insert(answers).values({
        orderId: submittedOrder.id,
        questionKey: k,
        value: v as object,
      });
    }

    const sampleCaptions = [
      "Golden hour in Diani, Dec 2024 (Cover Choice)",
      "Brunch at Cultiva Nairobi",
      "Graduation day beaming with pride",
      "Sunset dhow cruise in Stone Town, Zanzibar",
      "Sunday flower market run",
      "Dressed up for gala night",
      "Coffee & croissants morning ritual",
      "Candid laughter with the girls",
      "Beach walk in Watamu",
      "Pilates princess post-class glow",
      "Hosting her annual dinner party",
      "Road trip to Naivasha",
      "Museum date afternoon",
      "All-pink birthday dinner look",
      "By the pool in Lamu",
      "Mirror selfie before a night out",
      "Picnic in Karura Forest",
      "Her signature ear-to-ear smile",
      "Champagne toast on New Year's Eve",
      "Unforgettable sunset silhouette",
    ];

    for (let i = 0; i < 20; i++) {
      const fileName = `zuri-photo-${String(i + 1).padStart(2, "0")}.png`;
      const { storageFileId, sizeBytes } = await writePlaceholderPhotoFile(
        submittedOrder.id,
        fileName
      );
      await db.insert(photos).values({
        orderId: submittedOrder.id,
        storageProvider: "local",
        storageFileId,
        originalName: fileName,
        mime: "image/png",
        sizeBytes,
        caption: sampleCaptions[i] ?? `Photo ${i + 1}`,
        isCover: i === 0,
        sortOrder: i,
      });
    }

    await db.insert(notes).values({
      orderId: submittedOrder.id,
      adminEmail: "admin@example.com",
      body: "All 20 photos checked — high resolution and wonderful lighting. Ready to start cover layout.",
    });

    await db.insert(statusHistory).values({
      orderId: submittedOrder.id,
      fromStatus: "draft",
      toStatus: "submitted",
      adminEmail: "customer_submission",
    });

    await db.insert(messageLog).values([
      {
        orderId: submittedOrder.id,
        channel: "email",
        template: "customer_order_confirmation",
        status: "sent (dev_outbox)",
      },
      {
        orderId: submittedOrder.id,
        channel: "email",
        template: "admin_new_order_alert",
        status: "sent (dev_outbox)",
      },
    ]);

    await db.insert(devOutbox).values({
      orderId: submittedOrder.id,
      toEmail: "amara.okafor@example.com",
      subject: "Your Custom Magazine order for Zuri Mwangi (HM-2026-0002)",
      htmlBody: "<p>Sample confirmation email for HM-2026-0002</p>",
      textBody:
        "Thank you, Amara Okafor! I have received your order HM-2026-0002 for Zuri Mwangi (20 photos uploaded).",
      template: "customer_order_confirmation",
    });
  }

  // --------------------------------------------------------------------------
  // ORDER 3: In Design Order
  // --------------------------------------------------------------------------
  const [inDesignOrder] = await db
    .insert(orders)
    .values({
      reference: "HM-2026-0003",
      status: "in_design",
      draftToken: crypto.randomBytes(20).toString("hex"),
      customerName: "David Kamau",
      relationship: "Partner",
      herName: "Imani Njeri",
      herNickname: "Mani",
      birthdayDate: "1996-05-03",
      ageTurning: 30,
      colourTheme: "Black and white",
      coverHeadline: "Imani: Thirty, Timeless & Iconic",
      email: "david.kamau@example.com",
      phoneE164: "+254733445566",
      driveFolderId: "local-folder:HM-2026-0003",
      consentAt: new Date(Date.now() - 86400_000 * 5),
      submittedAt: new Date(Date.now() - 86400_000 * 5),
    })
    .onConflictDoNothing()
    .returning();

  if (inDesignOrder) {
    await db.insert(answers).values([
      {
        orderId: inDesignOrder.id,
        questionKey: "customer_name",
        value: "David Kamau",
      },
      {
        orderId: inDesignOrder.id,
        questionKey: "relationship",
        value: "Partner",
      },
      {
        orderId: inDesignOrder.id,
        questionKey: "her_name",
        value: "Imani Njeri",
      },
      {
        orderId: inDesignOrder.id,
        questionKey: "what_she_means_to_you",
        value:
          "Imani is my favourite person on earth — brilliant, endlessly kind, and the most stylish architect I know.",
      },
      {
        orderId: inDesignOrder.id,
        questionKey: "three_words_describe_her",
        value: "Timeless, sharp, compassionate",
      },
    ]);

    for (let i = 0; i < 15; i++) {
      const fileName = `imani-editorial-${String(i + 1).padStart(2, "0")}.png`;
      const { storageFileId, sizeBytes } = await writePlaceholderPhotoFile(
        inDesignOrder.id,
        fileName
      );
      await db.insert(photos).values({
        orderId: inDesignOrder.id,
        storageProvider: "local",
        storageFileId,
        originalName: fileName,
        mime: "image/png",
        sizeBytes,
        caption: `Editorial portrait #${i + 1}`,
        isCover: i === 0,
        sortOrder: i,
      });
    }

    await db.insert(notes).values({
      orderId: inDesignOrder.id,
      adminEmail: "admin@example.com",
      body: "Monochrome editorial layout in progress — pages 1 to 6 drafted in InDesign.",
    });

    await db.insert(statusHistory).values([
      {
        orderId: inDesignOrder.id,
        fromStatus: "draft",
        toStatus: "submitted",
        adminEmail: "customer_submission",
      },
      {
        orderId: inDesignOrder.id,
        fromStatus: "submitted",
        toStatus: "in_design",
        adminEmail: "admin@example.com",
      },
    ]);
  }

  console.log("[db:seed] Seed complete! 3 orders ready (HM-2026-0001, HM-2026-0002, HM-2026-0003).");
  process.exit(0);
}

void seed().catch((err) => {
  console.error("[db:seed] Error:", err);
  process.exit(1);
});
