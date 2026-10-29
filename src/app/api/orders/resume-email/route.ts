import { NextRequest, NextResponse } from "next/server";
import { getDraftByToken, saveDraftAnswers } from "@/lib/orders";
import { getMailer } from "@/lib/services/mailer";
import { renderResumeOrderEmail } from "@/emails/templates";
import { env } from "@/env";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import { NotFoundError, RateLimitError, ValidationError } from "@/lib/errors";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email address.");

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`draft:resume-email:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      throw new RateLimitError(rate.retryAfterMs);
    }

    const body = (await req.json()) as {
      token?: string;
      email?: string;
      values?: Record<string, unknown>;
    };

    if (!body.token) {
      throw new ValidationError("Draft token is required.");
    }

    const parsedEmail = emailSchema.safeParse(body.email);
    if (!parsedEmail.success) {
      throw new ValidationError("Please enter a valid email address.");
    }

    if (body.values) {
      await saveDraftAnswers(body.token, {
        ...body.values,
        email: parsedEmail.data,
      });
    } else {
      await saveDraftAnswers(body.token, { email: parsedEmail.data });
    }

    const draft = await getDraftByToken(body.token);
    if (!draft) {
      throw new NotFoundError("Order draft");
    }

    const resumeUrl = `${env.NEXT_PUBLIC_APP_URL}/?resume=${encodeURIComponent(
      draft.draftToken
    )}`;

    const emailContent = renderResumeOrderEmail({
      customerName: String(draft.values["customer_name"] || ""),
      herName: String(draft.values["her_name"] || ""),
      resumeUrl,
    });

    const mailer = getMailer();
    await mailer.sendMail({
      orderId: draft.orderId,
      to: parsedEmail.data,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      template: "customer_resume_link",
    });

    return NextResponse.json({
      ok: true,
      resumeUrl,
      message: "I have sent your private resume link to your email.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
