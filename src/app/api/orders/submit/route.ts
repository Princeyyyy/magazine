import { NextRequest, NextResponse } from "next/server";
import { submitOrder } from "@/lib/orders";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { env } from "@/env";

async function verifyTurnstileToken(token?: string, ip?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          ...(ip ? { remoteip: ip } : {}),
        }),
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`order:submit:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const body = (await req.json()) as {
      token?: string;
      values?: Record<string, unknown>;
      honeypot?: string;
      turnstileToken?: string;
    };

    if (body.honeypot && body.honeypot.trim().length > 0) {
      throw new ValidationError("Submission blocked.");
    }

    if (!body.token) {
      throw new ValidationError("Missing draft token.");
    }

    const turnstileOk = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!turnstileOk) {
      throw new ValidationError("Security verification failed. Please try again.");
    }

    const result = await submitOrder(body.token, body.values);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
