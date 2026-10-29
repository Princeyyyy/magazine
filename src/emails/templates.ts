function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ResumeOrderEmailProps {
  customerName?: string;
  herName?: string;
  resumeUrl: string;
}

export function renderResumeOrderEmail(props: ResumeOrderEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const hasStar = Boolean(props.herName && props.herName.trim().length > 0);
  const starPlain = hasStar ? `${props.herName!.trim()}'s` : "your";
  const starHtml = hasStar
    ? `<strong style="color:#1F1619;">${escapeHtml(props.herName!.trim())}&rsquo;s</strong>`
    : "your";
  const greeting =
    props.customerName && props.customerName.trim().length > 0
      ? `Hello ${escapeHtml(props.customerName.trim())},`
      : "Hello,";

  const subject = `Continue ${starPlain} Custom Magazine brief`;
  const safeUrl = escapeHtml(props.resumeUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F3;font-family:Georgia,'Times New Roman',serif;color:#1F1619;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF6F3;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#FFFFFF;border:1px solid #E8DDD5;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(31,22,25,0.05);">
          <!-- Top Editorial Accent Bar -->
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#1F1619 0%,#9E4765 50%,#1F1619 100%);background-color:#9E4765;"></td>
          </tr>

          <!-- Masthead -->
          <tr>
            <td style="padding:36px 40px 22px 40px;text-align:center;border-bottom:1px solid #F2EAE4;">
              <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:3.5px;text-transform:uppercase;color:#9E4765;">
                CUSTOM MAGAZINE
              </p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:#7A686E;">
                Saved Editorial Draft
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:36px 40px 28px 40px;">
              <p style="margin:0 0 10px 0;font-size:15px;color:#7A686E;">
                ${greeting}
              </p>
              <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;line-height:1.3;color:#1F1619;">
                Pick up right where you left off.
              </h1>
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.75;color:#4A3A40;">
                Every answer, chapter, and photograph you have added so far for ${starHtml} custom magazine has been safely saved. Whenever you are ready to continue, open your private link below:
              </p>

              <!-- Primary CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center" style="border-radius:999px;background-color:#9E4765;">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.4px;color:#FFFFFF;text-decoration:none;border-radius:999px;">
                      Continue Your Magazine Brief &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FCF9F7;border:1px solid #EBE0D8;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#8C7A80;">
                      YOUR PRIVATE RESUME LINK
                    </p>
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;word-break:break-all;color:#9E4765;">
                      <a href="${safeUrl}" style="color:#9E4765;text-decoration:underline;">${safeUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 30px 40px;border-top:1px solid #F2EAE4;text-align:center;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#96838A;line-height:1.6;">
                Custom Magazine &bull; Bespoke Editorial Keepsakes<br />
                This private link restores your saved session on any device.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `CUSTOM MAGAZINE — Saved Editorial Draft

${props.customerName ? `Hello ${props.customerName.trim()},` : "Hello,"}

Pick up right where you left off.
Your progress and uploaded photographs for ${starPlain} custom magazine have been safely saved.

Use your private link below to continue whenever you are ready:
${props.resumeUrl}

Custom Magazine • Bespoke Editorial Keepsakes`;

  return { subject, html, text };
}

export interface AdminNewOrderEmailProps {
  orderId: string;
  orderReference: string;
  customerName: string;
  herName: string;
  email: string;
  phoneE164: string;
  colourTheme: string;
  photoCount: number;
  adminOrderUrl: string;
  driveFolderUrl?: string | null;
}

export function renderAdminNewOrderEmail(props: AdminNewOrderEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[New Order] ${props.orderReference} — ${props.herName} (by ${props.customerName})`;
  const safeRef = escapeHtml(props.orderReference);
  const safeStar = escapeHtml(props.herName);
  const safeCustomer = escapeHtml(props.customerName);
  const safeEmail = props.email ? escapeHtml(props.email) : "";
  const safePhone = props.phoneE164 ? escapeHtml(props.phoneE164) : "";
  const safeColour = escapeHtml(props.colourTheme);
  const safeAdminUrl = escapeHtml(props.adminOrderUrl);
  const safeDriveUrl = props.driveFolderUrl
    ? escapeHtml(props.driveFolderUrl)
    : null;

  const driveButtonHtml = safeDriveUrl
    ? `<td style="padding-left:10px;">
        <a href="${safeDriveUrl}" target="_blank" style="display:inline-block;background-color:#9E4765;color:#FFFFFF;text-decoration:none;padding:13px 22px;border-radius:999px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;">
          Open Google Drive Photos (${props.photoCount})
        </a>
      </td>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F1619;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF6F3;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background-color:#FFFFFF;border:1px solid #E8DDD5;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(31,22,25,0.05);">
          <!-- Top Editorial Accent Bar -->
          <tr>
            <td style="height:5px;background-color:#1F1619;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 20px 40px;border-bottom:1px solid #F2EAE4;">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#9E4765;">
                CUSTOM MAGAZINE &bull; EDITORIAL DESK
              </p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#1F1619;">
                New Magazine Order Submitted
              </h1>
            </td>
          </tr>

          <!-- Order Details Table -->
          <tr>
            <td style="padding:28px 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FCF9F7;border:1px solid #EBE0D8;border-radius:14px;margin:0 0 26px 0;">
                <tr>
                  <td style="padding:22px 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#4A3A40;">
                      <tr>
                        <td style="padding:8px 0;color:#7A686E;width:38%;border-bottom:1px solid #F2EAE4;">Order Reference</td>
                        <td style="padding:8px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;color:#1F1619;border-bottom:1px solid #F2EAE4;">${safeRef}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#7A686E;border-bottom:1px solid #F2EAE4;">Featured Star</td>
                        <td style="padding:8px 0;font-weight:600;color:#1F1619;border-bottom:1px solid #F2EAE4;">${safeStar}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#7A686E;border-bottom:1px solid #F2EAE4;">Ordered By</td>
                        <td style="padding:8px 0;font-weight:600;color:#1F1619;border-bottom:1px solid #F2EAE4;">${safeCustomer}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#7A686E;border-bottom:1px solid #F2EAE4;">Customer Contact</td>
                        <td style="padding:8px 0;border-bottom:1px solid #F2EAE4;">${
                          safeEmail
                            ? `<a href="mailto:${safeEmail}" style="color:#9E4765;text-decoration:none;font-weight:500;">${safeEmail}</a>${
                                safePhone ? ` &bull; ${safePhone}` : ""
                              }`
                            : safePhone
                              ? safePhone
                              : `<span style="color:#8A777E;font-style:italic;">Direct contact via WhatsApp / Instagram</span>`
                        }</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#7A686E;border-bottom:1px solid #F2EAE4;">Colour Direction</td>
                        <td style="padding:8px 0;color:#1F1619;border-bottom:1px solid #F2EAE4;">${safeColour}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#7A686E;">Photographs Uploaded</td>
                        <td style="padding:8px 0;font-weight:600;color:#1F1619;">${props.photoCount} ${props.photoCount === 1 ? "photo" : "photos"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${safeAdminUrl}" target="_blank" style="display:inline-block;background-color:#1F1619;color:#FFFFFF;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:13px;font-weight:600;">
                      Open Order Brief in Admin &rarr;
                    </a>
                  </td>
                  ${driveButtonHtml}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 40px 26px 40px;border-top:1px solid #F2EAE4;text-align:center;">
              <p style="margin:0;font-size:11px;color:#96838A;">
                Custom Magazine Editorial Desk &bull; Automated Order Completion Notification
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `CUSTOM MAGAZINE • EDITORIAL DESK
New Magazine Order Completed

Order Reference: ${props.orderReference}
Featured Star: ${props.herName}
Ordered By: ${props.customerName}
Customer Email: ${props.email}
Customer Phone: ${props.phoneE164}
Colour Direction: ${props.colourTheme}
Photographs Uploaded: ${props.photoCount}
${props.driveFolderUrl ? `Google Drive Folder: ${props.driveFolderUrl}\n` : ""}Admin Order Link: ${props.adminOrderUrl}`;

  return { subject, html, text };
}

export interface AdminCriticalAlertEmailProps {
  context: string;
  summary: string;
  details?: string;
  orderReference?: string;
  orderId?: string;
}

export function renderAdminCriticalAlertEmail(
  props: AdminCriticalAlertEmailProps
): {
  subject: string;
  html: string;
  text: string;
} {
  const timestamp = new Date().toISOString();
  const subject = `[Custom Magazine Alert] ${props.context}: ${props.summary.slice(0, 80)}`;
  const safeContext = escapeHtml(props.context);
  const safeSummary = escapeHtml(props.summary);
  const safeRef = props.orderReference ? escapeHtml(props.orderReference) : null;
  const safeDetails = props.details ? escapeHtml(props.details) : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F1619;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF6F3;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background-color:#FFFFFF;border:1px solid #F5C2C7;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:5px;background-color:#B91C1C;"></td>
          </tr>
          <tr>
            <td style="padding:28px 36px;">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#B91C1C;">
                CUSTOM MAGAZINE &bull; SYSTEM ALERT
              </p>
              <h2 style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:22px;color:#1F1619;">
                ${safeContext}
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF8F8;border:1px solid #F5C2C7;border-radius:10px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 20px;font-size:13px;line-height:1.65;color:#4A3A40;">
                    <strong style="color:#1F1619;">Summary:</strong> ${safeSummary}<br />
                    <strong style="color:#1F1619;">Timestamp (UTC):</strong> ${timestamp}
                    ${safeRef ? `<br /><strong style="color:#1F1619;">Order Reference:</strong> ${safeRef}` : ""}
                  </td>
                </tr>
              </table>
              ${
                safeDetails
                  ? `<pre style="margin:0;background:#FCF9F7;border:1px solid #EFE6E0;border-radius:10px;padding:14px;font-size:11px;line-height:1.5;overflow-x:auto;white-space:pre-wrap;color:#1F1619;">${safeDetails}</pre>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `CUSTOM MAGAZINE • SYSTEM ALERT
Context: ${props.context}
Summary: ${props.summary}
Timestamp (UTC): ${timestamp}${props.orderReference ? `\nOrder Reference: ${props.orderReference}` : ""}${props.details ? `\n\nDetails:\n${props.details}` : ""}`;

  return { subject, html, text };
}
