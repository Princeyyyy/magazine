import { describe, it, expect } from "vitest";
import { parseEnv, getServiceModeSummary, getAdminAllowlist } from "./env";

describe("Environment Validation & Service Adapter Fallback Selection", () => {
  it("starts cleanly with zero external credentials configured and falls back to local adapters", () => {
    const config = parseEnv({});
    const summary = getServiceModeSummary(config);

    expect(summary.isDevMode).toBe(true);
    expect(summary.database).toBe("pglite_local");
    expect(summary.photoStorage).toBe("local");
    expect(summary.mailer).toBe("console");
    expect(summary.whatsapp).toBe("link");
    expect(summary.notifier.console).toBe(true);
    expect(summary.googleAuth).toBe("dev_bypass");
    expect(summary.turnstile).toBe("disabled");
  });

  it("selects live adapters when credentials are provided in environment", () => {
    const config = parseEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@ep-cool.us-east-2.aws.neon.tech/neondb",
      GOOGLE_OAUTH_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_DRIVE_REFRESH_TOKEN: "refresh-token",
      DRIVE_ROOT_FOLDER_ID: "folder-123",
      RESEND_API_KEY: "re_123456",
      MAIL_FROM: "Custom Magazine <orders@custommagazine.com>",
      ADMIN_NOTIFY_EMAIL: "editor@custommagazine.com",
      WHATSAPP_CLOUD_ENABLED: "true",
      WHATSAPP_PHONE_NUMBER_ID: "10987654321",
      WHATSAPP_ACCESS_TOKEN: "EAA_token",
      WHATSAPP_TEMPLATE_NAME: "order_status_update",
      TELEGRAM_BOT_TOKEN: "12345:ABCDEF",
      TELEGRAM_CHAT_ID: "987654",
      AUTH_GOOGLE_ID: "google-auth-id",
      AUTH_GOOGLE_SECRET: "google-auth-secret",
      TURNSTILE_SITE_KEY: "0x4AAAAAA",
      TURNSTILE_SECRET_KEY: "0x4BBBBBB",
    });

    const summary = getServiceModeSummary(config);

    expect(summary.isDevMode).toBe(false);
    expect(summary.database).toBe("postgres");
    expect(summary.photoStorage).toBe("drive");
    expect(summary.mailer).toBe("resend");
    expect(summary.whatsapp).toBe("cloud");
    expect(summary.notifier.email).toBe(true);
    expect(summary.notifier.telegram).toBe(true);
    expect(summary.googleAuth).toBe("google");
    expect(summary.turnstile).toBe("enabled");
  });

  it("parses ADMIN_EMAILS allowlist normalized to lowercase", () => {
    const config = parseEnv({
      ADMIN_EMAILS: "  Alice@Example.com, BOB@example.com ,  ",
    });
    expect(getAdminAllowlist(config)).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });
});
