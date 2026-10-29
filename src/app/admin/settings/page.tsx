import React from "react";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { getAuthenticatedAdminEmail } from "@/auth";
import { getServiceModeSummary } from "@/env";
import { db, ensureDbReady } from "@/db";
import { devOutbox } from "@/db/schema";
import { AdminSettingsClient } from "@/components/admin/admin-settings-client";

export default async function AdminSettingsPage() {
  const adminEmail = await getAuthenticatedAdminEmail();
  if (!adminEmail) {
    redirect("/admin/login");
  }

  await ensureDbReady();
  const modeSummary = getServiceModeSummary();

  const outboxEmails = await db
    .select()
    .from(devOutbox)
    .orderBy(desc(devOutbox.createdAt))
    .limit(30);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-serif italic text-base text-[#9E4765]">
          System Diagnostics
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1F1619]">
          Service Adapters &amp; Dev Outbox
        </h1>
        <p className="text-xs text-[#7A686E] mt-1">
          Verify which adapters are running live vs local fallback, test connections, and inspect emails captured by ConsoleMailer.
        </p>
      </div>

      <AdminSettingsClient
        modeSummary={modeSummary}
        outboxEmails={outboxEmails.map((e) => ({
          id: e.id,
          toEmail: e.toEmail,
          subject: e.subject,
          textBody: e.textBody,
          template: e.template,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
