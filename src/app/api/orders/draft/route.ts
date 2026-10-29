import { NextRequest, NextResponse } from "next/server";
import {
  createOrLoadDraft,
  getDraftByToken,
  saveDraftAnswers,
} from "@/lib/orders";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import { RateLimitError, ValidationError } from "@/lib/errors";
import { getServiceModeSummary } from "@/env";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      throw new ValidationError("Missing draft token.");
    }
    const draft = await getDraftByToken(token);
    if (!draft) {
      return NextResponse.json({ draft: null }, { status: 404 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`draft:create:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      honeypot?: string;
    };

    // Honeypot check: silently reject bots
    if (body.honeypot && body.honeypot.trim().length > 0) {
      throw new ValidationError("Invalid request.");
    }

    const draft = await createOrLoadDraft(body.token);
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

    if (!body.token || !body.values) {
      throw new ValidationError("Draft token and values are required.");
    }

    const result = await saveDraftAnswers(body.token, body.values);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
