import React from "react";
import { redirect, notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getAuthenticatedAdminEmail } from "@/auth";
import { db, ensureDbReady } from "@/db";
import { orders, answers, photos } from "@/db/schema";
import { FORM_PAGES, getDefaultFormValues } from "@/config/form";
import { getPhotoStorage } from "@/lib/services/photo-storage";
import { AdminPrintableBrief } from "@/components/admin/admin-printable-brief";

interface AdminPrintableBriefPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPrintableBriefPage({
  params,
  searchParams,
}: AdminPrintableBriefPageProps) {
  const adminEmail = await getAuthenticatedAdminEmail();
  if (!adminEmail) {
    redirect("/admin/login");
  }

  const { orderId } = await params;
  const sp = await searchParams;
  // ?pdf=1 triggers auto-print mode in the client component
  const autoPrint = sp["pdf"] === "1";

  await ensureDbReady();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderId
    );

  let order = null;
  if (isUuid) {
    order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
  } else {
    const byRef = await db.query.orders.findFirst({
      where: eq(orders.reference, orderId.toUpperCase().trim()),
    });
    if (byRef) {
      redirect(`/admin/orders/${byRef.id}/brief`);
    }
  }

  if (!order) {
    notFound();
  }

  const [storedAnswers, storedPhotos] = await Promise.all([
    db.select().from(answers).where(eq(answers.orderId, order.id)),
    db
      .select()
      .from(photos)
      .where(eq(photos.orderId, order.id))
      .orderBy(asc(photos.sortOrder), asc(photos.uploadedAt)),
  ]);

  const values = getDefaultFormValues(FORM_PAGES);
  for (const ans of storedAnswers) {
    values[ans.questionKey] = ans.value;
  }
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

  const storage = getPhotoStorage();
  const driveFolderUrl =
    order.driveFolderUrl ||
    (order.driveFolderId
      ? await storage.getFolderUrl(order.id, order.driveFolderId)
      : "");

  return (
    <AdminPrintableBrief
      order={{
        id: order.id,
        reference: order.reference,
        status: order.status,
        customerName: order.customerName || "",
        relationship: order.relationship || "",
        herName: order.herName || "",
        herNickname: order.herNickname || "",
        birthdayDate: order.birthdayDate || "",
        ageTurning: order.ageTurning,
        colourTheme: order.colourTheme || "",
        coverHeadline: order.coverHeadline || "",
        email: order.email || "",
        phoneE164: order.phoneE164 || "",
        driveFolderId: order.driveFolderId || "",
        driveFolderUrl,
        createdAt: order.createdAt.toISOString(),
        submittedAt: order.submittedAt?.toISOString() ?? null,
      }}
      values={values}
      photos={storedPhotos.map((p) => ({
        id: p.id,
        originalName: p.originalName,
        mime: p.mime,
        sizeBytes: p.sizeBytes,
        caption: p.caption,
        isCover: p.isCover,
        sortOrder: p.sortOrder,
        category: (p.category === "shared" ? "shared" : "solo") as
          | "solo"
          | "shared",
        uploadedAt: p.uploadedAt.toISOString(),
      }))}
      driveFolderUrl={driveFolderUrl}
      autoPrint={autoPrint}
    />
  );
}
