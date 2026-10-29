import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getAuthenticatedAdminEmail } from "@/auth";
import { db, ensureDbReady } from "@/db";
import { orders } from "@/db/schema";
import { env } from "@/env";
import { getPhotoStorage } from "@/lib/services/photo-storage";
import { getMailer } from "@/lib/services/mailer";
import { getWhatsAppProvider } from "@/lib/services/whatsapp";
import { getAdminNotifier } from "@/lib/services/admin-notifier";
import { handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail();
    if (!adminEmail) {
      throw new UnauthorizedError();
    }

    const body = (await req.json()) as {
      service?:
        | "database"
        | "neon_functions"
        | "drive"
        | "email"
        | "whatsapp"
        | "notifier";
    };

    if (!body.service) {
      throw new ValidationError("Missing service name to test.");
    }

    if (body.service === "database") {
      await ensureDbReady();
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders);
      const isRemote = Boolean(env.DATABASE_URL?.startsWith("postgres"));
      return NextResponse.json({
        ok: true,
        message: isRemote
          ? `Connected to Neon Lakebase Postgres (${env.NEON_BRANCH ?? "production"} branch). Orders count: ${countRow?.count ?? 0}.`
          : `Connected to local PGlite database. Orders count: ${countRow?.count ?? 0}.`,
      });
    }

    if (body.service === "neon_functions") {
      const fnUrl = env.NEON_FUNCTION_HELLO_BASE_URL;
      if (!fnUrl) {
        return NextResponse.json({
          ok: false,
          message: "NEON_FUNCTION_HELLO_BASE_URL is not configured in environment.",
        });
      }
      const res = await fetch(fnUrl, { cache: "no-store" });
      const text = await res.text();
      return NextResponse.json({
        ok: res.ok,
        message: res.ok
          ? `Neon Function responded (${res.status}): "${text.trim()}"`
          : `Neon Function returned status ${res.status}: ${text.slice(0, 120)}`,
      });
    }

    if (body.service === "drive") {
      const storage = getPhotoStorage();
      const res = await storage.testConnection();
      return NextResponse.json(res);
    }

    if (body.service === "email") {
      const mailer = getMailer();
      const res = await mailer.testConnection();
      return NextResponse.json(res);
    }

    if (body.service === "whatsapp") {
      const wa = getWhatsAppProvider();
      const res = await wa.testConnection();
      return NextResponse.json(res);
    }

    if (body.service === "notifier") {
      const notifier = getAdminNotifier();
      const res = await notifier.testConnection();
      return NextResponse.json(res);
    }

    throw new ValidationError("Unknown service.");
  } catch (error) {
    return handleApiError(error);
  }
}
