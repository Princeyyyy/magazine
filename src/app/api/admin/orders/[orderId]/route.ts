import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { orders, statusHistory, orderStatusEnum, type OrderStatus } from "@/db/schema";
import { getAuthenticatedAdminEmail } from "@/auth";
import { getMailer } from "@/lib/services/mailer";
import { renderCustomerConfirmationEmail } from "@/emails/templates";
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
      const mailer = getMailer();

      if (body.emailMessage && body.emailMessage.trim()) {
        const subject =
          body.emailSubject?.trim() ||
          `Update on ${order.herName || "your"} custom magazine (${order.reference})`;
        const text = body.emailMessage.trim();
        const html = `<div style="font-family:Georgia,serif;color:#1F1619;max-width:580px;margin:20px auto;padding:32px;border:1px solid #EFE6E0;background:#FFFFFF;">
          <p style="text-transform:uppercase;letter-spacing:2px;font-size:11px;color:#9E4765;font-family:sans-serif;">CUSTOM MAGAZINE</p>
          <p style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          <hr style="border:none;border-top:1px solid #EFE6E0;margin:24px 0;" />
          <p style="font-size:12px;color:#7A686E;font-family:sans-serif;">Order Reference: ${order.reference}</p>
        </div>`;

        const sendRes = await mailer.sendMail({
          orderId: order.id,
          to: order.email,
          subject,
          html,
          text,
          template: "admin_custom_email",
        });

        return NextResponse.json({ ok: sendRes.ok, error: sendRes.error });
      } else {
        // Resend order confirmation email
        const tpl = renderCustomerConfirmationEmail({
          customerName: order.customerName || "Customer",
          herName: order.herName || "Featured Star",
          orderReference: order.reference,
          colourTheme: order.colourTheme || "Editorial",
          photoCount: 15,
        });

        const sendRes = await mailer.sendMail({
          orderId: order.id,
          to: order.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          template: "customer_order_confirmation_resend",
        });

        return NextResponse.json({ ok: sendRes.ok, error: sendRes.error });
      }
    }

    throw new ForbiddenError("Unsupported admin action.");
  } catch (error) {
    return handleApiError(error);
  }
}
