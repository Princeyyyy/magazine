export interface OrderConfirmationEmailProps {
  customerName: string;
  herName: string;
  orderReference: string;
  colourTheme: string;
  photoCount: number;
}

export function renderCustomerConfirmationEmail(props: OrderConfirmationEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Custom Magazine order for ${props.herName} (${props.orderReference})`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F3;font-family:Georgia,serif;color:#1F1619;">
  <div style="max-width:600px;margin:40px auto;background:#FFFFFF;border:1px solid #EBE0D8;padding:48px 40px;">
    <p style="text-transform:uppercase;letter-spacing:3px;font-size:11px;color:#9E4765;margin:0 0 8px 0;font-family:sans-serif;">
      CUSTOM MAGAZINE
    </p>
    <h1 style="font-size:28px;font-weight:normal;margin:0 0 20px 0;color:#1F1619;">
      Thank you, ${props.customerName}.
    </h1>
    <p style="font-size:16px;line-height:1.7;color:#4A3A40;margin:0 0 24px 0;">
      I have received your answers, memories, and photos for <strong>${props.herName}</strong>'s custom magazine issue. I am already looking forward to bringing the pages to life.
    </p>
    <div style="background:#FAF6F3;border-left:3px solid #9E4765;padding:20px 24px;margin:0 0 28px 0;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#7A686E;font-family:sans-serif;">ORDER REFERENCE</p>
      <p style="margin:0 0 16px 0;font-size:22px;font-weight:bold;letter-spacing:1px;color:#1F1619;">${props.orderReference}</p>
      <p style="margin:0;font-size:14px;color:#4A3A40;">
        <strong>Featured Star:</strong> ${props.herName}<br/>
        <strong>Colour Direction:</strong> ${props.colourTheme}<br/>
        <strong>Photos Uploaded:</strong> ${props.photoCount} photos
      </p>
    </div>
    <p style="font-size:15px;line-height:1.6;color:#4A3A40;margin:0 0 28px 0;">
      I will review everything carefully and be in touch with you soon regarding your magazine.
    </p>
    <hr style="border:none;border-top:1px solid #EBE0D8;margin:32px 0 20px 0;" />
    <p style="font-size:12px;color:#8C7A80;margin:0;font-family:sans-serif;">
      Custom Magazine &mdash; Bespoke Editorial Keepsakes
    </p>
  </div>
</body>
</html>`;

  const text = `CUSTOM MAGAZINE

Thank you, ${props.customerName}!

I can't wait to create ${props.herName}'s magazine. I'll be in touch soon.

Order Reference: ${props.orderReference}
Featured Star: ${props.herName}
Colour Theme: ${props.colourTheme}
Photos Uploaded: ${props.photoCount}
`;

  return { subject, html, text };
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
  const star = props.herName ? `${props.herName}'s` : "your";
  const subject = `Resume ${star} custom magazine order`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#FAF6F3;font-family:Georgia,serif;color:#1F1619;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border:1px solid #EBE0D8;padding:40px;">
    <p style="text-transform:uppercase;letter-spacing:3px;font-size:11px;color:#9E4765;margin:0 0 8px 0;font-family:sans-serif;">
      CUSTOM MAGAZINE
    </p>
    <h1 style="font-size:24px;font-weight:normal;margin:0 0 16px 0;">
      Pick up right where you left off
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#4A3A40;margin:0 0 24px 0;">
      Your progress and uploaded photos for ${star} magazine have been saved. Use the private link below to continue whenever you are ready:
    </p>
    <p style="margin:0 0 24px 0;">
      <a href="${props.resumeUrl}" style="display:inline-block;background:#9E4765;color:#FFFFFF;text-decoration:none;padding:13px 26px;font-family:sans-serif;font-size:14px;font-weight:600;">
        Resume Your Order
      </a>
    </p>
    <p style="font-size:12px;color:#8C7A80;word-break:break-all;font-family:sans-serif;">
      Or copy this link: ${props.resumeUrl}
    </p>
  </div>
</body>
</html>`;

  const text = `CUSTOM MAGAZINE\n\nPick up right where you left off.\nResume your order here: ${props.resumeUrl}`;
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

  const driveButtonHtml = props.driveFolderUrl
    ? `<a href="${props.driveFolderUrl}" style="background:#9E4765;color:#FFFFFF;text-decoration:none;padding:12px 22px;font-size:14px;font-weight:600;margin-left:10px;">
        Open Google Drive Photos (${props.photoCount})
      </a>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${subject}</title></head>
<body style="margin:0;padding:24px;background:#FAF6F3;font-family:sans-serif;color:#1F1619;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #EBE0D8;padding:32px;">
    <p style="text-transform:uppercase;letter-spacing:2.5px;font-size:11px;color:#9E4765;margin:0 0 6px 0;">
      CUSTOM MAGAZINE  •  EDITORIAL DESK
    </p>
    <h2 style="margin:0 0 18px 0;color:#1F1619;font-family:Georgia,serif;font-weight:normal;font-size:24px;">
      New Magazine Order Completed
    </h2>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">
      <strong>Reference:</strong> ${props.orderReference}<br/>
      <strong>Featured Star:</strong> ${props.herName}<br/>
      <strong>Ordered By:</strong> ${props.customerName}<br/>
      <strong>Customer Email:</strong> ${props.email}<br/>
      <strong>Customer Phone:</strong> ${props.phoneE164}<br/>
      <strong>Colour Theme:</strong> ${props.colourTheme}<br/>
      <strong>Photos Uploaded:</strong> ${props.photoCount}${props.driveFolderUrl ? `<br/><strong>Google Drive Folder:</strong> <a href="${props.driveFolderUrl}" style="color:#9E4765;">${props.driveFolderUrl}</a>` : ""}
    </p>
    <p style="margin:24px 0 0 0;">
      <a href="${props.adminOrderUrl}" style="background:#1F1619;color:#FFFFFF;text-decoration:none;padding:12px 22px;font-size:14px;font-weight:600;">
        Open Order Brief in Admin
      </a>
      ${driveButtonHtml}
    </p>
  </div>
</body>
</html>`;

  const text = `New Magazine Order Completed\nReference: ${props.orderReference}\nFeatured Star: ${props.herName}\nOrdered By: ${props.customerName}\nEmail: ${props.email}\nPhone: ${props.phoneE164}\nColour Theme: ${props.colourTheme}\nPhotos: ${props.photoCount}${props.driveFolderUrl ? `\nGoogle Drive Folder: ${props.driveFolderUrl}` : ""}\nAdmin Link: ${props.adminOrderUrl}`;

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${subject}</title></head>
<body style="margin:0;padding:24px;background:#FAF6F3;font-family:sans-serif;color:#1F1619;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #F5C2C7;border-left:4px solid #B91C1C;padding:32px;">
    <p style="text-transform:uppercase;letter-spacing:2.5px;font-size:11px;color:#B91C1C;margin:0 0 6px 0;font-weight:bold;">
      CUSTOM MAGAZINE  •  SYSTEM ALERT
    </p>
    <h2 style="margin:0 0 14px 0;color:#1F1619;font-family:Georgia,serif;font-weight:normal;font-size:22px;">
      ${props.context}
    </h2>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#4A3A40;">
      <strong>Summary:</strong> ${props.summary}<br/>
      <strong>Timestamp (UTC):</strong> ${timestamp}
      ${props.orderReference ? `<br/><strong>Order Reference:</strong> ${props.orderReference}` : ""}
    </p>
    ${
      props.details
        ? `<pre style="background:#FCF9F7;border:1px solid #EFE6E0;padding:14px;font-size:12px;overflow-x:auto;white-space:pre-wrap;color:#1F1619;">${props.details}</pre>`
        : ""
    }
  </div>
</body>
</html>`;

  const text = `CUSTOM MAGAZINE SYSTEM ALERT\nContext: ${props.context}\nSummary: ${props.summary}\nTimestamp: ${timestamp}${props.orderReference ? `\nOrder Reference: ${props.orderReference}` : ""}${props.details ? `\n\nDetails:\n${props.details}` : ""}`;

  return { subject, html, text };
}
