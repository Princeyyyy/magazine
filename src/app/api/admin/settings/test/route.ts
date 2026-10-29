import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getAuthenticatedAdminEmail, isSuperAdminEmail } from "@/auth";
import { db, ensureDbReady } from "@/db";
import { orders } from "@/db/schema";
import { env } from "@/env";
import { getPhotoStorage } from "@/lib/services/photo-storage";
import { getMailer } from "@/lib/services/mailer";
import { getAdminNotifier } from "@/lib/services/admin-notifier";
import { handleApiError } from "@/lib/api-response";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail();
    if (!adminEmail || !isSuperAdminEmail(adminEmail)) {
      throw new UnauthorizedError("Settings and system diagnostics are restricted to the primary administrator.");
    }

    const body = (await req.json()) as {
      service?: "database" | "drive" | "email" | "notifier";
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
