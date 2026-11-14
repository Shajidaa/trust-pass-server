# Trust Pass — Server API

A RESTful backend for the **Trust Pass** platform — a business verification and trust scoring system that helps customers find trustworthy, verified businesses and gives sellers a place to manage their stores, products, and payments.

Built with Express, Prisma, and Better Auth.

> **Setting up the project locally?** See **[HowToSetup.md](./HowToSetup.md)** for installation, environment, database, and run commands.

---

## Description

Trust Pass connects buyers with businesses while making trust measurable. Sellers register, create businesses, list products, and submit documents for verification. Moderators review those submissions and approve or reject them, which feeds into a configurable **trust score** for each business. Customers can browse businesses, report bad actors, and rely on the trust score plus verification badges to decide who to buy from.

The server exposes a versioned REST API (`/api/v1`) with role-based access control, OTP-based email verification, Google OAuth, bKash payments for paid product slots, and a consistent JSON response envelope.

---

## Features

- **Authentication & Sessions**
  - Email/password registration with **6-digit OTP** email verification (10-minute expiry)
  - Google OAuth sign-in (optional)
  - Bearer token + cookie-based sessions
  - Change password, logout, and automatic session revocation on ban

- **User & Profile Management**
  - Self profile view/update (name, phone, gender, links)
  - Profile photo upload via Cloudinary
  - Admin: role updates, ban/unban (`BLOCKED` ↔ `ACTIVE`), delete users

- **Business Management**
  - Full CRUD with slug-based public pages
  - Address model covering Bangladesh divisions + country
  - Business types: Individual, Company, NGO, Government, Other
  - Public listing with pagination

- **Product Management**
  - Full CRUD with slug-based public pages
  - Categorization, status (Draft / Active / Inactive / Deleted)
  - Free listing quota + paid slots via bKash

- **Verification & Documents**
  - Sellers submit businesses for verification with supporting documents
  - Document types: Trade License, NID, TIN, VAT, Bank Statement, Utility Bill
  - Moderator review flow: Pending → Under Review → Approved / Rejected / Suspended
  - Cloudinary-hosted documents with approval status

- **Trust Scoring**
  - Per-business trust score history
  - Moderators/Admins can trigger recalculation
  - Configurable **trust rules** (Verification, Active, Inactive, Report) managed by Admin

- **Payments (bKash)**
  - Initiate + execute bKash payments for product listing slots
  - Free quota check, payment history, live status queries
  - Admin/Moderator view of all platform payments

- **Reports**
  - Customers/Sellers report businesses (Spam, Inappropriate, Harassment, Fraud, Other)
  - Moderator/Admin review and status updates

- **Notifications**
  - In-app notifications with unread counts
  - Mark read (single / all), delete read/all
  - Admin targeted sends + broadcasts across multiple notification types

- **Admin Dashboard**
  - Platform-wide stats
  - Paginated, filterable user/business/report/payment management

- **Cross-Cutting**
  - Zod request validation on every mutating endpoint
  - Centralized global error handler + 404 handler
  - Consistent JSON response envelope with pagination metadata

---

## Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Runtime      | Node.js (ESM)                                                     |
| Framework    | Express 5                                                         |
| Language     | TypeScript 7                                                      |
| ORM          | Prisma 7 (PostgreSQL via `@prisma/adapter-pg` + `pg`)             |
| Auth         | Better Auth (email/password, Google OAuth, OTP, bearer, sessions) |
| File Storage | Cloudinary                                                        |
| Payments     | bKash                                                             |
| Email        | Nodemailer / Resend (EJS templates)                               |
| Validation   | Zod                                                               |
| Uploads      | Multer                                                            |
| Cache        | Redis                                                             |
| WebSocket    | ws                                                                |
| Build        | tsup                                                              |
| Dev runner   | tsx                                                               |
| Deploy       | Vercel                                                            |

---

## API Reference

Base path: `/api/v1`

### Auth — `/auth`

| Method | Endpoint           | Access | Description                   |
| ------ | ------------------ | ------ | ----------------------------- |
| POST   | `/register`        | Public | Register a new account        |
| POST   | `/verify-otp`      | Public | Verify email with 6-digit OTP |
| POST   | `/resend-otp`      | Public | Resend OTP to email           |
| POST   | `/login`           | Public | Login with email & password   |
| POST   | `/logout`          | Auth   | Logout current session        |
| POST   | `/change-password` | Auth   | Change account password       |

> Google OAuth is handled automatically at `/api/auth/*` via Better Auth.

### Users — `/users`

| Method | Endpoint      | Access | Description                                |
| ------ | ------------- | ------ | ------------------------------------------ |
| GET    | `/me`         | Auth   | Get current user                           |
| PATCH  | `/me`         | Auth   | Update name, phone, gender                 |
| GET    | `/:id`        | Admin  | Get any user by ID                         |
| PATCH  | `/:id/role`   | Admin  | Update user role                           |
| PATCH  | `/:id/status` | Admin  | Ban (`BLOCKED`) or unban (`ACTIVE`) a user |
| DELETE | `/:id`        | Admin  | Delete a user                              |

### Profile — `/profile`

| Method | Endpoint    | Access | Description          |
| ------ | ----------- | ------ | -------------------- |
| GET    | `/me`       | Auth   | Get own profile      |
| PATCH  | `/me`       | Auth   | Update profile links |
| POST   | `/me/photo` | Auth   | Upload profile photo |

### Businesses — `/businesses`

| Method | Endpoint        | Access         | Description                     |
| ------ | --------------- | -------------- | ------------------------------- |
| GET    | `/`             | Public         | List all businesses (paginated) |
| GET    | `/slug/:slug`   | Public         | Get business by slug            |
| GET    | `/:id`          | Public         | Get business by ID              |
| GET    | `/:id/products` | Public         | List products for a business    |
| GET    | `/me`           | Seller         | Get own businesses              |
| POST   | `/`             | Seller         | Create a business               |
| PATCH  | `/:id`          | Seller         | Update business details         |
| PATCH  | `/:id/address`  | Seller         | Update business address         |
| DELETE | `/:id`          | Seller / Admin | Delete a business               |

### Products — `/products`

| Method | Endpoint      | Access                     | Description         |
| ------ | ------------- | -------------------------- | ------------------- |
| GET    | `/`           | Public                     | List all products   |
| GET    | `/slug/:slug` | Public                     | Get product by slug |
| GET    | `/:id`        | Public                     | Get product by ID   |
| POST   | `/`           | Seller                     | Create a product    |
| PATCH  | `/:id`        | Seller                     | Update a product    |
| DELETE | `/:id`        | Seller / Admin / Moderator | Delete a product    |

### Categories — `/categories`

| Method | Endpoint | Access | Description         |
| ------ | -------- | ------ | ------------------- |
| GET    | `/`      | Public | List all categories |
| GET    | `/:id`   | Public | Get category by ID  |
| POST   | `/`      | Admin  | Create a category   |
| PATCH  | `/:id`   | Admin  | Update a category   |
| DELETE | `/:id`   | Admin  | Delete a category   |

### Payments — `/payments`

| Method | Endpoint            | Access            | Description                      |
| ------ | ------------------- | ----------------- | -------------------------------- |
| GET    | `/quota`            | Seller            | Check free product listing quota |
| POST   | `/bkash/create`     | Seller            | Initiate a bKash payment         |
| POST   | `/bkash/execute`    | Seller            | Execute a bKash payment          |
| GET    | `/bkash/callback`   | Public            | bKash redirect callback          |
| GET    | `/my-payments`      | Seller            | Own payment history              |
| GET    | `/admin/all`        | Admin / Moderator | All platform payments            |
| GET    | `/:id/bkash-status` | Seller / Admin    | Query live bKash status          |
| GET    | `/:id`              | Seller / Admin    | Get payment by ID                |

### Trust — `/trust-scores` & `/trust-rules`

| Method | Endpoint                                 | Access            | Description                        |
| ------ | ---------------------------------------- | ----------------- | ---------------------------------- |
| GET    | `/trust-scores/business/:id`             | Public            | Trust score history for a business |
| POST   | `/trust-scores/business/:id/recalculate` | Moderator / Admin | Recalculate a business trust score |
| GET    | `/trust-rules`                           | Moderator / Admin | List trust rules                   |
| POST   | `/trust-rules`                           | Admin             | Create a trust rule                |
| PATCH  | `/trust-rules/:id`                       | Admin             | Update a trust rule                |
| DELETE | `/trust-rules/:id`                       | Admin             | Delete a trust rule                |

### Verification — `/verifications` & `/businesses/:id/verify`

| Method | Endpoint                    | Access            | Description                      |
| ------ | --------------------------- | ----------------- | -------------------------------- |
| POST   | `/businesses/:id/verify`    | Seller            | Submit business for verification |
| GET    | `/verifications`            | Moderator / Admin | List all verifications           |
| GET    | `/verifications/:id`        | Moderator / Admin | Get verification details         |
| PATCH  | `/verifications/:id/review` | Moderator / Admin | Approve or reject verification   |

### Documents — `/documents` & `/businesses/:id/documents`

| Method | Endpoint                    | Access | Description                   |
| ------ | --------------------------- | ------ | ----------------------------- |
| GET    | `/businesses/:id/documents` | Auth   | List documents for a business |
| GET    | `/documents/:id`            | Auth   | Get a document                |

### Reports — `/reports`

| Method | Endpoint      | Access            | Description                        |
| ------ | ------------- | ----------------- | ---------------------------------- |
| POST   | `/`           | Customer / Seller | Submit a report against a business |
| GET    | `/me`         | Customer / Seller | Own submitted reports              |
| GET    | `/`           | Moderator / Admin | List all reports                   |
| GET    | `/:id`        | Auth              | Get report by ID                   |
| PATCH  | `/:id/status` | Moderator / Admin | Update report status               |

### Notifications — `/notifications`

| Method | Endpoint           | Access            | Description                   |
| ------ | ------------------ | ----------------- | ----------------------------- |
| GET    | `/`                | Auth              | List own notifications        |
| GET    | `/unread-count`    | Auth              | Get unread count              |
| PATCH  | `/read-all`        | Auth              | Mark all as read              |
| PATCH  | `/:id/read`        | Auth              | Mark one as read              |
| DELETE | `/read`            | Auth              | Delete all read notifications |
| DELETE | `/:id`             | Auth              | Delete a notification         |
| POST   | `/admin/send`      | Admin / Moderator | Send a targeted notification  |
| POST   | `/admin/broadcast` | Admin / Moderator | Broadcast to all or subset    |

### Admin — `/admin`

| Method | Endpoint      | Access            | Description                            |
| ------ | ------------- | ----------------- | -------------------------------------- |
| GET    | `/dashboard`  | Admin             | Platform-wide stats                    |
| GET    | `/users`      | Admin / Moderator | All users (paginated, filterable)      |
| GET    | `/businesses` | Admin             | All businesses                         |
| GET    | `/reports`    | Admin             | All reports                            |
| GET    | `/payments`   | Admin             | All payments with business & user info |

---

## Roles & Permissions

| Role        | Description                                           |
| ----------- | ----------------------------------------------------- |
| `CUSTOMER`  | Can browse, report businesses                         |
| `SELLER`    | Can manage businesses, products, payments             |
| `MODERATOR` | Can review verifications, reports, manage users       |
| `ADMIN`     | Full access including user ban/unban and role changes |

### User Status

| Status      | Behavior                                      |
| ----------- | --------------------------------------------- |
| `ACTIVE`    | Normal access                                 |
| `BLOCKED`   | Banned — all sessions revoked, login rejected |
| `SUSPENDED` | Temporarily restricted                        |
| `DELETED`   | Account removed                               |

---

## Response Format

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully.",
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPage": 5 },
  "data": {}
}
```

Errors follow the same shape with `success: false` and an `errorSources` array.

---

## License

ISC
