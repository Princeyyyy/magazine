import { NextRequest, NextResponse } from "next/server";
import { getDraftByToken, saveDraftAnswers } from "@/lib/orders";
import { getMailer } from "@/lib/services/mailer";
import { getAdminNotifier } from "@/lib/services/admin-notifier";
import { renderResumeOrderEmail } from "@/emails/templates";
import { env } from "@/env";
import { handleApiError, getClientIp } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/security";
import {
  AppError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@/lib/errors";
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

    const parsedEmail = emailSchema.safeParse(body.email);
    if (!parsedEmail.success) {
      throw new ValidationError("Please enter a valid email address.");
    }

    // Save or lazily create the draft order containing their email and partial answers
    const valuesToSave = {
      ...(body.values ?? {}),
      email: parsedEmail.data,
    };

    const saveResult = await saveDraftAnswers(body.token, valuesToSave);
    const activeToken = saveResult.draftToken || body.token;

    if (!activeToken) {
      throw new ValidationError("Could not initialize your magazine draft.");
    }

    const draft = await getDraftByToken(activeToken);
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
    const mailResult = await mailer.sendMail({
      orderId: draft.orderId,
      to: parsedEmail.data,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      template: "customer_resume_link",
    });

    if (!mailResult.ok) {
      void getAdminNotifier().notifyCriticalIssue({
        context: "Customer Resume Email Delivery Failed",
        summary: mailResult.error || "Resend rejected resume link email.",
        orderReference: draft.reference,
        orderId: draft.orderId,
      });
      throw new AppError(
        "EMAIL_SEND_FAILED",
        "Could not send the email right now. You can copy your private resume link directly above.",
        502
      );
    }

    return NextResponse.json({
      ok: true,
      draftToken: draft.draftToken,
      reference: draft.reference,
      resumeUrl,
      message: "I have sent your private resume link to your email.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
