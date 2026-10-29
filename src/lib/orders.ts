import crypto from "crypto";
import { eq, sql, asc } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders, answers, photos, statusHistory } from "@/db/schema";
import {
  FORM_PAGES,
  fullFormSchema,
  getAllFields,
  getDefaultFormValues,
  normalizePhoneToE164,
  type UploadedPhotoItem,
} from "@/config/form";
import { signPhotoPreviewToken, sanitizeText } from "@/lib/security";
import { getPhotoStorage } from "@/lib/services/photo-storage";
import { getMailer } from "@/lib/services/mailer";
import { getWhatsAppProvider } from "@/lib/services/whatsapp";
import { getAdminNotifier } from "@/lib/services/admin-notifier";
import { renderCustomerConfirmationEmail } from "@/emails/templates";
import { env } from "@/env";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Generates an order reference like HM-2026-0001
 */
export async function generateNextOrderReference(): Promise<string> {
  await ensureDbReady();
  const year = new Date().getFullYear();
  const countRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);
  const nextNum = (countRes[0]?.count ?? 0) + 1;
  const padded = String(nextNum).padStart(4, "0");
  // Add a check to avoid collisions if orders were deleted
  const candidate = `HM-${year}-${padded}`;
  const existing = await db.query.orders.findFirst({
    where: eq(orders.reference, candidate),
  });
  if (existing) {
    const randSuffix = crypto.randomInt(1000, 9999);
    return `HM-${year}-${randSuffix}`;
  }
  return candidate;
}

export function buildPhotoPreviewUrl(photoId: string, orderId: string): string {
  const sig = signPhotoPreviewToken(photoId, orderId);
  return `/api/uploads/preview/${photoId}?orderId=${encodeURIComponent(
    orderId
  )}&sig=${encodeURIComponent(sig)}`;
}

export interface HydratedDraftOrder {
  orderId: string;
  reference: string;
  draftToken: string;
  status: string;
  values: Record<string, unknown>;
  photos: UploadedPhotoItem[];
  whatsAppUrl: string;
}

/**
 * Loads an existing draft by draftToken, or returns null if not found.
 */
export async function getDraftByToken(
  draftToken: string
): Promise<HydratedDraftOrder | null> {
  await ensureDbReady();
  const order = await db.query.orders.findFirst({
    where: eq(orders.draftToken, draftToken),
  });

  if (!order) return null;

  const storedAnswers = await db
    .select()
    .from(answers)
    .where(eq(answers.orderId, order.id));

  const storedPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.orderId, order.id))
    .orderBy(asc(photos.sortOrder), asc(photos.uploadedAt));

  const values = getDefaultFormValues(FORM_PAGES);

  // Hydrate from answers table
  for (const ans of storedAnswers) {
    values[ans.questionKey] = ans.value;
  }

  // Hydrate top-level order columns if present
  if (order.customerName) values["customer_name"] = order.customerName;
  if (order.relationship) values["relationship"] = order.relationship;
  if (order.herName) values["her_name"] = order.herName;
  if (order.herNickname) values["her_nickname"] = order.herNickname;
  if (order.birthdayDate) values["birthday_date"] = order.birthdayDate;
  if (order.ageTurning !== null && order.ageTurning !== undefined) {
    values["age_turning"] = order.ageTurning;
  }
  if (order.colourTheme) values["colour_theme"] = order.colourTheme;
  if (order.coverHeadline) values["cover_headline"] = order.coverHeadline;
  if (order.email) values["email"] = order.email;
  if (order.phoneE164) values["phone_e164"] = order.phoneE164;
  if (order.consentAt) values["permission_consent"] = true;

  const photoItems: UploadedPhotoItem[] = storedPhotos.map((p) => ({
    id: p.id,
    storageProvider: p.storageProvider as "local" | "drive",
    storageFileId: p.storageFileId,
    originalName: p.originalName,
    mime: p.mime,
    sizeBytes: p.sizeBytes,
    caption: p.caption,
    isCover: p.isCover,
    sortOrder: p.sortOrder,
    previewUrl: buildPhotoPreviewUrl(p.id, order.id),
  }));

  values["photos"] = photoItems;

  const wa = getWhatsAppProvider();
  const whatsAppUrl = wa.buildCustomerWaLink(
    order.reference,
    order.herName ?? undefined
  );

  return {
    orderId: order.id,
    reference: order.reference,
    draftToken: order.draftToken,
    status: order.status,
    values,
    photos: photoItems,
    whatsAppUrl,
  };
}

/**
 * Creates a new draft order or returns an existing one if draftToken is provided.
 */
export async function createOrLoadDraft(
  existingToken?: string
): Promise<HydratedDraftOrder> {
  await ensureDbReady();

  if (existingToken) {
    const found = await getDraftByToken(existingToken);
    if (found) return found;
  }

  const reference = await generateNextOrderReference();
  const draftToken = crypto.randomBytes(24).toString("hex");

  const [created] = await db
    .insert(orders)
    .values({
      reference,
      draftToken,
      status: "draft",
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create draft order.");
  }

  const hydrated = await getDraftByToken(created.draftToken);
  if (!hydrated) {
    throw new Error("Failed to hydrate newly created draft.");
  }
  return hydrated;
}

/**
 * Saves partial answers on page change or debounced field blur.
 */
export async function saveDraftAnswers(
  draftToken: string,
  partialValues: Record<string, unknown>
): Promise<{ updatedAt: string; status: string }> {
  await ensureDbReady();

  const order = await db.query.orders.findFirst({
    where: eq(orders.draftToken, draftToken),
  });

  if (!order) {
    throw new NotFoundError("Order draft");
  }

  // If already submitted, do not overwrite locked order
  if (order.status !== "draft") {
    return {
      updatedAt: order.updatedAt.toISOString(),
      status: order.status,
    };
  }

  const validKeys = new Set(getAllFields(FORM_PAGES).map((f) => f.key));

  // Extract top-level order columns for quick synchronization
  const topLevelUpdates: Partial<typeof orders.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof partialValues["customer_name"] === "string") {
    topLevelUpdates.customerName = sanitizeText(partialValues["customer_name"]);
  }
  if (typeof partialValues["relationship"] === "string") {
    topLevelUpdates.relationship = sanitizeText(partialValues["relationship"]);
  }
  if (typeof partialValues["her_name"] === "string") {
    topLevelUpdates.herName = sanitizeText(partialValues["her_name"]);
  }
  if (typeof partialValues["her_nickname"] === "string") {
    topLevelUpdates.herNickname = sanitizeText(partialValues["her_nickname"]);
  }
  if (typeof partialValues["birthday_date"] === "string") {
    topLevelUpdates.birthdayDate = sanitizeText(partialValues["birthday_date"]);
  }
  if (
    partialValues["age_turning"] !== undefined &&
    partialValues["age_turning"] !== ""
  ) {
    const parsedAge = Number(partialValues["age_turning"]);
    if (!Number.isNaN(parsedAge) && Number.isInteger(parsedAge)) {
      topLevelUpdates.ageTurning = parsedAge;
    }
  }
  if (typeof partialValues["colour_theme"] === "string") {
    topLevelUpdates.colourTheme = sanitizeText(partialValues["colour_theme"]);
  }
  if (typeof partialValues["cover_headline"] === "string") {
    topLevelUpdates.coverHeadline = sanitizeText(partialValues["cover_headline"]);
  }
  if (typeof partialValues["email"] === "string") {
    topLevelUpdates.email = sanitizeText(partialValues["email"]);
  }
  if (typeof partialValues["phone_e164"] === "string" && partialValues["phone_e164"]) {
    const norm = normalizePhoneToE164(partialValues["phone_e164"]);
    topLevelUpdates.phoneE164 = norm.valid
      ? norm.e164
      : sanitizeText(partialValues["phone_e164"]);
  }
  if (partialValues["permission_consent"] === true) {
    topLevelUpdates.consentAt = new Date();
  }

  await db.update(orders).set(topLevelUpdates).where(eq(orders.id, order.id));

  const valuesArray = Object.entries(partialValues)
    .filter(([key, rawVal]) => validKeys.has(key) && key !== "photos" && rawVal !== undefined)
    .map(([key, rawVal]) => ({
      orderId: order.id,
      questionKey: key,
      value: rawVal as object,
    }));

  if (valuesArray.length > 0) {
    await db
      .insert(answers)
      .values(valuesArray)
      .onConflictDoUpdate({
        target: [answers.orderId, answers.questionKey],
        set: { value: sql`excluded.value` },
      });
  }

  return {
    updatedAt: topLevelUpdates.updatedAt!.toISOString(),
    status: order.status,
  };
}

/**
 * Final idempotent submission of an order.
 * Validates all 9 pages server-side using the generated Zod schema,
 * locks the order, creates the Drive/Local folder if missing, and triggers confirmation emails & notifications.
 */
export async function submitOrder(
  draftToken: string,
  submittedValues?: Record<string, unknown>
): Promise<{
  alreadySubmitted: boolean;
  reference: string;
  herName: string;
  whatsAppUrl: string;
}> {
  await ensureDbReady();

  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.draftToken, draftToken),
  });

  if (!existingOrder) {
    throw new NotFoundError("Order draft");
  }

  const wa = getWhatsAppProvider();

  // Idempotency: if already submitted, return immediately without re-sending emails
  if (existingOrder.status !== "draft") {
    return {
      alreadySubmitted: true,
      reference: existingOrder.reference,
      herName: existingOrder.herName ?? "her",
      whatsAppUrl: wa.buildCustomerWaLink(
        existingOrder.reference,
        existingOrder.herName ?? undefined
      ),
    };
  }

  // Save any final field values passed in request
  if (submittedValues) {
    await saveDraftAnswers(draftToken, submittedValues);
  }

  // Hydrate full state from DB (including photos from `photos` table)
  const hydrated = await getDraftByToken(draftToken);
  if (!hydrated) {
    throw new NotFoundError("Order draft");
  }

  // Validate against complete generated Zod schema
  const parsed = fullFormSchema.safeParse(hydrated.values);
  if (!parsed.success) {
    throw new ValidationError(
      "Please complete all required fields before submitting.",
      parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }))
    );
  }

  const validData = parsed.data;
  const herName = String(validData["her_name"] || "Her");
  const customerName = String(validData["customer_name"] || "Customer");
  const email = String(validData["email"] || "");
  const phoneE164 = String(validData["phone_e164"] || "");
  const colourTheme =
    validData["colour_theme"] === "Other" && validData["other_colour_theme"]
      ? `Other (${String(validData["other_colour_theme"])})`
      : String(validData["colour_theme"] || "");

  // Ensure Drive / Storage folder is created or renamed to "{Her full name} - {order reference}"
  // and upload a complete Order Brief & Photo Captions manifest inside the Drive folder
  let driveFolderId = existingOrder.driveFolderId;
  const storage = getPhotoStorage();
  const folderLabel = `${herName} - ${existingOrder.reference}`;
  try {
    if (!driveFolderId) {
      driveFolderId = await storage.createOrderFolder(
        existingOrder.id,
        folderLabel
      );
    } else {
      await storage.renameOrderFolder(driveFolderId, folderLabel);
    }

    if (driveFolderId) {
      const coverPhoto =
        hydrated.photos.find((p) => p.isCover) ?? hydrated.photos[0];
      const manifestLines: string[] = [
        `# Custom Magazine Order Brief — ${existingOrder.reference}`,
        ``,
        `- **Featured Star:** ${herName}`,
        `- **Ordered By:** ${customerName} (${String(validData["relationship"] || "")})`,
        `- **Customer Email:** ${email}`,
        `- **Customer Phone:** ${phoneE164}`,
        `- **Birthday & Age Turning:** ${String(validData["birthday_date"] || "")} (Turning ${String(validData["age_turning"] || "")})`,
        `- **Colour Direction:** ${colourTheme}`,
        `- **Cover Headline Suggestion:** ${String(validData["cover_headline"] || "(None)")}`,
        `- **Selected Cover Photo:** ${coverPhoto ? coverPhoto.originalName : "(First photo)"}`,
        ``,
        `## Uploaded Photos & Captions (${hydrated.photos.length} Photos)`,
        ``,
        ...hydrated.photos.map(
          (p, i) =>
            `${i + 1}. **${p.originalName}**${p.isCover ? " [COVER PHOTO]" : ""} — Caption: ${p.caption || "(no caption)"}`
        ),
        ``,
        `## Full Questionnaire Answers`,
        ``,
        `\`\`\`json`,
        JSON.stringify(validData, null, 2),
        `\`\`\``,
      ];

      await storage.saveOrderManifest(
        driveFolderId,
        `Order-Brief-${existingOrder.reference}.md`,
        manifestLines.join("\n")
      );
    }
  } catch (err) {
    console.error("Failed to sync order folder or manifest on submit:", err);
  }

  const now = new Date();

  await db
    .update(orders)
    .set({
      status: "submitted",
      customerName,
      relationship: String(validData["relationship"] || ""),
      herName,
      herNickname: String(validData["her_nickname"] || ""),
      birthdayDate: String(validData["birthday_date"] || ""),
      ageTurning: Number(validData["age_turning"]),
      colourTheme,
      coverHeadline: String(validData["cover_headline"] || ""),
      email,
      phoneE164,
      driveFolderId,
      consentAt: now,
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, existingOrder.id));

  await db.insert(statusHistory).values({
    orderId: existingOrder.id,
    fromStatus: "draft",
    toStatus: "submitted",
    adminEmail: "customer_submission",
  });

  const whatsAppUrl = wa.buildCustomerWaLink(existingOrder.reference, herName);

  // Send customer confirmation email
  const mailer = getMailer();
  const confirmationMail = renderCustomerConfirmationEmail({
    customerName,
    herName,
    orderReference: existingOrder.reference,
    colourTheme,
    photoCount: hydrated.photos.length,
    whatsAppUrl,
  });

  await mailer.sendMail({
    orderId: existingOrder.id,
    to: email,
    subject: confirmationMail.subject,
    html: confirmationMail.html,
    text: confirmationMail.text,
    template: "customer_order_confirmation",
  });

  // Notify admin via AdminNotifier (email + optional Telegram)
  const notifier = getAdminNotifier();
  await notifier.notifyNewOrder({
    orderId: existingOrder.id,
    orderReference: existingOrder.reference,
    customerName,
    herName,
    email,
    phoneE164,
    colourTheme,
    photoCount: hydrated.photos.length,
    adminOrderUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/orders/${existingOrder.id}`,
  });

  return {
    alreadySubmitted: false,
    reference: existingOrder.reference,
    herName,
    whatsAppUrl,
  };
}
