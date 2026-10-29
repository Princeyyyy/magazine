import { Resend } from "resend";
import { env } from "@/env";
import { db, ensureDbReady } from "@/db";
import { devOutbox, messageLog } from "@/db/schema";

export interface SendMailInput {
  orderId?: string;
  to: string;
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
    console.info(
      `[ConsoleMailer] To: ${input.to} | Subject: ${input.subject} | Template: ${input.template}`
    );

    try {
      await ensureDbReady();
      await db.insert(devOutbox).values({
        orderId: input.orderId ?? null,
        toEmail: input.to,
        subject: input.subject,
        htmlBody: input.html,
        textBody: input.text,
        template: input.template,
      });

      if (input.orderId) {
        await db.insert(messageLog).values({
          orderId: input.orderId,
          channel: "email",
          template: input.template,
          status: "sent (dev_outbox)",
          error: null,
        });
      }
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
      const res = await resend.emails.send({
        from: env.MAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      if (res.error) {
        if (input.orderId) {
          await db.insert(messageLog).values({
            orderId: input.orderId,
            channel: "email",
            template: input.template,
            status: "failed",
            error: res.error.message,
          });
        }
        return { ok: false, error: res.error.message };
      }

      if (input.orderId) {
        await db.insert(messageLog).values({
          orderId: input.orderId,
          channel: "email",
          template: input.template,
          status: "sent",
          error: null,
        });
      }

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Resend API error";
      if (input.orderId) {
        await db.insert(messageLog).values({
          orderId: input.orderId,
          channel: "email",
          template: input.template,
          status: "failed",
          error: msg,
        });
      }
      return { ok: false, error: msg };
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const resend = this.getClient();
      const domains = await resend.domains.list();
      if (domains.error) {
        return { ok: false, message: domains.error.message };
      }
      return {
        ok: true,
        message: `Resend connected (sending from ${env.MAIL_FROM}).`,
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
