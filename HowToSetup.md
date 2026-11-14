# Trust Pass — Setup Guide

Step-by-step instructions to run the Trust Pass server locally and deploy it.
See [README.md](./README.md) for project overview and API reference.

---

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** database (local or hosted, e.g. Neon, Supabase, Render)
- A **Cloudinary** account (for image & document storage)
- A **Resend** account or **SMTP** server (for transactional email / OTP)
- A **bKash** merchant account (only needed for paid product-listing slots)

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd trust-pass-server

# 2. Install dependencies
npm install
```

This project uses the Prisma 7 generator with a custom output directory. After
installing, generate the Prisma Client (covered in Database Setup below).

---

## Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

The table below lists **every variable** the server reads. Required variables
must be set or the server will fail to start; optional ones have sensible
defaults or are only needed for specific features.

### Server

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `5000` | Port the Express server listens on |
| `NODE_ENV` | no | `development` | `development` or `production` (affects secure cookies) |
| `CLIENT_URL` | no | `http://localhost:3000` | Frontend origin (used for CORS) |
| `FRONTEND_URL` | no | `CLIENT_URL` | bKash success/cancel redirect target |
| `APP_NAME` | no | `Trust Pass` | App name used in email templates |

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string used by the app and Prisma |
| `DIRECT_URL` | no | — | Optional direct connection URL for Prisma migrations (e.g. pooled vs direct pool) |

Example: `postgresql://postgres:password@localhost:5432/trustpass_db`

### Better Auth

| Variable | Required | Default | Description |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | **yes** | — | Secret for signing auth tokens (min 32 characters) |
| `BETTER_AUTH_URL` | no | `http://localhost:5000` | Base URL of this server |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Cloudinary

| Variable | Required | Default | Description |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | **yes** | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **yes** | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | **yes** | — | Cloudinary API secret |

### Google OAuth (optional)

Leave both blank to disable Google sign-in.

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | no | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | no | — | Google OAuth client secret |

### Email (choose Resend OR SMTP)

Resend is preferred. If both are configured, the app uses whichever the email
utility is wired to read — set the provider you intend to use.

| Variable | Required | Default | Description |
|---|---|---|---|
| `RESEND_API_KEY` | yes* | — | Resend API key for transactional email |
| `EMAIL_FROM` | no | `Trust Pass <onboarding@resend.dev>` | From address used in emails |
| `EMAIL_SENDER` | no | `EMAIL_FROM` | Fallback for the From address |
| `SMTP_HOST` | alt* | — | SMTP host |
| `SMTP_PORT` | alt* | — | SMTP port |
| `SMTP_USER` | alt* | — | SMTP username |
| `SMTP_PASS` | alt* | — | SMTP password |

### bKash (payments)

Required only if you use paid product-listing slots.

| Variable | Required | Default | Description |
|---|---|---|---|
| `BKASH_BASE_URL` | yes* | — | bKash API base URL |
| `BKASH_USERNAME` | yes* | — | bKash merchant username |
| `BKASH_PASSWORD` | yes* | — | bKash merchant password |
| `BKASH_APP_KEY` | yes* | — | bKash app key |
| `BKASH_APP_SECRET` | yes* | — | bKash app secret |
| `BKASH_CALLBACK_URL` | no | `http://localhost:5000/api/v1/payments/bkash/callback` | bKash redirect callback URL |

### Business Logic (optional tuning)

| Variable | Required | Default | Description |
|---|---|---|---|
| `FREE_PRODUCT_LIMIT` | no | `5` | Free product listings per seller before paying |
| `PRODUCT_LISTING_FEE` | no | `500` | bKash charge (in BDT) for an extra product slot |

### Minimal `.env` to boot locally

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
APP_NAME=Trust Pass

DATABASE_URL=postgresql://postgres:password@localhost:5432/trustpass_db

BETTER_AUTH_SECRET=replace_with_a_32_char_min_random_string
BETTER_AUTH_URL=http://localhost:5000

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Trust Pass <onboarding@resend.dev>
```

---

## Database Setup

This project uses **Prisma 7** with a multi-file schema in `prisma/schema/`
and a custom config at `prisma7.config.ts`. The Prisma Client is generated
into `generated/prisma/`.

```bash
# 1. Generate the Prisma Client (required before first run)
npm run prisma:generate
# equivalent to: npx prisma generate

# 2. Apply existing migrations to your database
npx prisma migrate deploy
```

### Working with migrations during development

```bash
# Create a new migration from schema changes and apply it
npx prisma migrate dev --name <migration_name>

# Reset the database (drops all data and re-runs migrations) — destructive
npx prisma migrate reset

# Check current migration status
npx prisma migrate status
```

### Useful extras

```bash
# Open Prisma Studio to browse/edit data at http://localhost:5555
npx prisma studio

# Re-pull schema into the client after editing .prisma files
npx prisma generate
```

> There is no seed script in this repo. Seed data manually or via Prisma Studio.

---

## Run Commands

### Development (hot reload via tsx watch)

```bash
npm run dev
```

Server starts on `http://localhost:5000` (or the `PORT` you set). Health check:
`GET /` returns a JSON status message.

### Production

```bash
# Build with tsup -> dist/server.js
npm run build

# Run the compiled build
npm start
```

### Available scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | Development with hot reload |
| `build` | `tsup` | Bundle to `dist/server.js` (ESM) |
| `start` | `node dist/server.js` | Run the production build |
| `prisma:generate` | `prisma generate` | Regenerate the Prisma Client |

---

## Deployment (Vercel)

The repo ships a `vercel.json` that routes all traffic to the bundled
`dist/server.js`.

1. Set all **required** environment variables in the Vercel project dashboard.
2. Set `NODE_ENV=production` so secure cookies are enabled.
3. Set `BETTER_AUTH_URL` and `CLIENT_URL` to your production domains.
4. Vercel runs `npm run build` automatically; the output is served from `dist/`.
5. Run migrations against your production database:

   ```bash
   npx prisma migrate deploy
   ```
