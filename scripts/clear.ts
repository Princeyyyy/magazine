import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs/promises";
import path from "path";
import { google } from "googleapis";

async function clearAll() {
  const { db, ensureDbReady } = await import("../src/db");
  const { orders, answers, photos, statusHistory, devOutbox } = await import(
    "../src/db/schema"
  );

  await ensureDbReady();

  console.log("[db:clear] Deleting all entries from Neon Postgres database...");
  await db.delete(statusHistory);
  await db.delete(photos);
  await db.delete(answers);
  await db.delete(devOutbox);
  await db.delete(orders);

  const remainingOrders = await db.select().from(orders);
  console.log(
    `[db:clear] Neon Postgres database cleared. Remaining orders: ${remainingOrders.length}`
  );

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

    const listRes = await drive.files.list({
      q: `'${rootId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType)",
      pageSize: 100,
    });

    const files = listRes.data.files ?? [];
    console.log(
      `[db:clear] Found ${files.length} item(s) inside Google Drive root folder (${rootId})...`
    );

    for (const f of files) {
      if (f.id) {
        await drive.files.delete({ fileId: f.id });
        console.log(`  - Deleted from Google Drive: ${f.name} (${f.id})`);
      }
    }

    const verifyRes = await drive.files.list({
      q: `'${rootId}' in parents and trashed = false`,
      fields: "files(id, name)",
      pageSize: 100,
    });
    console.log(
      `[db:clear] Google Drive root folder verified empty. Remaining items: ${(verifyRes.data.files ?? []).length}`
    );
  }

  const localUploadsDir = path.join(process.cwd(), ".local-uploads");
  await fs.rm(localUploadsDir, { recursive: true, force: true }).catch(() => {});

  process.exit(0);
}

clearAll().catch((err) => {
  console.error("[db:clear] Failed:", err);
  process.exit(1);
});
