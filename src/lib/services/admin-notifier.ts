import {
  env,
  getPrimaryAdminEmail,
  getCompletionCcEmails,
} from "@/env";
import { ensureDbReady } from "@/db";
import { checkRateLimit } from "@/lib/security";
import { getMailer } from "./mailer";
import {
  renderAdminNewOrderEmail,
  renderAdminCriticalAlertEmail,
  type AdminNewOrderEmailProps,
  type AdminCriticalAlertEmailProps,
} from "@/emails/templates";

export interface AdminNotifierAdapter {
  notifyNewOrder(payload: AdminNewOrderEmailProps): Promise<void>;
  notifyCriticalIssue(payload: AdminCriticalAlertEmailProps): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

export class StandardAdminNotifier implements AdminNotifierAdapter {
  async notifyNewOrder(payload: AdminNewOrderEmailProps): Promise<void> {
    await ensureDbReady();

    // 1. Order completion email: send to primary admin (princemumo80@gmail.com)
    // and CC all other emails configured in ADMIN_EMAILS
    const primaryAdmin = getPrimaryAdminEmail();
    const ccAdmins = getCompletionCcEmails();

    if (primaryAdmin) {
      const mailer = getMailer();
      const emailContent = renderAdminNewOrderEmail(payload);
      await mailer.sendMail({
        orderId: payload.orderId,
        to: primaryAdmin,
        ...(ccAdmins.length > 0 ? { cc: ccAdmins } : {}),
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

  /**
   * Sends serious operational or system issue alerts ONLY to the primary admin
   * (princemumo80@gmail.com) without CCing other addresses.
   */
  async notifyCriticalIssue(
    payload: AdminCriticalAlertEmailProps
  ): Promise<void> {
    try {
      const rateKey = `alert:${payload.context}:${payload.summary.slice(0, 40)}`;
      const rate = checkRateLimit(rateKey, 1, 5 * 60_000);
      if (!rate.allowed) return;

      const primaryAdmin = getPrimaryAdminEmail();
      if (!primaryAdmin) return;

      const mailer = getMailer();
      const emailContent = renderAdminCriticalAlertEmail(payload);
      await mailer.sendMail({
        orderId: payload.orderId,
        to: primaryAdmin,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        template: "admin_critical_issue_alert",
      });
    } catch (err) {
      console.error("Failed to dispatch critical issue alert email:", err);
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const parts: string[] = [];
    const primaryAdmin = getPrimaryAdminEmail();
    const ccAdmins = getCompletionCcEmails();
    if (primaryAdmin) {
      parts.push(
        `Completion To: ${primaryAdmin}${ccAdmins.length > 0 ? ` (CC: ${ccAdmins.join(", ")})` : ""} | Alerts Only To: ${primaryAdmin}`
      );
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
