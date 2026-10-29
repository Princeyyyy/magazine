import { NextRequest, NextResponse } from "next/server";
import { getAdminAllowlist } from "@/env";
import {
  signAdminSessionToken,
  verifyAdminPassword,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/auth";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import { RateLimitError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:login:${ip}`, 8, 15 * 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const allowlist = getAdminAllowlist();

    const isEmailAllowed = Boolean(email && allowlist.includes(email));
    const isPasswordValid = verifyAdminPassword(password);

    if (!isEmailAllowed || !isPasswordValid) {
      throw new ValidationError("Invalid admin email or password.");
    }

    const token = signAdminSessionToken(email, ADMIN_SESSION_MAX_AGE_SECONDS);

    const res = NextResponse.json({ ok: true, email });
    res.cookies.set("hcm_admin_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("hcm_admin_session");
  res.cookies.delete("hcm_dev_admin_email");
  return res;
}
