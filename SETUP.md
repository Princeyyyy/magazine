# Her Custom Magazine — Production Service Setup Guide (`SETUP.md`)

This application was architected with an **Adapter Pattern** so that it runs out of the box locally with zero external accounts configured. When you are ready to go live on **Vercel** with **Supabase**, **Google Drive**, **Resend**, and **WhatsApp**, follow the steps below in exact order. **No code changes are required — only `.env` / Vercel Environment Variable updates.**

---

## Step 1: Database Setup (Supabase or Neon PostgreSQL)

Since you are deploying to **Vercel** and saving data in **Supabase**:

1. Sign in to [Supabase](https://supabase.com/) and click **New Project**.
2. Choose a project name (e.g., `her-custom-magazine`), set a strong database password, and select the region closest to your customers.
3. Once your project is provisioned, click **Connect** at the top of the Supabase dashboard (or go to **Project Settings -> Database**).
4. Copy the **Transaction Pooler** connection string (Port `6543`, which is ideal for serverless Next.js on Vercel) or the Session Pooler string (Port `5432`), and replace `[YOUR-PASSWORD]` with your database password:
   ```env
   DATABASE_URL="postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
   ```
   *(Note: `src/db/index.ts` automatically detects Supabase's port `6543` transaction pooler and disables prepared statements so serverless queries work seamlessly).*
5. Put `DATABASE_URL` in your local `.env` file and push the Drizzle schema to Supabase:
   ```bash
   npm run db:push
   ```
   *(Or run migrations via `npm run db:migrate`).*

---

## Step 2: Google Cloud Project, OAuth Consent Screen & Admin Sign-In Credentials

You will use one Google Cloud project for two purposes:
- **Admin Area Google Sign-In** (NextAuth / Auth.js)
- **Personal Google Drive Photo Storage** (via OAuth refresh token)

### 2.1 Create the Project & Enable Google Drive API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project named **Her Custom Magazine**.
2. Navigate to **APIs & Services -> Library**, search for **Google Drive API**, and click **Enable**.

### 2.2 Configure OAuth Consent Screen (CRITICAL: Set to "In production")
1. Go to **APIs & Services -> OAuth consent screen**.
2. Choose **External** user type and click **Create**.
3. Fill in the app name (`Her Custom Magazine`), user support email, and developer contact email.
4. On the **Scopes** step, add `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `https://www.googleapis.com/auth/drive.file`.
5. **IMPORTANT:** Once saved, go back to the **OAuth consent screen** overview page and click **Publish App** so the Publishing status changes from **Testing** to **In production**.
   > Why this matters: If your OAuth consent screen is left in "Testing" mode, Google automatically revokes your `GOOGLE_DRIVE_REFRESH_TOKEN` after **7 days**, which would break photo uploads. Setting it to **"In production"** keeps your refresh token valid indefinitely. (Because only your own account authorizes the `drive.file` scope once via CLI, you do not need to submit for Google verification).

### 2.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services -> Credentials** and click **Create Credentials -> OAuth client ID**.
2. Select **Web application** and name it `Her Custom Magazine Web`.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `https://your-production-domain.com`
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google` (for local Admin Google sign-in)
   - `https://your-production-domain.com/api/auth/callback/google` (for production Admin Google sign-in)
   - `http://localhost:4242/oauth2callback` (used once by `npm run drive:auth`)
5. Click **Create** and copy the **Client ID** and **Client Secret** into `.env`:
   ```env
   AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="your-client-secret"
   GOOGLE_OAUTH_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"
   ```
6. Set your allowed admin email addresses (comma-separated) and `AUTH_SECRET`:
   ```env
   AUTH_SECRET="generate-a-32-char-random-string-here"
   ADMIN_EMAILS="your-google-email@gmail.com"
   ADMIN_NOTIFY_EMAIL="your-google-email@gmail.com"
   ```

---

## Step 3: Google Drive Refresh Token (`npm run drive:auth`) & Root Folder

Why OAuth Refresh Token instead of a Service Account? Service accounts have zero storage quota on personal Google Drive accounts. Using an OAuth refresh token lets the app create per-order folders (`{Her full name} - {order reference}`) and initiate browser-to-Drive resumable upload sessions directly inside your personal Google Drive storage.

1. Open [Google Drive](https://drive.google.com/) in your browser and create a new folder named **Her Custom Magazine Orders**.
2. Double-click into that folder and copy the Folder ID from the URL bar:
   - If the URL is `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`, the ID is `1aBcDeFgHiJkLmNoPqRsTuVwXyZ`.
3. Set `DRIVE_ROOT_FOLDER_ID` in `.env`:
   ```env
   DRIVE_ROOT_FOLDER_ID="1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
   ```
4. Ensure `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` are in your `.env`, then run the one-time authorization script:
   ```bash
   npm run drive:auth
   ```
5. Click the URL printed in your terminal, sign in with your Google account, grant access to `drive.file`, and copy the resulting `GOOGLE_DRIVE_REFRESH_TOKEN` printed in your terminal into `.env`:
   ```env
   GOOGLE_DRIVE_REFRESH_TOKEN="1//0g..."
   ```

---

## Step 4: Resend Domain & API Key (Email)

1. Create an account at [Resend](https://resend.com/).
2. Go to **Domains -> Add Domain**, enter your domain (e.g., `orders.yourdomain.com`), and add the DNS records (DKIM/SPF) shown by Resend.
3. Go to **API Keys -> Create API Key** and copy the key into `.env`:
   ```env
   RESEND_API_KEY="re_123456789..."
   MAIL_FROM="Her Custom Magazine <orders@yourdomain.com>"
   ```

---

## Step 5: `wa.me` WhatsApp Number (Default Free Provider)

By default, the app uses `WhatsAppLinkProvider`, which generates prefilled `wa.me` links containing the customer's order reference on the Thank-You page, in the confirmation email, and in the Admin order detail view.

1. Set your WhatsApp business phone number in international format (digits only, no `+` or spaces, e.g., Kenya `2547...`):
   ```env
   WHATSAPP_NUMBER="254712345678"
   WHATSAPP_CLOUD_ENABLED="false"
   ```

---

## Step 6: Optional Telegram Bot (Instant New-Order Alerts)

If you want instant push notifications on Telegram whenever an order is submitted (in addition to the admin email):

1. Open Telegram and message [@BotFather](https://t.me/BotFather) with `/newbot`.
2. Follow the prompts and copy the **Bot Token**.
3. Start a chat with your new bot, then fetch your Chat ID (e.g., by messaging `@userinfobot` or visiting `https://api.telegram.org/bot<TOKEN>/getUpdates`).
4. Add both values to `.env`:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   TELEGRAM_CHAT_ID="987654321"
   ```

---

## Step 7: Optional Meta WhatsApp Cloud API

If you later want the Admin **"Send WhatsApp update"** button to send automated WhatsApp messages via Meta's API instead of opening a `wa.me` link:

1. Go to [Meta for Developers](https://developers.facebook.com/), create a Business App, and add the **WhatsApp** product.
2. In **WhatsApp Manager -> Message Templates**, create and submit a template (e.g., `order_status_update` in English `en`) with 4 body variables:
   - `{{1}}`: Customer name
   - `{{2}}`: Her name
   - `{{3}}`: Order reference
   - `{{4}}`: New order status
3. Once approved by Meta, configure these variables in `.env`:
   ```env
   WHATSAPP_CLOUD_ENABLED="true"
   WHATSAPP_PHONE_NUMBER_ID="109876543210"
   WHATSAPP_ACCESS_TOKEN="EAAB..."
   WHATSAPP_TEMPLATE_NAME="order_status_update"
   ```
   > **Pricing Note:** Template messages initiated by a business outside the 24-hour customer service window may be charged per conversation/message by Meta. Always check Meta's current WhatsApp Business Platform pricing for your country before enabling `WHATSAPP_CLOUD_ENABLED="true"`.

---

## Step 8: Vercel Deployment & Environment Variables

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import the project into [Vercel](https://vercel.com/new).
3. In the Vercel project settings under **Environment Variables**, paste all variables from `.env.example` (including your Supabase `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` set to your `https://...` Vercel domain, Google OAuth keys, Drive refresh token, and Resend key).
4. Deploy! Since photo uploads use direct browser-to-Drive resumable upload sessions (`DriveStorage`), uploads bypass Vercel's 4.5 MB serverless request body limit completely.

---

## Step 9: End-to-End Production Test Checklist

After deploying to Vercel and filling in your environment variables:

- [ ] **1. Admin Sign-In & Settings Diagnostics:**
  - Visit `/admin` and sign in with your allowlisted Google account.
  - Confirm that the **"Dev Mode"** badge is gone (meaning Database, Google Drive, and Resend are all live).
  - Go to `/admin/settings` and click **Test** on **Photo Storage**, **Mailer**, **WhatsApp**, and **Admin Notifier** to verify every live connection returns green.
- [ ] **2. Customer Wizard & Autosave:**
  - Open `/` in an incognito window. Fill in Page 1 and click **Save for later -> Email Link**.
  - Check your email inbox for the resume link and open it to confirm all fields restore cleanly.
- [ ] **3. Direct-to-Drive Resumable Photo Upload:**
  - Advance to Page 8 (Photos) and upload 15 photos (including `.jpg`, `.png`, or `.heic`).
  - Add captions under thumbnails and click one thumbnail to mark it as **Cover Photo**.
- [ ] **4. Final Review & Submission:**
  - Review all answers on the Review page and click **Submit Her Magazine Order**.
  - Verify the Thank-You page displays the `HM-YYYY-XXXX` reference and that clicking **Message us on WhatsApp** opens WhatsApp with the prefilled reference.
- [ ] **5. Emails & Admin Fulfillment:**
  - Confirm the customer receives the confirmation email and `ADMIN_NOTIFY_EMAIL` (and Telegram, if enabled) receives the new-order alert.
  - Open `/admin`, click into the new order, test **Open Drive folder**, **Export brief (.md)**, **Export JSON**, and **Download all photos (.zip)**.
