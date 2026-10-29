import { env } from "@/env";

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
    const customerDigits = cleanPhoneDigits(input.toPhoneE164);
    const message = `Hi ${input.customerName}, here is an update on ${input.herName}'s custom magazine (Ref: ${input.orderReference}): Status is now "${input.statusLabel}".`;
    const waLink = `https://wa.me/${customerDigits}?text=${encodeURIComponent(message)}`;

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
    const waLink = this.buildAdminToCustomerWaLink(
      input.toPhoneE164,
      input.orderReference,
      input.herName,
      input.customerName
    );
    return { ok: true, provider: "console", waLink };
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message: "ConsoleWhatsApp mock active.",
    };
  }
}

const linkProviderInstance = new WhatsAppLinkProvider();
const consoleProviderInstance = new ConsoleWhatsApp();

export function getWhatsAppProvider(): WhatsAppAdapter {
  if (env.WHATSAPP_NUMBER) {
    return linkProviderInstance;
  }
  return consoleProviderInstance;
}
