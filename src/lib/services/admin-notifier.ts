import {
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

    // Order completion email: send to primary admin (princemumo80@gmail.com)
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
    const primaryAdmin = getPrimaryAdminEmail();
    const ccAdmins = getCompletionCcEmails();
    if (primaryAdmin) {
      return {
        ok: true,
        message: `AdminNotifier active — Completion To: ${primaryAdmin}${ccAdmins.length > 0 ? ` (CC: ${ccAdmins.join(", ")})` : ""} | Alerts Only To: ${primaryAdmin}`,
      };
    }
    return {
      ok: true,
      message: "AdminNotifier active via Console fallback.",
    };
  }
}

const notifierInstance = new StandardAdminNotifier();

export function getAdminNotifier(): AdminNotifierAdapter {
  return notifierInstance;
}
