import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import path from "path";
import * as schema from "./schema";
import { env } from "@/env";

export type AppDatabase = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  dbInstance: AppDatabase | undefined;
  postgresClient: ReturnType<typeof postgres> | undefined;
  pgliteClient: PGlite | undefined;
  initPromise: Promise<void> | undefined;
};

const BOOTSTRAP_SQL = `
DO $$ BEGIN
  CREATE TYPE "public"."order_status" AS ENUM('draft', 'submitted', 'in_progress', 'awaiting_photos', 'in_design', 'ready', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" text NOT NULL UNIQUE,
  "status" "order_status" DEFAULT 'draft' NOT NULL,
  "draft_token" text NOT NULL UNIQUE,
  "customer_name" text,
  "relationship" text,
  "her_name" text,
  "her_nickname" text,
  "birthday_date" text,
  "age_turning" integer,
  "colour_theme" text,
  "cover_headline" text,
  "email" text,
  "phone_e164" text,
  "drive_folder_id" text,
  "drive_folder_url" text,
  "consent_at" timestamp with time zone,
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "drive_folder_url" text;
UPDATE "orders" SET "drive_folder_url" = 'https://drive.google.com/drive/folders/' || "drive_folder_id" WHERE "drive_folder_id" IS NOT NULL AND "drive_folder_url" IS NULL AND "drive_folder_id" NOT LIKE 'local-%';

DROP TABLE IF EXISTS "notes" CASCADE;
DROP TABLE IF EXISTS "message_log" CASCADE;

CREATE TABLE IF NOT EXISTS "answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "question_key" text NOT NULL,
  "value" jsonb NOT NULL,
  CONSTRAINT "answers_order_id_question_key_unique" UNIQUE("order_id", "question_key")
);

CREATE TABLE IF NOT EXISTS "photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "storage_provider" text NOT NULL,
  "storage_file_id" text NOT NULL,
  "original_name" text NOT NULL,
  "mime" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "caption" text DEFAULT '' NOT NULL,
  "is_cover" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "category" text DEFAULT 'solo' NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'solo' NOT NULL;

CREATE TABLE IF NOT EXISTS "dev_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
  "to_email" text NOT NULL,
  "subject" text NOT NULL,
  "html_body" text NOT NULL,
  "text_body" text NOT NULL,
  "template" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "from_status" "order_status",
  "to_status" "order_status" NOT NULL,
  "admin_email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

function createDbConnection(): AppDatabase {
  const dbUrl = env.DATABASE_URL?.trim();

  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    // Support Neon / Supabase Transaction Pooler (PgBouncer / -pooler / port 6543) by disabling prepared statements when needed
    const isTransactionPooler =
      dbUrl.includes("-pooler") ||
      dbUrl.includes("pooler.supabase.com") ||
      dbUrl.includes(":6543");
    const conn =
      globalForDb.postgresClient ??
      postgres(dbUrl, {
        max: env.NODE_ENV === "development" ? 5 : 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: !isTransactionPooler,
        onnotice: () => {},
      });
    globalForDb.postgresClient = conn;
    return drizzlePostgres(conn, { schema });
  }

  // Fallback to embedded serverless PGlite (PostgreSQL in Node/WASM)
  const dataDir =
    env.NODE_ENV === "test"
      ? "memory://"
      : path.join(process.cwd(), ".local-db");

  const client = globalForDb.pgliteClient ?? new PGlite(dataDir);
  if (env.NODE_ENV !== "production") {
    globalForDb.pgliteClient = client;
  }

  return drizzlePglite(client, { schema });
}

export const db: AppDatabase = globalForDb.dbInstance ?? createDbConnection();

if (env.NODE_ENV !== "production") {
  globalForDb.dbInstance = db;
}

/**
 * Ensures tables exist when running in local embedded PGlite mode or fresh environments.
 * Uses a single shared Promise lock so concurrent requests never collide.
 */
export async function ensureDbReady(): Promise<void> {
  if (globalForDb.initPromise) {
    return globalForDb.initPromise;
  }

  globalForDb.initPromise = (async () => {
    if (globalForDb.postgresClient) {
      await globalForDb.postgresClient.unsafe(BOOTSTRAP_SQL);
    } else if (globalForDb.pgliteClient) {
      await globalForDb.pgliteClient.waitReady;
      await globalForDb.pgliteClient.exec(BOOTSTRAP_SQL);
    }
  })();

  return globalForDb.initPromise;
}
