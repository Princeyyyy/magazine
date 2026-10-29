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
import { getAdminNotifier } from "@/lib/services/admin-notifier";
import { env } from "@/env";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Checks whether values object contains any user-entered content (ignoring defaults).
 * Used to avoid creating phantom orders in database when the form is still blank.
 */
export function hasMeaningfulValues(values: Record<string, unknown>): boolean {
  for (const [key, val] of Object.entries(values)) {
    if (
      key === "subject_gender" ||
      key === "photos" ||
      key === "honeypot" ||
      key === "token" ||
      key === "permission_consent"
    ) {
      continue;
    }
    if (typeof val === "string" && val.trim().length > 0) return true;
    if (typeof val === "number" && !Number.isNaN(val) && val > 0) return true;
    if (Array.isArray(val) && val.length > 0) {
      const anyRow = val.some(
        (row) =>
          row &&
          typeof row === "object" &&
          Object.values(row as Record<string, unknown>).some(
            (c) => typeof c === "string" && c.trim().length > 0
          )
      );
      if (anyRow) return true;
    }
  }
  return false;
}

/**
 * Generates an order reference like HM-2026-0001 deterministically
 * by finding the highest sequential number in the current year.
 */
export async function generateNextOrderReference(): Promise<string> {
  await ensureDbReady();
  const year = new Date().getFullYear();
  const prefix = `HM-${year}-`;

  const existingOrders = await db
    .select({ reference: orders.reference })
    .from(orders);

  let maxNum = 0;
  for (const o of existingOrders) {
    if (o.reference?.startsWith(prefix)) {
      const numPart = Number.parseInt(o.reference.slice(prefix.length), 10);
      if (!Number.isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(4, "0");
  return `${prefix}${padded}`;
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
}

/**
 * Loads an existing draft by draftToken, or returns null if not found.
 */
export async function getDraftByToken(
  draftToken: string
): Promise<HydratedDraftOrder | null> {
  if (!draftToken || !draftToken.trim()) return null;
  await ensureDbReady();

  const order = await db.query.orders.findFirst({
    where: eq(orders.draftToken, draftToken.trim()),
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

  return {
    orderId: order.id,
    reference: order.reference,
    draftToken: order.draftToken,
    status: order.status,
    values,
    photos: photoItems,
  };
}

/**
 * Creates a new draft order in database or loads an existing one.
 * NOTE: If existingToken is not found and initialValues is empty, returns null
 * to prevent generating empty phantom orders on simple page visits.
 */
export async function createOrLoadDraft(
  existingToken?: string,
  initialValues?: Record<string, unknown>
): Promise<HydratedDraftOrder | null> {
  await ensureDbReady();

  if (existingToken) {
    const found = await getDraftByToken(existingToken);
    if (found) return found;
  }

  // Do not create a database row unless user entered meaningful values
  if (!initialValues || !hasMeaningfulValues(initialValues)) {
    return null;
  }

  const saved = await saveDraftAnswers(undefined, initialValues);
  if (!saved.draftToken) return null;
  return getDraftByToken(saved.draftToken);
}

/**
 * Saves partial answers on page change or debounced field blur.
 * Lazily creates the draft order in database when data is first supplied.
 */
export async function saveDraftAnswers(
  draftToken: string | undefined,
  partialValues: Record<string, unknown>
): Promise<{
  orderId: string;
  reference: string;
  draftToken: string;
  updatedAt: string;
  status: string;
  created: boolean;
}> {
  await ensureDbReady();

  const cleanToken = draftToken?.trim();
  let order = cleanToken
    ? await db.query.orders.findFirst({
        where: eq(orders.draftToken, cleanToken),
      })
    : null;

  // Self-heal: If an empty ghost draft was stored and values are still blank, prune it
  if (
    order &&
    order.status === "draft" &&
    !order.customerName?.trim() &&
    !order.herName?.trim() &&
    !order.email?.trim() &&
    !hasMeaningfulValues(partialValues)
  ) {
    await db.delete(orders).where(eq(orders.id, order.id));
    return {
      orderId: "",
      reference: "",
      draftToken: "",
      updatedAt: new Date().toISOString(),
      status: "draft",
      created: false,
    };
  }

  let createdNew = false;

  if (!order) {
    // If no order exists yet, only create if values have real content
    if (!hasMeaningfulValues(partialValues)) {
      return {
        orderId: "",
        reference: "",
        draftToken: "",
        updatedAt: new Date().toISOString(),
        status: "draft",
        created: false,
      };
    }

    const reference = await generateNextOrderReference();
    const newDraftToken = crypto.randomBytes(24).toString("hex");

    const [createdOrder] = await db
      .insert(orders)
      .values({
        reference,
        draftToken: newDraftToken,
        status: "draft",
      })
      .returning();

    if (!createdOrder) {
      throw new Error("Failed to create draft order.");
    }

    order = createdOrder;
    createdNew = true;
  }

  // If already submitted, do not overwrite locked order
  if (order.status !== "draft") {
    return {
      orderId: order.id,
      reference: order.reference,
      draftToken: order.draftToken,
      updatedAt: order.updatedAt.toISOString(),
      status: order.status,
      created: false,
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
    orderId: order.id,
    reference: order.reference,
    draftToken: order.draftToken,
    updatedAt: topLevelUpdates.updatedAt!.toISOString(),
    status: order.status,
    created: createdNew,
  };
}

/**
 * Final idempotent submission of an order.
 * Validates all 9 pages server-side using the generated Zod schema,
 * locks the order, creates the Drive/Local folder if photos exist, and triggers notifications.
 */
export async function submitOrder(
  draftToken: string,
  submittedValues?: Record<string, unknown>
): Promise<{
  alreadySubmitted: boolean;
  reference: string;
  herName: string;
}> {
  await ensureDbReady();

  if (!draftToken || !draftToken.trim()) {
    throw new ValidationError("Missing draft token.");
  }

  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.draftToken, draftToken.trim()),
  });

  if (!existingOrder) {
    throw new NotFoundError("Order draft");
  }

  // Idempotency: if already submitted, return immediately without duplicate notification
  if (existingOrder.status !== "draft") {
    return {
      alreadySubmitted: true,
      reference: existingOrder.reference,
      herName: existingOrder.herName ?? "her",
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

  // Verify willing submission & permission consent
  if (
    !existingOrder.consentAt &&
    submittedValues?.["permission_consent"] !== true &&
    hydrated.values["permission_consent"] !== true
  ) {
    throw new ValidationError(
      "Please confirm willing submission and permission consent before submitting.",
      [
        {
          field: "permission_consent",
          message: "Please check the consent box before submitting.",
        },
      ]
    );
  }

  const validData = parsed.data;
  const herName = String(validData["her_name"] || existingOrder.herName || "Her");
  const customerName = String(validData["customer_name"] || existingOrder.customerName || "Customer");
  const email = String(validData["email"] || existingOrder.email || "");
  const phoneE164 = String(validData["phone_e164"] || existingOrder.phoneE164 || "");
  const colourTheme =
    validData["colour_theme"] === "Other" && validData["other_colour_theme"]
      ? `Other (${String(validData["other_colour_theme"])})`
      : String(validData["colour_theme"] || existingOrder.colourTheme || "");

  // Create Google Drive folder ONLY if order actually contains uploaded photos
  let driveFolderId = existingOrder.driveFolderId;
  let driveFolderUrl = existingOrder.driveFolderUrl;
  const storage = getPhotoStorage();
  const folderLabel = `${herName} - ${existingOrder.reference}`;

  if (hydrated.photos.length > 0 || driveFolderId) {
    try {
      if (!driveFolderId) {
        driveFolderId = await storage.createOrderFolder(
          existingOrder.id,
          folderLabel
        );
      } else {
        await storage.renameOrderFolder(driveFolderId, folderLabel);
      }
      driveFolderUrl = await storage.getFolderUrl(
        existingOrder.id,
        driveFolderId
      );
    } catch (err) {
      console.error("Failed to sync order folder on submit:", err);
      void getAdminNotifier().notifyCriticalIssue({
        context: "Google Drive Folder Sync Failure on Order Submit",
        summary:
          err instanceof Error
            ? err.message
            : "Could not create or rename Google Drive folder on submission.",
        orderReference: existingOrder.reference,
        orderId: existingOrder.id,
        details: err instanceof Error ? err.stack : String(err),
      });
    }
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
      driveFolderUrl,
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

  // Notify admin via AdminNotifier (email to princemumo80@gmail.com + CC other ADMIN_EMAILS)
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
    driveFolderUrl,
  });

  return {
    alreadySubmitted: false,
    reference: existingOrder.reference,
    herName,
  };
}
