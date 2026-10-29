import { Resend } from "resend";
import { env } from "@/env";
import { db, ensureDbReady } from "@/db";
import { devOutbox } from "@/db/schema";

export interface SendMailInput {
  orderId?: string;
  to: string;
  cc?: string | string[];
  subject: string;
  html: string;
  text: string;
  template: string;
}

export interface MailerAdapter {
  readonly providerName: "resend" | "console";
  sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export class ConsoleMailer implements MailerAdapter {
  readonly providerName = "console" as const;

  async sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
    const ccList = Array.isArray(input.cc)
      ? input.cc.filter(Boolean)
      : input.cc
        ? [input.cc]
        : [];
    console.info(
      `[ConsoleMailer] To: ${input.to}${ccList.length > 0 ? ` | CC: ${ccList.join(", ")}` : ""} | Subject: ${input.subject} | Template: ${input.template}`
    );

    try {
      await ensureDbReady();
      await db.insert(devOutbox).values({
        orderId: input.orderId ?? null,
        toEmail:
          ccList.length > 0
            ? `${input.to} (CC: ${ccList.join(", ")})`
            : input.to,
        subject: input.subject,
        htmlBody: input.html,
        textBody: input.text,
        template: input.template,
      });

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save to dev_outbox";
      return { ok: false, error: msg };
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    await ensureDbReady();
    return {
      ok: true,
      message: "ConsoleMailer active (emails are logged to terminal and saved in dev_outbox).",
    };
  }
}

export class ResendMailer implements MailerAdapter {
  readonly providerName = "resend" as const;

  private getClient(): Resend {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    return new Resend(env.RESEND_API_KEY);
  }

  async sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
    await ensureDbReady();
    try {
      const resend = this.getClient();
      const ccList = Array.isArray(input.cc)
        ? input.cc.filter(Boolean)
        : input.cc
          ? [input.cc]
          : [];
      const res = await resend.emails.send({
        from: env.MAIL_FROM,
        to: input.to,
        ...(ccList.length > 0 ? { cc: ccList } : {}),
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      if (res.error) {
        console.error(
          `[ResendMailer] Failed to send "${input.template}" to ${input.to}:`,
          res.error
        );
        return { ok: false, error: res.error.message };
      }

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Resend API error";
      console.error(
        `[ResendMailer] Exception sending "${input.template}" to ${input.to}:`,
        msg
      );
      return { ok: false, error: msg };
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const resend = this.getClient();
      const domains = await resend.domains.list();
      if (domains.error) {
        if (
          domains.error.message
            .toLowerCase()
            .includes("restricted to only send")
        ) {
          return {
            ok: true,
            message: `Resend sending-only API key active (sending from ${env.MAIL_FROM}).`,
          };
        }
        return { ok: false, message: domains.error.message };
      }

      const domainList = domains.data?.data ?? [];
      const senderDomainMatch = /@([a-zA-Z0-9.-]+)/.exec(env.MAIL_FROM);
      const senderDomain = senderDomainMatch?.[1]?.toLowerCase();

      if (senderDomain && senderDomain !== "resend.dev") {
        const matched = domainList.find(
          (d) => d.name.toLowerCase() === senderDomain
        );
        if (!matched) {
          return {
            ok: false,
            message: `Domain "${senderDomain}" in MAIL_FROM is not registered on this Resend account.`,
          };
        }
        if (matched.status !== "verified") {
          return {
            ok: false,
            message: `Domain "${senderDomain}" is present on Resend but status is "${matched.status}".`,
          };
        }
      }

      return {
        ok: true,
        message: `Resend connected & verified (sending from ${env.MAIL_FROM}).`,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Resend test failed",
      };
    }
  }
}

const consoleMailerInstance = new ConsoleMailer();
const resendMailerInstance = new ResendMailer();

export function getMailer(): MailerAdapter {
  return env.RESEND_API_KEY ? resendMailerInstance : consoleMailerInstance;
}
