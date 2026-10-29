import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders, statusHistory, orderStatusEnum, type OrderStatus } from "@/db/schema";
import { getAuthenticatedAdminEmail } from "@/auth";
import { getMailer } from "@/lib/services/mailer";
import { handleApiError } from "@/lib/api-response";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail();
    if (!adminEmail) {
      throw new UnauthorizedError();
    }

    const { orderId } = await context.params;
    const body = (await req.json()) as {
      action?: "update_status" | "send_email";
      status?: OrderStatus;
      emailSubject?: string;
      emailMessage?: string;
    };

    await ensureDbReady();
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    if (body.action === "update_status") {
      if (!body.status || !orderStatusEnum.enumValues.includes(body.status)) {
        throw new ValidationError("Invalid order status.");
      }

      const prevStatus = order.status;
      if (prevStatus !== body.status) {
        await db
          .update(orders)
          .set({ status: body.status, updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        await db.insert(statusHistory).values({
          orderId: order.id,
          fromStatus: prevStatus,
          toStatus: body.status,
          adminEmail,
        });
      }

      return NextResponse.json({ ok: true, status: body.status });
    }

    if (body.action === "send_email") {
      if (!order.email) {
        throw new ValidationError("Customer email is not set on this order.");
      }
      if (!body.emailMessage || !body.emailMessage.trim()) {
        throw new ValidationError("Please write a message to send to the customer.");
      }

      const mailer = getMailer();
      const subject =
        body.emailSubject?.trim() ||
        `Update on ${order.herName || "your"} Custom Magazine (${order.reference})`;
      const text = body.emailMessage.trim();
      const safeBody = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${subject}</title></head>
<body style="margin:0;padding:36px 16px;background-color:#FAF6F3;font-family:Georgia,'Times New Roman',serif;color:#1F1619;">
  <div style="max-width:580px;margin:0 auto;background:#FFFFFF;border:1px solid #E8DDD5;border-radius:20px;overflow:hidden;">
    <div style="height:5px;background-color:#9E4765;"></div>
    <div style="padding:36px 40px;">
      <p style="margin:0 0 18px 0;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#9E4765;">
        CUSTOM MAGAZINE
      </p>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.75;white-space:pre-wrap;color:#2D2024;">${safeBody}</p>
      <hr style="border:none;border-top:1px solid #F2EAE4;margin:24px 0 16px 0;" />
      <p style="margin:0;font-family:sans-serif;font-size:12px;color:#7A686E;">
        Order Reference: <strong style="color:#1F1619;">${order.reference}</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

      const sendRes = await mailer.sendMail({
        orderId: order.id,
        to: order.email,
        subject,
        html,
        text,
        template: "admin_custom_email",
      });

      return NextResponse.json({ ok: sendRes.ok, error: sendRes.error });
    }

    throw new ForbiddenError("Unsupported admin action.");
  } catch (error) {
    return handleApiError(error);
  }
}
