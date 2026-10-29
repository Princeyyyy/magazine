import { env } from "@/env";
import { ensureDbReady } from "@/db";
import { getMailer } from "./mailer";
import {
  renderAdminNewOrderEmail,
  type AdminNewOrderEmailProps,
} from "@/emails/templates";

export interface AdminNotifierAdapter {
  notifyNewOrder(payload: AdminNewOrderEmailProps): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export class StandardAdminNotifier implements AdminNotifierAdapter {
  async notifyNewOrder(payload: AdminNewOrderEmailProps): Promise<void> {
    await ensureDbReady();

    // 1. Send email alert to ADMIN_NOTIFY_EMAIL (uses active MailerAdapter: Resend or ConsoleMailer)
    if (env.ADMIN_NOTIFY_EMAIL) {
      const mailer = getMailer();
      const emailContent = renderAdminNewOrderEmail(payload);
      await mailer.sendMail({
        orderId: payload.orderId,
        to: env.ADMIN_NOTIFY_EMAIL,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        template: "admin_new_order_alert",
      });
    } else {
      console.info(
        `[AdminNotifier Console] New order ${payload.orderReference} for ${payload.herName}`
      );
    }

    // 2. Optional Telegram Bot notification
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      try {
        const text = [
          `New Custom Magazine Order!`,
          `Reference: ${payload.orderReference}`,
          `Featured Star: ${payload.herName}`,
          `Ordered By: ${payload.customerName}`,
          `Colour Theme: ${payload.colourTheme}`,
          `Photos: ${payload.photoCount}`,
          `Admin Link: ${payload.adminOrderUrl}`,
        ].join("\n");

        await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: env.TELEGRAM_CHAT_ID,
              text,
            }),
          }
        );
      } catch (err) {
        console.error("Telegram notification error:", err);
      }
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const parts: string[] = [];
    if (env.ADMIN_NOTIFY_EMAIL) {
      parts.push(`Admin Email (${env.ADMIN_NOTIFY_EMAIL})`);
    }
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`
        );
        if (res.ok) {
          parts.push("Telegram Bot verified");
        } else {
          return { ok: false, message: "Telegram Bot token failed verification." };
        }
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Telegram check failed",
        };
      }
    }
    if (parts.length === 0) {
      parts.push("Console fallback");
    }
    return {
      ok: true,
      message: `AdminNotifier active via: ${parts.join(" + ")}`,
    };
  }
}

const notifierInstance = new StandardAdminNotifier();

export function getAdminNotifier(): AdminNotifierAdapter {
  return notifierInstance;
}
