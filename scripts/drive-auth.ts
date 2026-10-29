import http from "http";
import { google } from "googleapis";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
const redirectPort = 4242;
const redirectUri = `http://localhost:${redirectPort}/oauth2callback`;

async function main() {
  if (!clientId || !clientSecret) {
    console.error(
      "\n[drive:auth] Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env.\n" +
        "1. Open Google Cloud Console -> APIs & Services -> Credentials.\n" +
        "2. Create an OAuth 2.0 Client ID (Web application) and add this Authorized Redirect URI:\n" +
        `   ${redirectUri}\n` +
        "3. IMPORTANT: Set your OAuth Consent Screen publishing status to 'In production' (not 'Testing'), otherwise your refresh token will expire after 7 days.\n" +
        "4. Paste GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET into .env and re-run `npm run drive:auth`.\n"
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  console.log("\n==============================================================");
  console.log(" HER CUSTOM MAGAZINE — GOOGLE DRIVE OAUTH CONSENT FLOW");
  console.log("==============================================================\n");
  console.log(
    "IMPORTANT REMINDER: Ensure your Google Cloud OAuth Consent Screen is set to\n" +
      "'In production' (not 'Testing'), or Google will expire the refresh token in 7 days.\n"
  );
  console.log("Open this URL in your browser to authorize Google Drive access:\n");
  console.log(authorizeUrl);
  console.log("\nWaiting for callback on", redirectUri, "...\n");

  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url?.startsWith("/oauth2callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const urlObj = new URL(req.url, `http://localhost:${redirectPort}`);
      const code = urlObj.searchParams.get("code");
      if (!code) {
        res.writeHead(400);
        res.end("Missing authorization code.");
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<html><body style="font-family:Georgia,serif;padding:48px;background:#FCF9F7;color:#1F1619;">
          <h2>Google Drive Authorization Complete</h2>
          <p>Return to your terminal to copy your <code>GOOGLE_DRIVE_REFRESH_TOKEN</code> into <code>.env</code>.</p>
        </body></html>`
      );

      console.log("\n==============================================================");
      console.log(" SUCCESS! Add this line to your .env / Vercel environment:");
      console.log("==============================================================\n");
      console.log(`GOOGLE_DRIVE_REFRESH_TOKEN="${tokens.refresh_token ?? ""}"\n`);

      server.close(() => process.exit(0));
    } catch (err) {
      console.error("Failed to exchange authorization code:", err);
      res.writeHead(500);
      res.end("Failed to exchange token. Check terminal.");
      server.close(() => process.exit(1));
    }
  });

  server.listen(redirectPort);
}

void main();
