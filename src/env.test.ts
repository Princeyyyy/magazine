import { describe, it, expect } from "vitest";
import {
  parseEnv,
  getServiceModeSummary,
  getAdminAllowlist,
  getPrimaryAdminEmail,
  getCompletionCcEmails,
  isSuperAdminEmail,
  SUPER_ADMIN_EMAIL,
} from "./env";

describe("Environment Validation & Service Mode Detection", () => {
  it("falls back cleanly to local/mock adapters when external env vars are empty", () => {
    const parsed = parseEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: "",
      GOOGLE_OAUTH_CLIENT_ID: "",
      RESEND_API_KEY: "",
      ADMIN_NOTIFY_EMAIL: "",
    });

    const summary = getServiceModeSummary(parsed);
    expect(summary.isDevMode).toBe(true);
    expect(summary.database).toBe("pglite_local");
    expect(summary.photoStorage).toBe("local");
    expect(summary.mailer).toBe("resend" === summary.mailer ? "resend" : "console");
    expect(summary.mailer).toBe("console");
    expect(summary.notifier.email).toBe(true); // falls back to first email in ADMIN_EMAILS ("admin@example.com")
  });

  it("supports NEXT_APP_URL (for Vercel) and normalizes trailing slashes", () => {
    const parsed = parseEnv({
      NODE_ENV: "production",
      NEXT_APP_URL: "https://magazine.vercel.app/",
    });

    expect(parsed.NEXT_APP_URL).toBe("https://magazine.vercel.app");
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://magazine.vercel.app");
  });

  it("switches to live adapters when credentials are provided", () => {
    const parsed = parseEnv({
      NODE_ENV: "production",
      NEXT_APP_URL: "https://hercustommagazine.com",
      DATABASE_URL: "postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require",
      GOOGLE_OAUTH_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
      GOOGLE_DRIVE_REFRESH_TOKEN: "refresh-token",
      DRIVE_ROOT_FOLDER_ID: "folder-123",
      RESEND_API_KEY: "re_123456789",
      ADMIN_EMAILS: "princemumo80@gmail.com,barbaratrizer60@gmail.com",
      ADMIN_NOTIFY_EMAIL: "princemumo80@gmail.com",
    });

    const summary = getServiceModeSummary(parsed);
    expect(summary.isDevMode).toBe(false);
    expect(summary.database).toBe("postgres");
    expect(summary.photoStorage).toBe("drive");
    expect(summary.mailer).toBe("resend");
    expect(summary.notifier.email).toBe(true);
    expect(getPrimaryAdminEmail(parsed)).toBe("princemumo80@gmail.com");
    expect(getCompletionCcEmails(parsed)).toEqual(["barbaratrizer60@gmail.com"]);
  });

  it("parses comma-separated ADMIN_EMAILS into normalized lowercase list", () => {
    const parsed = parseEnv({
      ADMIN_EMAILS: " Alice@Example.com , BOB@example.com , ",
    });

    expect(getAdminAllowlist(parsed)).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("strictly restricts super admin privileges to princemumo80@gmail.com", () => {
    expect(SUPER_ADMIN_EMAIL).toBe("princemumo80@gmail.com");
    expect(isSuperAdminEmail("princemumo80@gmail.com")).toBe(true);
    expect(isSuperAdminEmail("  Princemumo80@Gmail.com  ")).toBe(true);
    expect(isSuperAdminEmail("barbaratrizer60@gmail.com")).toBe(false);
    expect(isSuperAdminEmail("other@admin.com")).toBe(false);
    expect(isSuperAdminEmail("")).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
  });
});
