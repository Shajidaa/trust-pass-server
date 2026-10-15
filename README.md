# Trust Pass — Server API

A RESTful backend for the Trust Pass platform — a business verification and trust scoring system. Built with Express, Prisma, and Better Auth.

---

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express 5
- **Language:** TypeScript
- **ORM:** Prisma 7 (PostgreSQL)
- **Auth:** Better Auth (email/password + Google OAuth, OTP email verification)
- **Storage:** Cloudinary (images & documents)
- **Payments:** bKash
- **Email:** Nodemailer / Resend
- **Validation:** Zod
- **Deploy:** Vercel

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL database
- A Cloudinary account
- A bKash merchant account (for payments)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | Frontend origin URL |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Min 32-char secret for Better Auth |
| `BETTER_AUTH_URL` | Base URL of this server |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (optional) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `BKASH_BASE_URL` | bKash API base URL |
| `BKASH_USERNAME` | bKash merchant username |
| `BKASH_PASSWORD` | bKash merchant password |
| `BKASH_APP_KEY` | bKash app key |
| `BKASH_APP_SECRET` | bKash app secret |

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npx prisma migrate deploy
```

### Running

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build
npm start
```

---

## Project Structure

```
src/
├── app.ts                  # Express app setup
├── server.ts               # Server entry point
└── app/
    ├── config/             # Environment config
    ├── errors/             # AppError class
    ├── libs/               # Prisma, Auth, Cloudinary clients
    ├── middlewares/        # auth, validation, upload, error handler
    ├── utils/              # catchAsync, sendResponse, email
    └── v1/
        ├── routes/         # Root v1 router
        └── modules/
            ├── admin/
            ├── auth/
            ├── business/
            ├── category/
            ├── document/
            ├── notification/
            ├── payment/
            ├── product/
            ├── report/
            ├── trust/
            ├── user/
            └── verification/
```

Each module follows the same pattern: `route → controller → service → validation`.

---

## API Reference

Base path: `/api/v1`

### Auth — `/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new account |
| POST | `/verify-otp` | Public | Verify email with 6-digit OTP |
| POST | `/resend-otp` | Public | Resend OTP to email |
| POST | `/login` | Public | Login with email & password |
| POST | `/logout` | Auth | Logout current session |
| POST | `/change-password` | Auth | Change account password |

> Google OAuth is handled automatically at `/api/auth/*` via Better Auth.

---

### Users — `/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/me` | Auth | Get current user |
| PATCH | `/me` | Auth | Update name, phone, gender |
| GET | `/:id` | Admin | Get any user by ID |
| PATCH | `/:id/role` | Admin | Update user role |
| PATCH | `/:id/status` | Admin | Ban (`BLOCKED`) or unban (`ACTIVE`) a user |
| DELETE | `/:id` | Admin | Delete a user |

### Profile — `/profile`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/me` | Auth | Get own profile |
| PATCH | `/me` | Auth | Update profile links |
| POST | `/me/photo` | Auth | Upload profile photo |

---

### Businesses — `/businesses`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List all businesses (paginated) |
| GET | `/slug/:slug` | Public | Get business by slug |
| GET | `/:id` | Public | Get business by ID |
| GET | `/:id/products` | Public | List products for a business |
| GET | `/me` | Seller | Get own businesses |
| POST | `/` | Seller | Create a business |
| PATCH | `/:id` | Seller | Update business details |
| PATCH | `/:id/address` | Seller | Update business address |
| DELETE | `/:id` | Seller / Admin | Delete a business |

---

### Products — `/products`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List all products |
| GET | `/slug/:slug` | Public | Get product by slug |
| GET | `/:id` | Public | Get product by ID |
| POST | `/` | Seller | Create a product |
| PATCH | `/:id` | Seller | Update a product |
| DELETE | `/:id` | Seller / Admin / Moderator | Delete a product |

---

### Payments — `/payments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/quota` | Seller | Check free product listing quota |
| POST | `/bkash/create` | Seller | Initiate a bKash payment |
| POST | `/bkash/execute` | Seller | Execute a bKash payment |
| GET | `/bkash/callback` | Public | bKash redirect callback |
| GET | `/my-payments` | Seller | Own payment history |
| GET | `/admin/all` | Admin / Moderator | All platform payments |
| GET | `/:id/bkash-status` | Seller / Admin | Query live bKash status |
| GET | `/:id` | Seller / Admin | Get payment by ID |

---

### Verification — `/verifications` & `/businesses/:id/verify`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/businesses/:id/verify` | Seller | Submit business for verification |
| GET | `/verifications` | Moderator / Admin | List all verifications |
| GET | `/verifications/:id` | Moderator / Admin | Get verification details |
| PATCH | `/verifications/:id/review` | Moderator / Admin | Approve or reject verification |

---

### Documents — `/documents` & `/businesses/:id/documents`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/businesses/:id/documents` | Auth | List documents for a business |
| GET | `/documents/:id` | Auth | Get a document |

---

### Reports — `/reports`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Customer / Seller | Submit a report against a business |
| GET | `/me` | Customer / Seller | Own submitted reports |
| GET | `/` | Moderator / Admin | List all reports |
| GET | `/:id` | Auth | Get report by ID |
| PATCH | `/:id/status` | Moderator / Admin | Update report status |

---

### Notifications — `/notifications`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | List own notifications |
| GET | `/unread-count` | Auth | Get unread count |
| PATCH | `/read-all` | Auth | Mark all as read |
| PATCH | `/:id/read` | Auth | Mark one as read |
| DELETE | `/read` | Auth | Delete all read notifications |
| DELETE | `/:id` | Auth | Delete a notification |
| POST | `/admin/send` | Admin / Moderator | Send a targeted notification |
| POST | `/admin/broadcast` | Admin / Moderator | Broadcast to all or subset |

---

### Admin — `/admin`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/dashboard` | Admin | Platform-wide stats |
| GET | `/users` | Admin / Moderator | All users (paginated, filterable) |
| GET | `/businesses` | Admin | All businesses |
| GET | `/reports` | Admin | All reports |
| GET | `/payments` | Admin | All payments with business & user info |

---

## Roles & Permissions

| Role | Description |
|---|---|
| `CUSTOMER` | Can browse, report businesses |
| `SELLER` | Can manage businesses, products, payments |
| `MODERATOR` | Can review verifications, reports, manage users |
| `ADMIN` | Full access including user ban/unban and role changes |

### User Status

| Status | Behavior |
|---|---|
| `ACTIVE` | Normal access |
| `BLOCKED` | Banned — all sessions revoked, login rejected |
| `SUSPENDED` | Temporarily restricted |
| `DELETED` | Account removed |

---

## Response Format

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully.",
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPage": 5 },
  "data": { }
}
```

Errors follow the same shape with `success: false` and an `errorSources` array.

---

## License

ISC
