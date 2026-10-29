import { NextRequest, NextResponse } from "next/server";
import { getDraftByToken, saveDraftAnswers } from "@/lib/orders";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { getServiceModeSummary } from "@/env";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ draft: null });
    }
    const draft = await getDraftByToken(token);
    return NextResponse.json({ draft });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`draft:load:${ip}`, 60, 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      honeypot?: string;
    };

    if (body.honeypot && body.honeypot.trim().length > 0) {
      throw new ValidationError("Invalid request.");
    }

    // Only load if an existing token was supplied; never create an empty phantom draft on page load
    const draft = body.token?.trim()
      ? await getDraftByToken(body.token.trim())
      : null;
    const { isDevMode } = getServiceModeSummary();
    return NextResponse.json({ draft, isDevMode });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      token?: string;
      values?: Record<string, unknown>;
      honeypot?: string;
    };

    if (body.honeypot && body.honeypot.trim().length > 0) {
      throw new ValidationError("Invalid request.");
    }

    if (!body.values) {
      throw new ValidationError("Values are required.");
    }

    // saveDraftAnswers will lazily create the draft order on the first save containing real data
    const result = await saveDraftAnswers(body.token, body.values);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
