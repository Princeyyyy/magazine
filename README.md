# Her Custom Magazine

A bespoke, glossy magazine order intake and editorial admin system built with **Next.js (App Router)**, **TypeScript (Strict)**, **Tailwind CSS**, **Drizzle ORM (Supabase / PostgreSQL + local embedded PGlite fallback)**, **Auth.js**, **Google Drive API**, and **Resend**.

---

## Quick Start (Zero External Accounts Required)

The app runs end-to-end immediately in local development using built-in local adapters (`Embedded PGlite Postgres`, `LocalDiskStorage`, `ConsoleMailer`, `WhatsAppLinkProvider`, and `Dev Mode Admin Sign-In`).

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Seed 3 realistic sample orders (including 20 placeholder photos)
npm run db:seed

# 3. Start the development server
npm run dev
```

- **Customer Magazine Intake Wizard:** [http://localhost:3000](http://localhost:3000)
- **Editorial Admin Area:** [http://localhost:3000/admin](http://localhost:3000/admin) (In local dev mode, sign in with `admin@example.com`)
- **Service Diagnostics & Dev Email Outbox:** [http://localhost:3000/admin/settings](http://localhost:3000/admin/settings)

When you are ready to connect **Supabase**, **Google Drive**, **Resend**, and deploy to **Vercel**, follow [**SETUP.md**](./SETUP.md).

---

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js in development mode on `http://localhost:3000` |
| `npm run build` | Builds the production application |
| `npm run start` | Starts the production Next.js server |
| `npm test` | Runs the Vitest unit test suite (validation, schemas, phone E.164, security, adapters) |
| `npm run typecheck` | Runs `tsc --noEmit` with strict TypeScript checking |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run db:generate` | Generates Drizzle SQL migrations from `src/db/schema.ts` into `./drizzle` |
| `npm run db:push` | Pushes the Drizzle schema directly to your `DATABASE_URL` (e.g. Supabase) |
| `npm run db:seed` | Seeds 3 sample orders (1 draft, 1 submitted with 20 photos, 1 in design) |
| `npm run drive:auth` | One-time interactive CLI consent flow to obtain `GOOGLE_DRIVE_REFRESH_TOKEN` |

---

## Folder Map

```text
.
├── drizzle/                        # Generated SQL migrations
├── scripts/
│   ├── drive-auth.ts               # One-time Google Drive OAuth refresh token helper
│   └── seed.ts                     # Seeds 3 realistic sample orders + placeholder photos
├── src/
│   ├── app/
│   │   ├── admin/                  # Protected Admin Area (/admin, /admin/orders/[orderId], /admin/settings)
│   │   ├── api/                    # Route handlers (orders, resumable uploads, admin actions, auth)
│   │   ├── thank-you/              # Post-submission confirmation screen with wa.me link
│   │   ├── globals.css             # Editorial typography & theme styles
│   │   ├── layout.tsx              # Root layout (Cormorant Garamond + Plus Jakarta Sans)
│   │   └── page.tsx                # Customer magazine intake page
│   ├── components/
│   │   ├── admin/                  # Admin order brief, photo lightbox, notes, settings test UI
│   │   ├── ui/                     # Reusable accessible UI primitives
│   │   └── wizard/                 # Multi-page wizard, repeatableRows, photo uploader, review step
│   ├── config/
│   │   ├── form.ts                 # Single source of truth for all 9 pages, fields & Zod schemas
│   │   └── form.test.ts            # Unit tests for form config & schema generation
│   ├── db/
│   │   ├── index.ts                # Drizzle connection (Supabase/Postgres + PGlite local fallback)
│   │   └── schema.ts               # PostgreSQL tables: orders, answers, photos, notes, message_log, etc.
│   ├── emails/
│   │   └── templates.ts            # HTML & plain-text email templates
│   ├── lib/
│   │   ├── services/               # Service adapters (photo-storage, mailer, whatsapp, admin-notifier)
│   │   ├── api-response.ts         # Standardized API error envelope handler
│   │   ├── errors.ts               # Typed application error hierarchy
│   │   ├── orders.ts               # Order draft hydration, batch autosave & idempotent submission
│   │   └── security.ts             # Magic byte inspection, HMAC photo tokens, rate limiter
│   ├── auth.ts                     # Auth.js configuration (Google OAuth + ADMIN_EMAILS allowlist)
│   └── env.ts                      # Boot-time Zod environment validation & adapter mode detector
├── .env.example                    # Documented environment variables template
├── SETUP.md                        # Step-by-step production setup guide (Supabase, Drive, Resend, Vercel)
└── package.json
```

---

## How to Edit Questions in `src/config/form.ts`

All 9 pages of the customer questionnaire are defined in a single typed file: [**`src/config/form.ts`**](./src/config/form.ts).

1. **Both the UI and server/client Zod validation schemas are generated automatically from `FORM_PAGES`**.
2. Answers are stored in the `answers` table as `(order_id, question_key, value jsonb)`, which means **adding, rewording, or reordering questions in `src/config/form.ts` never requires a database migration**.
3. To edit or add a question:
   - Open `src/config/form.ts` and locate the desired page in `FORM_PAGES`.
   - Add or modify a field object inside `group.fields`:
     ```ts
     {
       key: "her_signature_coffee",
       label: "Her signature coffee order",
       type: "shortText", // shortText | longText | number | date | radio | email | phone | checkbox | repeatableRows | photoUpload
       required: false,
       maxLength: 100,
       placeholder: "e.g. Iced oat cortado",
       helpText: "Optional helper note shown below the label",
     }
     ```
   - For **`repeatableRows`**, configure `subFields`, `initialRows`, `minRows` (hard minimum required), `maxRows`, and `targetHint`.
   - For **conditional fields**, add a `conditional` rule referencing another field's `key`:
     ```ts
     conditional: {
       fieldKey: "colour_theme",
       equals: "Other",
       requiredWhenShown: true,
     }
     ```
   - Save the file — the Customer Wizard, Review Step, Server Validation, and Admin Order Brief will immediately reflect your changes.
