# Changelog

All notable changes to the **Trust Pass Server** project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-12

Initial release of the Trust Pass backend — a business verification and trust
scoring platform API.

### Added

#### Authentication & Authorization
- Email/password registration with 6-digit OTP email verification (10-minute expiry) via Better Auth
- Google OAuth social sign-in (optional, configurable)
- Bearer token and cookie-based sessions
- Login, logout, and change-password endpoints
- Email verification required before sign-in is allowed
- Session revocation when an account is blocked, suspended, or deleted

#### User Management
- Current user profile retrieval and self-update (name, phone, gender)
- Profile photo upload (Cloudinary-hosted)
- Admin endpoints to fetch any user, change roles, ban/unban, and delete users
- User status model: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `BLOCKED`, `DELETED`
- Role model: `CUSTOMER`, `SELLER`, `MODERATOR`, `ADMIN`

#### Business Management
- Full business CRUD for sellers
- Slug-based public business pages
- Public paginated business listing
- Business address model supporting Bangladesh divisions and countries
- Business types: Individual, Company, NGO, Government, Other
- Nested public route for a business's products (`/businesses/:id/products`)

#### Product Management
- Full product CRUD for sellers
- Slug-based public product pages
- Public product listing and per-business product listing
- Product statuses: Draft, Active, Inactive, Deleted
- Product image uploads (up to 10 images, Cloudinary-hosted)

#### Categories
- Public category listing and detail
- Admin-only create, update, and delete

#### Payments (bKash)
- Free product-listing quota check per seller
- bKash payment initiation and execution for extra product slots
- bKash redirect callback handling
- Seller payment history and per-payment live bKash status query
- Admin/moderator view of all platform payments

#### Trust Scoring
- Per-business trust score history (public)
- Moderator/admin trust score recalculation
- Configurable trust rules (Verification, Active, Inactive, Report)
- Admin-only trust rule create, update, and delete

#### Verification & Documents
- Seller business verification submission with supporting documents
- Document types: Trade License, NID, TIN Certificate, VAT Certificate, Bank Statement, Utility Bill
- Cloudinary-hosted documents with approval status
- Moderator/admin verification review: list, detail, approve, reject, suspend
- Business verification statuses: Pending, Under Review, Approved, Rejected, Suspended

#### Reports
- Customer/seller report submission against a business (Spam, Inappropriate, Harassment, Fraud, Other)
- Own submitted reports view
- Moderator/admin report listing, detail, and status updates (Pending, Reviewed, Resolved, Rejected)

#### Notifications
- In-app notifications with unread counts
- Mark single or all notifications as read
- Delete read notifications and individual notifications
- Admin targeted sends and broadcasts across multiple notification types (System, Account, Business, Verification, Report, Trust Score, Product, Promotion)

#### Admin Dashboard
- Platform-wide statistics
- Paginated, filterable user management
- Business, report, and payment overviews with related business and user info

#### Infrastructure & Cross-Cutting
- Express 5 application with versioned API base path `/api/v1`
- Better Auth mounted natively at `/api/auth/*` for OAuth and internal flows
- Centralized environment configuration (`src/app/config`)
- Prisma 7 ORM with multi-file schema and PostgreSQL driver adapter (`@prisma/adapter-pg`)
- Zod request validation on all mutating endpoints
- `AppError` operational error class with central global error handler
- 404 not-found handler
- Unified JSON response envelope with pagination metadata for list endpoints
- Consistent error envelope normalizing Zod, AppError, Prisma (`P2002`/`P2025`), and Better Auth errors
- Multer memory-storage uploads (images and PDFs, 5 MB cap) streamed to Cloudinary
- Resend/SMTP transactional email with EJS templates for OTP and verification
- TypeScript strict mode, ESM build via tsup
- Vercel deployment configuration
