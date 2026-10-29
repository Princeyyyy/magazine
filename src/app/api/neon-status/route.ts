import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders } from "@/db/schema";
import { env } from "@/env";

export async function GET() {
  const results: {
    postgres: {
      ok: boolean;
      branch: string | null;
      ordersCount?: number;
      error?: string;
    };
    functions: {
      ok: boolean;
      url: string | null;
      status?: number;
      response?: string;
      error?: string;
    };
  } = {
    postgres: {
      ok: false,
      branch: env.NEON_BRANCH ?? null,
    },
    functions: {
      ok: false,
      url: env.NEON_FUNCTION_HELLO_BASE_URL ?? null,
    },
  };

  try {
    await ensureDbReady();
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders);
    results.postgres = {
      ok: Boolean(env.DATABASE_URL?.startsWith("postgres")),
      branch: env.NEON_BRANCH ?? null,
      ordersCount: row?.count ?? 0,
    };
  } catch (err) {
    results.postgres = {
      ok: false,
      branch: env.NEON_BRANCH ?? null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (env.NEON_FUNCTION_HELLO_BASE_URL) {
    try {
      const res = await fetch(env.NEON_FUNCTION_HELLO_BASE_URL, {
        cache: "no-store",
      });
      const text = await res.text();
      results.functions = {
        ok: res.ok,
        url: env.NEON_FUNCTION_HELLO_BASE_URL,
        status: res.status,
        response: text.trim(),
      };
    } catch (err) {
      results.functions = {
        ok: false,
        url: env.NEON_FUNCTION_HELLO_BASE_URL,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    results.functions.error = "NEON_FUNCTION_HELLO_BASE_URL is not set";
  }

  const allOk = results.postgres.ok && results.functions.ok;

  return NextResponse.json(
    {
      ok: allOk,
      services: results,
    },
    { status: allOk ? 200 : 500 }
  );
}
