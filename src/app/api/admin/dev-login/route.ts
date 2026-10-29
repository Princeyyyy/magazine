import { NextRequest, NextResponse } from "next/server";
import { getAdminAllowlist } from "@/env";
import { signAdminSessionToken, verifyAdminPassword } from "@/auth";
import { handleApiError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const allowlist = getAdminAllowlist();

    if (!email || !allowlist.includes(email)) {
      throw new ValidationError(
        "This email is not authorized in ADMIN_EMAILS."
      );
    }

    if (!verifyAdminPassword(password)) {
      throw new ValidationError("Incorrect admin password.");
    }

    const token = signAdminSessionToken(email);

    const res = NextResponse.json({ ok: true, email });
    res.cookies.set("hcm_admin_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14 days
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
