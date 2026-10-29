import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: optionalUrl.default("http://localhost:3000"),

  // Database (Neon or Supabase PostgreSQL in production; if empty locally, uses embedded PGlite at ./.local-db)
  DATABASE_URL: optionalString,
  DATABASE_URL_UNPOOLED: optionalString,
  NEON_BRANCH: optionalString,
  NEON_FUNCTION_HELLO_BASE_URL: optionalUrl,

  // Admin Auth (ADMIN_EMAILS + ADMIN_PASSWORD)
  AUTH_SECRET: optionalString.default("dev-secret-change-in-production-at-least-32-chars"),
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,
  ADMIN_EMAILS: optionalString.default("admin@example.com"),
  ADMIN_PASSWORD: optionalString.default("admin123"),
  ADMIN_NOTIFY_EMAIL: optionalEmail,

  // Google Drive Photo Storage
  GOOGLE_OAUTH_CLIENT_ID: optionalString,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString,
  GOOGLE_DRIVE_REFRESH_TOKEN: optionalString,
  DRIVE_ROOT_FOLDER_ID: optionalString,

  // Email (Resend)
  // Without a custom domain, Resend allows sending from "Custom Magazine <onboarding@resend.dev>"
  RESEND_API_KEY: optionalString,
  MAIL_FROM: optionalString.default("Custom Magazine <onboarding@resend.dev>"),

  // WhatsApp
  WHATSAPP_NUMBER: optionalString.default("254700000000"),
  WHATSAPP_CLOUD_ENABLED: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true";
      return false;
    }, z.boolean())
    .default(false),
  WHATSAPP_PHONE_NUMBER_ID: optionalString,
  WHATSAPP_ACCESS_TOKEN: optionalString,
  WHATSAPP_TEMPLATE_NAME: optionalString.default("order_status_update"),

  // Telegram Notifier
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,

  // Cloudflare Turnstile
  TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
});

export type EnvConfig = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined> = process.env): EnvConfig {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return parsed.data;
}

export const env = parseEnv(process.env);

export function getAdminAllowlist(currentEnv: EnvConfig = env): string[] {
  return currentEnv.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getServiceModeSummary(currentEnv: EnvConfig = env) {
  const isDatabaseRemote = Boolean(
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

  const isMailerLive = Boolean(currentEnv.RESEND_API_KEY && currentEnv.MAIL_FROM);

  const isWhatsAppCloudLive = Boolean(
    currentEnv.WHATSAPP_CLOUD_ENABLED &&
      currentEnv.WHATSAPP_PHONE_NUMBER_ID &&
      currentEnv.WHATSAPP_ACCESS_TOKEN &&
      currentEnv.WHATSAPP_TEMPLATE_NAME
  );

  const isTelegramLive = Boolean(
    currentEnv.TELEGRAM_BOT_TOKEN && currentEnv.TELEGRAM_CHAT_ID
  );

  const isGoogleAuthLive = Boolean(
    currentEnv.AUTH_GOOGLE_ID && currentEnv.AUTH_GOOGLE_SECRET
  );

  const isAdminPasswordConfigured = Boolean(
    currentEnv.ADMIN_PASSWORD && currentEnv.ADMIN_PASSWORD !== "admin123"
  );

  const isTurnstileLive = Boolean(
    currentEnv.TURNSTILE_SITE_KEY && currentEnv.TURNSTILE_SECRET_KEY
  );

  const isNeonFunctionLive = Boolean(currentEnv.NEON_FUNCTION_HELLO_BASE_URL);

  const isDevMode = !isDriveLive || !isMailerLive || !isDatabaseRemote;

  return {
    isDevMode,
    database: isDatabaseRemote ? ("postgres" as const) : ("pglite_local" as const),
    neonBranch: currentEnv.NEON_BRANCH ?? null,
    neonFunctionUrl: currentEnv.NEON_FUNCTION_HELLO_BASE_URL ?? null,
    neonFunctions: isNeonFunctionLive ? ("live" as const) : ("unconfigured" as const),
    photoStorage: isDriveLive ? ("drive" as const) : ("local" as const),
    mailer: isMailerLive ? ("resend" as const) : ("console" as const),
    whatsapp: isWhatsAppCloudLive
      ? ("cloud" as const)
      : currentEnv.WHATSAPP_NUMBER
        ? ("link" as const)
        : ("console" as const),
    notifier: {
      email: Boolean(currentEnv.ADMIN_NOTIFY_EMAIL && isMailerLive),
      telegram: isTelegramLive,
      console: !currentEnv.ADMIN_NOTIFY_EMAIL && !isTelegramLive,
    },
    adminAuth: isAdminPasswordConfigured
      ? ("password" as const)
      : ("default_password" as const),
    googleAuth: isGoogleAuthLive ? ("google" as const) : ("dev_bypass" as const),
    turnstile: isTurnstileLive ? ("enabled" as const) : ("disabled" as const),
  };
}
