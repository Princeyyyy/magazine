import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { inArray, eq } from "drizzle-orm";
import { google } from "googleapis";

const FAKE_ORDER_IDS = [
  "923cf256-c5a6-4a68-b247-4a8d2714795b", // HM-2026-0001
  "c4cbf7e4-f043-4656-9184-338dade17f22", // HM-2026-0002
  "c2f8783e-c5ad-4487-83ec-b900625b1a0a", // HM-2026-0003
  "ec3a2552-ada2-45d9-94bd-157f87d9812e", // HM-2026-0004
  "2e76bdf5-c388-4491-9a0e-b3bfeee3f939", // HM-2026-0005
];

async function deleteFakeOrders() {
  const { db, ensureDbReady } = await import("../src/db");
  const { orders, answers, photos, statusHistory, devOutbox } = await import(
    "../src/db/schema"
  );

  await ensureDbReady();

  console.log(`[delete-fake-orders] Querying target fake orders...`);
  const targetOrders = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      customerName: orders.customerName,
      herName: orders.herName,
      driveFolderId: orders.driveFolderId,
    })
    .from(orders)
    .where(inArray(orders.id, FAKE_ORDER_IDS));

  console.log(`[delete-fake-orders] Found ${targetOrders.length} fake order(s) to remove:`);
  for (const o of targetOrders) {
    console.log(` - ${o.reference} (${o.id}): ${o.herName} / ${o.customerName}`);
  }

  // Delete associated Google Drive folders if Drive credentials are available
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID;
  if (
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
    rootId
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    for (const o of targetOrders) {
      if (o.driveFolderId && !o.driveFolderId.startsWith("local-")) {
        try {
          await drive.files.delete({ fileId: o.driveFolderId });
          console.log(` - Deleted Google Drive folder ${o.driveFolderId} for ${o.reference}`);
        } catch (err: unknown) {
          console.warn(` - Could not delete Drive folder ${o.driveFolderId}:`, (err as Error).message);
        }
      }
    }
  }

  // Database cascade deletes
  for (const o of targetOrders) {
    await db.delete(statusHistory).where(eq(statusHistory.orderId, o.id));
    await db.delete(photos).where(eq(photos.orderId, o.id));
    await db.delete(answers).where(eq(answers.orderId, o.id));
    await db.delete(devOutbox).where(eq(devOutbox.orderId, o.id));
    await db.delete(orders).where(eq(orders.id, o.id));
    console.log(` - Deleted from DB: ${o.reference}`);
  }

  // Verify remaining orders
  const remaining = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      customerName: orders.customerName,
      herName: orders.herName,
    })
    .from(orders);

  console.log(`[delete-fake-orders] Operation complete. Remaining orders in database (${remaining.length}):`);
  for (const r of remaining) {
    console.log(` * ${r.reference} (${r.id}): ${r.herName} / ${r.customerName}`);
  }

  process.exit(0);
}

deleteFakeOrders().catch((err) => {
  console.error("[delete-fake-orders] Failed:", err);
  process.exit(1);
});
