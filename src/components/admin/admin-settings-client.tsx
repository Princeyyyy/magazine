"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Play } from "lucide-react";

interface ServiceModeSummary {
  isDevMode: boolean;
  appUrl?: string;
  database: "postgres" | "pglite_local";
  neonBranch?: string | null;
  photoStorage: "drive" | "local";
  mailer: "resend" | "console";
  notifier: {
    email: boolean;
    console: boolean;
  };
  adminAuth?: "password" | "default_password";
}

interface DevOutboxItem {
  id: string;
  toEmail: string;
  subject: string;
  textBody: string;
  template: string;
  createdAt: string;
}

export function AdminSettingsClient({
  modeSummary,
  outboxEmails,
}: {
  modeSummary: ServiceModeSummary;
  outboxEmails: DevOutboxItem[];
}) {
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; message: string; loading?: boolean }>
  >({});

  const runServiceTest = async (
    service: "database" | "drive" | "email" | "notifier"
  ) => {
    setTestResults((prev) => ({
      ...prev,
      [service]: { ok: true, message: "Testing...", loading: true },
    }));

    try {
      const res = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: { message?: string };
      };
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          ok: Boolean(data.ok),
          message:
            data.message || data.error?.message || "Test completed.",
          loading: false,
        },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          ok: false,
          message: "Network error while running test.",
          loading: false,
        },
      }));
    }
  };

  const services: {
    id: "database" | "drive" | "email" | "notifier";
    title: string;
    activeAdapter: string;
    isLive: boolean;
    description: string;
  }[] = [
    {
      id: "database",
      title: "Neon Lakebase Postgres",
      activeAdapter:
        modeSummary.database === "postgres"
          ? `Neon PostgreSQL (${modeSummary.neonBranch ?? "production"} branch)`
          : "Embedded PGlite (./.local-db)",
      isLive: modeSummary.database === "postgres",
      description:
        "Stores customer orders, questionnaire answers, photo metadata, and status workflow history.",
    },
    {
      id: "drive",
      title: "Photo Storage Adapter",
      activeAdapter:
        modeSummary.photoStorage === "drive"
          ? "DriveStorage (Google Drive API)"
          : "LocalDiskStorage (./.local-uploads)",
      isLive: modeSummary.photoStorage === "drive",
      description:
        "Handles resumable chunked photo uploads, per-order Google Drive folders, and private authenticated previews.",
    },
    {
      id: "email",
      title: "Mailer Adapter (Resend)",
      activeAdapter:
        modeSummary.mailer === "resend"
          ? "ResendMailer (Custom Magazine <noreply@cleanplay.app>)"
          : "ConsoleMailer (Terminal + dev_outbox)",
      isLive: modeSummary.mailer === "resend",
      description:
        "Sends customer order confirmations, resume-order links, and admin order notifications via Resend.",
    },
    {
      id: "notifier",
      title: "Admin Notifier Adapter",
      activeAdapter: modeSummary.notifier.email
        ? "Admin Email + CC Routing"
        : "Console Fallback",
      isLive: modeSummary.notifier.email,
      description:
        "Sends completed order briefs to princemumo80@gmail.com (CCing all other ADMIN_EMAILS) and routes system alerts exclusively to princemumo80@gmail.com.",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {services.map((svc) => {
          const result = testResults[svc.id];
          return (
            <div
              key={svc.id}
              className="rounded-3xl border border-[#EFE6E0] bg-white p-6 shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-serif text-xl text-[#1F1619]">
                    {svc.title}
                  </h2>
                  <Badge
                    variant={svc.isLive ? "success" : "dev"}
                    className="rounded-full"
                  >
                    {svc.isLive ? "Live" : "Local / Mock"}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-[#9E4765]">
                  {svc.activeAdapter}
                </p>
                <p className="text-xs text-[#6E5A61] leading-relaxed">
                  {svc.description}
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#F3ECE7]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8C7A80]">
                    Run a harmless connection check
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={result?.loading}
                    onClick={() => void runServiceTest(svc.id)}
                  >
                    <Play className="h-3 w-3" />
                    {result?.loading ? "Testing..." : "Test"}
                  </Button>
                </div>

                {result && !result.loading && (
                  <div
                    className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                      result.ok
                        ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                        : "bg-[#FFF5F6] text-[#B91C1C] border border-[#F5C2C7]"
                    }`}
                  >
                    {result.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    )}
                    <span>{result.message}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Infrastructure Status */}
      <div className="rounded-3xl border border-[#EFE6E0] bg-white p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-[#7A686E] block mb-1">Database Engine</span>
          <strong className="text-[#1F1619]">
            {modeSummary.database === "postgres"
              ? "Neon PostgreSQL (DATABASE_URL)"
              : "Embedded PGlite PostgreSQL (./.local-db)"}
          </strong>
        </div>
        <div>
          <span className="text-[#7A686E] block mb-1">Admin Authentication</span>
          <strong className="text-[#1F1619]">
            ADMIN_EMAILS + ADMIN_PASSWORD (14-Day Signed Cookie)
          </strong>
        </div>
        <div>
          <span className="text-[#7A686E] block mb-1">Application URL</span>
          <strong className="text-[#1F1619]">
            {modeSummary.appUrl || "http://localhost:3000"}
          </strong>
        </div>
      </div>

      {/* ConsoleMailer Dev Outbox Table */}
      {modeSummary.mailer !== "resend" && (
        <section className="rounded-3xl border border-[#EFE6E0] bg-white p-6 sm:p-8 shadow-2xs space-y-5">
          <div>
            <h2 className="font-serif text-2xl text-[#1F1619]">
              Dev Outbox ({outboxEmails.length})
            </h2>
            <p className="text-xs text-[#7A686E]">
              Emails captured locally when <code className="font-mono">RESEND_API_KEY</code> is not configured.
            </p>
          </div>

          {outboxEmails.length === 0 ? (
            <p className="text-xs italic text-[#96838A]">
              No emails in dev_outbox yet.
            </p>
          ) : (
            <div className="space-y-4">
              {outboxEmails.map((mail) => (
                <div
                  key={mail.id}
                  className="rounded-2xl border border-[#EFE6E0] bg-[#FCF9F7] p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-[#1F1619]">
                        To: {mail.toEmail}
                      </span>
                      <span className="mx-2 text-[#D9C8C0]">|</span>
                      <span className="text-[#9E4765] font-medium">
                        {mail.subject}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8C7A80]">
                      {mail.template} &bull;{" "}
                      {new Date(mail.createdAt).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <pre className="text-xs text-[#4A3A40] whitespace-pre-wrap font-sans bg-white p-3 rounded-xl border border-[#F3ECE7]">
                    {mail.textBody}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
