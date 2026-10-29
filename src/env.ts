import { z } from "zod";

/**
 * Helper for optional string env vars where an empty string `""` in `.env`
 * should be treated as `undefined` so local/mock adapters activate cleanly.
 */
const optionalString = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.string().trim().min(1).optional()
);

const optionalUrl = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.string().trim().url().optional()
);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Supports both NEXT_APP_URL (Vercel server env) and NEXT_PUBLIC_APP_URL
  NEXT_APP_URL: optionalUrl,
  NEXT_PUBLIC_APP_URL: optionalUrl,

  // Database (Neon Lakebase Postgres or local PGlite when omitted)
  DATABASE_URL: optionalString,
  DATABASE_URL_UNPOOLED: optionalString,
  NEON_BRANCH: optionalString,

  // Admin Auth
  AUTH_SECRET: z
    .preprocess(
      (val) =>
        typeof val === "string" && val.trim() !== ""
          ? val.trim()
          : "dev-secret-change-in-production-at-least-32-chars",
      z.string().min(16)
    )
    .default("dev-secret-change-in-production-at-least-32-chars"),
  ADMIN_EMAILS: z
    .preprocess(
      (val) =>
        typeof val === "string" && val.trim() !== ""
          ? val.trim()
          : "admin@example.com",
      z.string()
    )
    .default("admin@example.com"),
  ADMIN_PASSWORD: z
    .preprocess(
      (val) =>
        typeof val === "string" && val.trim() !== "" ? val.trim() : "admin123",
      z.string().min(1)
    )
    .default("admin123"),
  ADMIN_NOTIFY_EMAIL: optionalString,

  // Google Drive Photo Storage
  GOOGLE_OAUTH_CLIENT_ID: optionalString,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString,
  GOOGLE_DRIVE_REFRESH_TOKEN: optionalString,
  DRIVE_ROOT_FOLDER_ID: optionalString,

  // Email (Resend)
  RESEND_API_KEY: optionalString,
  MAIL_FROM: z
    .preprocess(
      (val) =>
        typeof val === "string" && val.trim() !== ""
          ? val.trim()
          : "Custom Magazine <noreply@cleanplay.app>",
      z.string()
    )
    .default("Custom Magazine <noreply@cleanplay.app>"),
});

export type Env = z.infer<typeof envSchema> & {
  NEXT_PUBLIC_APP_URL: string;
};

export function parseEnv(
  rawEnv: Record<string, string | undefined> = process.env
): Env {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment configuration.");
  }

  const resolvedAppUrl = (
    parsed.data.NEXT_APP_URL ||
    parsed.data.NEXT_PUBLIC_APP_URL ||
    (rawEnv.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${rawEnv.VERCEL_PROJECT_PRODUCTION_URL}`
      : rawEnv.VERCEL_URL
        ? `https://${rawEnv.VERCEL_URL}`
        : "http://localhost:3000")
  ).replace(/\/+$/, "");

  return {
    ...parsed.data,
    NEXT_APP_URL: resolvedAppUrl,
    NEXT_PUBLIC_APP_URL: resolvedAppUrl,
  };
}

export const env = parseEnv(process.env);

/**
 * Returns parsed list of allowed admin emails in lowercase.
 */
export function getAdminAllowlist(currentEnv: Env = env): string[] {
  return currentEnv.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns the primary admin email for critical alerts and order completion primary recipient.
 * Defaults to ADMIN_NOTIFY_EMAIL (e.g., princemumo80@gmail.com) or the first email in ADMIN_EMAILS.
 */
export function getPrimaryAdminEmail(currentEnv: Env = env): string | null {
  if (currentEnv.ADMIN_NOTIFY_EMAIL) {
    return currentEnv.ADMIN_NOTIFY_EMAIL.trim().toLowerCase();
  }
  const allowlist = getAdminAllowlist(currentEnv);
  return allowlist[0] ?? null;
}

/**
 * Returns all additional admin emails from ADMIN_EMAILS (excluding the primary admin email)
 * so order completion emails automatically CC all other configured admins.
 */
export function getCompletionCcEmails(currentEnv: Env = env): string[] {
  const primary = getPrimaryAdminEmail(currentEnv);
  return getAdminAllowlist(currentEnv).filter((email) => email !== primary);
}

/**
 * Inspects which adapters are running in Live mode vs Local/Mock mode.
 */
export function getServiceModeSummary(currentEnv: Env = env) {
  const isDatabasePostgres = Boolean(
    currentEnv.DATABASE_URL &&
      (currentEnv.DATABASE_URL.startsWith("postgres://") ||
        currentEnv.DATABASE_URL.startsWith("postgresql://"))
  );

  const isDriveLive = Boolean(
    currentEnv.GOOGLE_OAUTH_CLIENT_ID &&
      currentEnv.GOOGLE_OAUTH_CLIENT_SECRET &&
      currentEnv.GOOGLE_DRIVE_REFRESH_TOKEN &&
      currentEnv.DRIVE_ROOT_FOLDER_ID
  );

  const isResendLive = Boolean(currentEnv.RESEND_API_KEY);

  const isAdminPasswordCustom = Boolean(
    currentEnv.ADMIN_PASSWORD && currentEnv.ADMIN_PASSWORD !== "admin123"
  );

  const isDevMode = !isDatabasePostgres && !isDriveLive && !isResendLive;

  return {
    isDevMode,
    appUrl: currentEnv.NEXT_PUBLIC_APP_URL,
    database: isDatabasePostgres
      ? ("postgres" as const)
      : ("pglite_local" as const),
    neonBranch: currentEnv.NEON_BRANCH ?? (isDatabasePostgres ? "main" : null),
    photoStorage: isDriveLive ? ("drive" as const) : ("local" as const),
    mailer: isResendLive ? ("resend" as const) : ("console" as const),
    notifier: {
      email: Boolean(getPrimaryAdminEmail(currentEnv)),
      console: !getPrimaryAdminEmail(currentEnv),
    },
    adminAuth: isAdminPasswordCustom
      ? ("password" as const)
      : ("default_password" as const),
  };
}
