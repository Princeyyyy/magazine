"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Play } from "lucide-react";

interface ServiceModeSummary {
  isDevMode: boolean;
  database: "postgres" | "pglite_local";
  neonBranch?: string | null;
  neonFunctionUrl?: string | null;
  neonFunctions?: "live" | "unconfigured";
  photoStorage: "drive" | "local";
  mailer: "resend" | "console";
  whatsapp?: "cloud" | "link" | "console";
  notifier: {
    email: boolean;
    telegram: boolean;
    console: boolean;
  };
  adminAuth?: "password" | "default_password";
  googleAuth: "google" | "dev_bypass";
  turnstile: "enabled" | "disabled";
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
    service:
      | "database"
      | "neon_functions"
      | "drive"
      | "email"
      | "whatsapp"
      | "notifier"
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
    id:
      | "database"
      | "neon_functions"
      | "drive"
      | "email"
      | "whatsapp"
      | "notifier";
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
        "Stores customer orders, questionnaire answers, photo metadata, admin notes, and status history.",
    },
    {
      id: "neon_functions",
      title: "Neon Functions",
      activeAdapter:
        modeSummary.neonFunctions === "live"
          ? `Hello World (${modeSummary.neonFunctionUrl})`
          : "Unconfigured (NEON_FUNCTION_HELLO_BASE_URL)",
      isLive: modeSummary.neonFunctions === "live",
      description:
        "Serverless compute function deployed on Neon and wired via NEON_FUNCTION_HELLO_BASE_URL.",
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
        "Handles resumable chunked photo uploads, per-order folders, and private authenticated previews.",
    },
    {
      id: "email",
      title: "Mailer Adapter (Resend)",
      activeAdapter:
        modeSummary.mailer === "resend"
          ? "ResendMailer (Live Email — works without a domain via onboarding@resend.dev)"
          : "ConsoleMailer (Terminal + dev_outbox)",
      isLive: modeSummary.mailer === "resend",
      description:
        "Sends customer order confirmations, resume-order links, and custom emails. Works immediately on Resend's free tier using onboarding@resend.dev (no custom domain needed).",
    },
    {
      id: "notifier",
      title: "Admin Notifier Adapter",
      activeAdapter: [
        modeSummary.notifier.email ? "Admin Email" : null,
        modeSummary.notifier.telegram ? "Telegram Bot" : null,
        modeSummary.notifier.console ? "Console Fallback" : null,
      ]
        .filter(Boolean)
        .join(" + "),
      isLive: modeSummary.notifier.email || modeSummary.notifier.telegram,
      description:
        "Alerts you immediately whenever a customer submits a new magazine order.",
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
              ? "Supabase / Neon PostgreSQL (DATABASE_URL)"
              : "Embedded PGlite PostgreSQL (./.local-db)"}
          </strong>
        </div>
        <div>
          <span className="text-[#7A686E] block mb-1">Admin Authentication</span>
          <strong className="text-[#1F1619]">
            ADMIN_EMAILS + ADMIN_PASSWORD
          </strong>
        </div>
        <div>
          <span className="text-[#7A686E] block mb-1">Cloudflare Turnstile</span>
          <strong className="text-[#1F1619]">
            {modeSummary.turnstile === "enabled"
              ? "Enabled"
              : "Disabled (Honeypot + Rate Limiting Active)"}
          </strong>
        </div>
      </div>

      {/* ConsoleMailer Dev Outbox Table */}
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
            No emails in dev_outbox yet. Submit an order or send a resume link to see captured emails here.
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
    </div>
  );
}
