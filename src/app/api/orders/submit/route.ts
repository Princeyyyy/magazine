import { NextRequest, NextResponse } from "next/server";
import { submitOrder } from "@/lib/orders";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import { RateLimitError, ValidationError } from "@/lib/errors";

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
    };

    if (body.honeypot && body.honeypot.trim().length > 0) {
      throw new ValidationError("Submission blocked.");
    }

    if (!body.token) {
      throw new ValidationError("Missing draft token.");
    }

    const result = await submitOrder(body.token, body.values);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
