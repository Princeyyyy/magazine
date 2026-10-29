import React from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq, asc, desc } from "drizzle-orm";
import { getAuthenticatedAdminEmail } from "@/auth";
import { db, ensureDbReady } from "@/db";
import { orders, answers, photos, statusHistory } from "@/db/schema";
import { FORM_PAGES, getDefaultFormValues } from "@/config/form";
import { getPhotoStorage } from "@/lib/services/photo-storage";
import { AdminOrderDetailClient } from "@/components/admin/admin-order-detail-client";
import { ChevronLeft } from "lucide-react";

interface AdminOrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const adminEmail = await getAuthenticatedAdminEmail();
  if (!adminEmail) {
    redirect("/admin/login");
  }

  const { orderId } = await params;
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
    // If an admin entered an order reference (e.g. HM-2026-0001), redirect to the canonical order page
    const byRef = await db.query.orders.findFirst({
      where: eq(orders.reference, orderId.toUpperCase().trim()),
    });
    if (byRef) {
      redirect(`/admin/orders/${byRef.id}`);
    }
  }

  if (!order) {
    notFound();
  }

  const [storedAnswers, storedPhotos, storedStatusHistory] = await Promise.all([
    db.select().from(answers).where(eq(answers.orderId, order.id)),
    db
      .select()
      .from(photos)
      .where(eq(photos.orderId, order.id))
      .orderBy(asc(photos.sortOrder), asc(photos.uploadedAt)),
    db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.orderId, order.id))
      .orderBy(desc(statusHistory.createdAt)),
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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A686E] hover:text-[#9E4765] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Orders Queue
        </Link>
      </div>

      <AdminOrderDetailClient
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
          updatedAt: order.updatedAt.toISOString(),
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
          uploadedAt: p.uploadedAt.toISOString(),
        }))}
        statusHistory={storedStatusHistory.map((sh) => ({
          id: sh.id,
          fromStatus: sh.fromStatus,
          toStatus: sh.toStatus,
          adminEmail: sh.adminEmail,
          createdAt: sh.createdAt.toISOString(),
        }))}
        driveFolderUrl={driveFolderUrl}
      />
    </div>
  );
}
