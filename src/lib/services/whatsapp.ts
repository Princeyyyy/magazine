import { env } from "@/env";
import { db, ensureDbReady } from "@/db";
import { messageLog } from "@/db/schema";

export interface SendWhatsAppUpdateInput {
  orderId: string;
  orderReference: string;
  herName: string;
  customerName: string;
  toPhoneE164: string;
  statusLabel: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  provider: "link" | "cloud" | "console";
  waLink?: string;
  error?: string;
}

export interface WhatsAppAdapter {
  readonly providerName: "link" | "cloud" | "console";
  buildCustomerWaLink(orderReference: string, herName?: string): string;
  buildAdminToCustomerWaLink(
    toPhoneE164: string,
    orderReference: string,
    herName: string,
    customerName: string
  ): string;
  sendOrderUpdate(input: SendWhatsAppUpdateInput): Promise<WhatsAppSendResult>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}

function cleanPhoneDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

// ============================================================================
// 1. WHATSAPP LINK PROVIDER (default, free wa.me links)
// ============================================================================
export class WhatsAppLinkProvider implements WhatsAppAdapter {
  readonly providerName = "link" as const;

  buildCustomerWaLink(orderReference: string, herName?: string): string {
    const businessDigits = cleanPhoneDigits(env.WHATSAPP_NUMBER || "254700000000");
    const starText = herName ? ` for ${herName}` : "";
    const message = `Hi Custom Magazine! I have just submitted my order${starText}. My order reference is ${orderReference}.`;
    return `https://wa.me/${businessDigits}?text=${encodeURIComponent(message)}`;
  }

  buildAdminToCustomerWaLink(
    toPhoneE164: string,
    orderReference: string,
    herName: string,
    customerName: string
  ): string {
    const customerDigits = cleanPhoneDigits(toPhoneE164);
    const message = `Hi ${customerName}! Quick update from Custom Magazine regarding ${herName}'s magazine (Order ${orderReference}): `;
    return `https://wa.me/${customerDigits}?text=${encodeURIComponent(message)}`;
  }

  async sendOrderUpdate(input: SendWhatsAppUpdateInput): Promise<WhatsAppSendResult> {
    await ensureDbReady();
    const customerDigits = cleanPhoneDigits(input.toPhoneE164);
    const message = `Hi ${input.customerName}, here is an update on ${input.herName}'s custom magazine (Ref: ${input.orderReference}): Status is now "${input.statusLabel}".`;
    const waLink = `https://wa.me/${customerDigits}?text=${encodeURIComponent(message)}`;

    await db.insert(messageLog).values({
      orderId: input.orderId,
      channel: "whatsapp",
      template: `wa_link:${input.statusLabel}`,
      status: "link_generated",
      error: null,
    });

    return {
      ok: true,
      provider: "link",
      waLink,
    };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const digits = cleanPhoneDigits(env.WHATSAPP_NUMBER);
    if (!digits) {
      return { ok: false, message: "WHATSAPP_NUMBER is empty." };
    }
    return {
      ok: true,
      message: `WhatsAppLinkProvider active (wa.me/+${digits}).`,
    };
  }
}

// ============================================================================
// 2. META WHATSAPP CLOUD API PROVIDER (behind WHATSAPP_CLOUD_ENABLED)
// ============================================================================
export class WhatsAppCloudProvider implements WhatsAppAdapter {
  readonly providerName = "cloud" as const;
  private readonly linkHelper = new WhatsAppLinkProvider();

  buildCustomerWaLink(orderReference: string, herName?: string): string {
    return this.linkHelper.buildCustomerWaLink(orderReference, herName);
  }

  buildAdminToCustomerWaLink(
    toPhoneE164: string,
    orderReference: string,
    herName: string,
    customerName: string
  ): string {
    return this.linkHelper.buildAdminToCustomerWaLink(
      toPhoneE164,
      orderReference,
      herName,
      customerName
    );
  }

  async sendOrderUpdate(input: SendWhatsAppUpdateInput): Promise<WhatsAppSendResult> {
    await ensureDbReady();
    const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
    const token = env.WHATSAPP_ACCESS_TOKEN;
    const templateName = env.WHATSAPP_TEMPLATE_NAME;

    if (!phoneId || !token) {
      const errMsg = "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN.";
      await db.insert(messageLog).values({
        orderId: input.orderId,
        channel: "whatsapp",
        template: templateName,
        status: "failed",
        error: errMsg,
      });
      return { ok: false, provider: "cloud", error: errMsg };
    }

    try {
      const recipientDigits = cleanPhoneDigits(input.toPhoneE164);
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipientDigits,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: input.customerName },
                    { type: "text", text: input.herName },
                    { type: "text", text: input.orderReference },
                    { type: "text", text: input.statusLabel },
                  ],
                },
              ],
            },
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.text();
        await db.insert(messageLog).values({
          orderId: input.orderId,
          channel: "whatsapp",
          template: templateName,
          status: "failed",
          error: errBody,
        });
        return { ok: false, provider: "cloud", error: errBody };
      }

      await db.insert(messageLog).values({
        orderId: input.orderId,
        channel: "whatsapp",
        template: templateName,
        status: "sent",
        error: null,
      });

      return { ok: true, provider: "cloud" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "WhatsApp Cloud API error";
      await db.insert(messageLog).values({
        orderId: input.orderId,
        channel: "whatsapp",
        template: templateName,
        status: "failed",
        error: msg,
      });
      return { ok: false, provider: "cloud", error: msg };
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      return {
        ok: false,
        message: "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN.",
      };
    }
    return {
      ok: true,
      message: `WhatsAppCloudProvider configured with template "${env.WHATSAPP_TEMPLATE_NAME}".`,
    };
  }
}

// ============================================================================
// 3. CONSOLE WHATSAPP MOCK
// ============================================================================
export class ConsoleWhatsApp implements WhatsAppAdapter {
  readonly providerName = "console" as const;

  buildCustomerWaLink(orderReference: string, herName?: string): string {
    const starText = herName ? ` for ${herName}` : "";
    const message = `Hi Custom Magazine! Order reference: ${orderReference}${starText}.`;
    return `https://wa.me/254700000000?text=${encodeURIComponent(message)}`;
  }

  buildAdminToCustomerWaLink(
    toPhoneE164: string,
    orderReference: string,
    herName: string,
    customerName: string
  ): string {
    const digits = cleanPhoneDigits(toPhoneE164);
    const message = `Hi ${customerName}, regarding ${herName}'s magazine (${orderReference}): `;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  async sendOrderUpdate(input: SendWhatsAppUpdateInput): Promise<WhatsAppSendResult> {
    await ensureDbReady();
    console.info(
      `[ConsoleWhatsApp] To: ${input.toPhoneE164} | Ref: ${input.orderReference} | Status: ${input.statusLabel}`
    );

    const waLink = this.buildAdminToCustomerWaLink(
      input.toPhoneE164,
      input.orderReference,
      input.herName,
      input.customerName
    );

    await db.insert(messageLog).values({
      orderId: input.orderId,
      channel: "whatsapp",
      template: `console_mock:${input.statusLabel}`,
      status: "logged",
      error: null,
    });

    return { ok: true, provider: "console", waLink };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message: "ConsoleWhatsApp mock active (logs attempts to terminal and message_log).",
    };
  }
}

const linkProviderInstance = new WhatsAppLinkProvider();
const cloudProviderInstance = new WhatsAppCloudProvider();
const consoleProviderInstance = new ConsoleWhatsApp();

export function getWhatsAppProvider(): WhatsAppAdapter {
  if (
    env.WHATSAPP_CLOUD_ENABLED &&
    env.WHATSAPP_PHONE_NUMBER_ID &&
    env.WHATSAPP_ACCESS_TOKEN
  ) {
    return cloudProviderInstance;
  }
  if (env.WHATSAPP_NUMBER) {
    return linkProviderInstance;
  }
  return consoleProviderInstance;
}
