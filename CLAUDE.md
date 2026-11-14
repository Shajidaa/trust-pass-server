# CLAUDE.md

Context guide for AI agents (and humans) working in the **Trust Pass Server** codebase.
For an overview, see [README.md](./README.md). For local setup, see [HowToSetup.md](./HowToSetup.md).

---

## Folder Structure

```
trust-pass-server/
├── prisma/
│   ├── schema/                 # Multi-file Prisma schema (Prisma 7)
│   │   ├── schema.prisma       # generator + datasource blocks
│   │   ├── enums.prisma        # all enums (Role, UserStatus, etc.)
│   │   ├── user.prisma
│   │   ├── account.prisma
│   │   ├── session.prisma
│   │   ├── profile.prisma
│   │   ├── business.prisma
│   │   ├── product.prisma
│   │   ├── category.prisma
│   │   ├── payment.prisma
│   │   ├── verification.prisma
│   │   ├── businessVerification.prisma
│   │   ├── document.prisma
│   │   ├── report.prisma
│   │   ├── notification.prisma
│   │   └── trust.prisma
│   └── migrations/             # Applied migration history
├── generated/                  # Prisma Client output (gitignored-ish; generated)
│   └── prisma/
├── src/
│   ├── server.ts               # Entry point — starts the HTTP server
│   ├── app.ts                  # Express app: CORS, Better Auth, routes, handlers
│   ├── @types/
│   │   └── express.d.ts        # Augments Express Request with user & session
│   └── app/
│       ├── config/
│       │   └── index.ts        # Central env config (single source of truth)
│       ├── errors/
│       │   └── AppError.ts     # Operational error class: { statusCode, isOperational }
│       ├── libs/               # Shared clients (singletons)
│       │   ├── auth.ts         # Better Auth instance + plugins
│       │   ├── prisma.ts       # PrismaClient via @prisma/adapter-pg
│       │   ├── cloudinary.ts   # Cloudinary config + uploader
│       │   └── bkash.ts        # bKash API client
│       ├── middlewares/
│       │   ├── auth.ts         # Session + role + status guard
│       │   ├── validateRequest.ts   # Zod body validation
│       │   ├── upload.ts       # Multer (memory storage) for files/images
│       │   ├── globalErrorHandler.ts
│       │   └── notFoundHandler.ts
│       ├── utils/
│       │   ├── catchAsync.ts   # Wraps handlers; forwards rejects to next()
│       │   ├── sendResponse.ts # Standard JSON response envelope
│       │   └── email.ts        # Email/OTP templated sending
│       ├── helpers/
│       │   └── hash.ts
│       ├── services/           # (Currently empty — reserve for cross-module services)
│       └── v1/
│           ├── routes/
│           │   └── index.ts    # Mounts all module routers under /api/v1
│           └── modules/        # One folder per domain feature
│               ├── auth/
│               ├── user/
│               ├── business/
│               ├── product/
│               ├── category/
│               ├── payment/
│               ├── trust/
│               ├── verification/
│               ├── document/
│               ├── report/
│               ├── notification/
│               └── admin/
├── prisma7.config.ts           # Prisma 7 config (schema dir, migrations, datasource)
├── tsup.config.ts              # Build config (ESM bundle -> dist/server.js)
├── tsconfig.json               # strict, ESNext, moduleResolution "bundler"
├── vercel.json                 # Deployment routing
└── package.json
```

### Module layout (the standard pattern)

Every domain module under `src/app/v1/modules/<name>/` follows this shape:

```
<name>/
├── <name>.route.ts        # Express Router; wires auth + validation + controller
├── <name>.controller.ts   # HTTP layer: reads req, calls service, sendResponse()
├── <name>.service.ts      # Business logic + Prisma calls; throws AppError
├── <name>.validation.ts   # Zod schemas for request bodies
└── <name>.interface.ts    # TypeScript types for payloads/responses
```

Known deviations from the standard naming (do not "fix" without checking imports):
- `auth/auth.contorller.ts` — typo in filename; exports `AuthController`. Other modules use `.controller.ts`.
- `auth/auth.router.ts` and `user/user.router.ts` — extra router files alongside the main `.route.ts`.
- `verification/verification.routes.ts` — uses the plural `.routes.ts` name and exports multiple routers.
- `admin/` — minimal: no `interface.ts` or `validation.ts`.

---

## Architecture

### Request lifecycle

```
HTTP request
  → app.ts (CORS → body parsers)
  → /api/auth/*splat  (Better Auth handles directly)
  → /api/v1/<module>  (v1Routes)
      → middleware: validateRequest(zodSchema)   # parses + reassigns req.body
      → middleware: auth(...roles)               # session + status + role check
      → middleware: upload (multer, if files)    # buffer in req.file(s)
      → controller (wrapped in catchAsync)       # reads req, calls service
          → service (Prisma + business logic)    # throws AppError on failure
      → sendResponse(res, { statusCode, success, message, meta?, data? })
  → notFoundHandler   (if no route matched)
  → globalErrorHandler (catches everything, normalizes into the envelope)
```

### Layers and their responsibilities

| Layer | File pattern | Responsibility | Allowed to |
|---|---|---|---|
| Route | `*.route.ts` | Define endpoints; attach middleware in order | Map HTTP → controller method |
| Controller | `*.controller.ts` | HTTP I/O only; no business logic | Read `req`, call service, `sendResponse` |
| Service | `*.service.ts` | Business logic, validation rules, Prisma queries | Throw `AppError`, call `prisma` |
| Validation | `*.validation.ts` | Zod schemas | Export schemas, no logic |
| Interface | `*.interface.ts` | TS types for payloads/results | Types only |
| Middleware | `middlewares/*.ts` | Cross-cutting: auth, upload, validation, errors | Short-circuit with errors |
| Libs | `libs/*.ts` | Shared singletons (auth, prisma, cloudinary, bkash) | Be imported by services/middleware |

### Key design decisions

- **Auth is delegated to Better Auth.** Session verification happens in `middlewares/auth.ts` by calling `auth.api.getSession({ headers })`. The custom `/auth` endpoints (register/OTP/login/logout/change-password) wrap Better Auth's internal APIs and forward `Set-Cookie` headers to the client. Do not hand-roll password hashing or session storage.
- **Two auth surfaces coexist:**
  - `/api/auth/*splat` — Better Auth's native handler (Google OAuth, etc.).
  - `/api/v1/auth/*` — custom endpoints for the email/OTP flow.
- **Prisma 7 with a driver adapter.** `libs/prisma.ts` instantiates `PrismaClient` with `@prisma/adapter-pg` (pg) using the connection string. The client is generated to `generated/prisma/` (see `prisma/schema/schema.prisma`), not the default location. Import the client from there, not from `@prisma/client`.
- **Multi-file schema.** Schema lives in `prisma/schema/` (multiple `.prisma` files). `prisma7.config.ts` points Prisma at this directory.
- **Errors are thrown, not returned.** Services throw `AppError(statusCode, message)`. Controllers never try/catch business errors — `catchAsync` forwards rejections to `globalErrorHandler`, which normalizes `ZodError`, `AppError`, Prisma `P2002`/`P2025`, and Better Auth errors into one envelope. Stack traces are only included when `NODE_ENV=development`.
- **Single response shape.** All success and error responses use the same envelope via `sendResponse` / `globalErrorHandler`:

  ```json
  { "success": true, "statusCode": 200, "message": "...", "meta": { }, "data": { } }
  ```
- **Env is centralized.** Read env vars only through `src/app/config/index.ts`, never `process.env` directly in modules (libs/config themselves excepted).
- **Role-based access.** `auth("SELLER", "ADMIN")` is variadic; the user's `role` (enum: `CUSTOMER`, `SELLER`, `MODERATOR`, `ADMIN`) must match one. `BLOCKED`/`SUSPENDED`/`DELETED` statuses are rejected before role checks.
- **Files never touch disk.** Multer uses `memoryStorage`; the buffer streams to Cloudinary. Allowed types and 5 MB cap are enforced in `middlewares/upload.ts`.

---

## Coding Rules

### TypeScript / project conventions

- **ESM only.** `package.json` sets `"type": "module"`. Use `import`/`export`, never `require` in source (the tsup banner injects a `require` shim for the bundle only).
- **Strict mode is on** (`tsconfig.json`). Avoid `any`; when unavoidable (Better Auth headers), use targeted `as any`/`as unknown as` casts at the boundary.
- **Module + target:** `module: ESNext`, `moduleResolution: "bundler"`, `target: ES2023`. Use extensionless relative imports (e.g. `./auth.service`).
- **No default exports for the module pattern.** Export grouped objects: `export const AuthController = { ... }`, `export const AuthService = { ... }`, `export const AuthValidation = { ... }`. Named exports of schemas/types are fine.
- **Validation before the controller.** Every mutating endpoint passes its body through `validateRequest(<zodSchema>)`. Define schemas in the module's `*.validation.ts`.
- **Controllers stay thin.** They read `req.body`/`req.params`/`req.user`, call one service method, and call `sendResponse`. No Prisma in controllers.
- **Services own business logic.** All `prisma.*` calls live in `*.service.ts`. Throw `AppError(httpStatus.X, "message")` for any expected failure; do not return error objects.
- **Use `catchAsync`** for every controller handler so rejected promises reach the global handler instead of hanging the request.
- **Emails:** lowercase + trim user input (see `email.toLowerCase().trim()` throughout auth service).

### Adding a new endpoint (checklist)

1. Add a Zod schema in `<module>.validation.ts`.
2. Add the service method in `<module>.service.ts` with Prisma calls and `AppError` guards.
3. Add a `catchAsync` controller method in `<module>.controller.ts` that calls the service and `sendResponse`.
4. Register the route in `<module>.route.ts` with the right `auth(...roles)` + `validateRequest` middleware order.
5. If it's a new module, mount its router in `src/app/v1/routes/index.ts`. Watch out for `/:id` catch-all routes — register nested/static routes before them.
6. Update the API reference table in [README.md](./README.md).

### Prisma workflow

- After editing any `prisma/schema/*.prisma`: run `npm run prisma:generate`.
- For schema changes that need migration: `npx prisma migrate dev --name <name>` (dev) or `npx prisma migrate deploy` (production).
- Import the client from `generated/prisma/client`, not `@prisma/client`.

### Auth middleware usage

```ts
import auth from "../../../middlewares/auth";

// Public (still requires a valid session, no role restriction)
router.get("/me", auth(), Controller.getMe);

// Role-restricted
router.post("/", auth("SELLER"), validateRequest(Schema), Controller.create);
router.delete("/:id", auth("SELLER", "ADMIN", "MODERATOR"), Controller.remove);
```

### File uploads

```ts
import { uploadSingle, uploadBusinessImages, uploadProductImages } from "../../../middlewares/upload";

router.post("/me/photo", auth(), uploadSingle, Controller.uploadPhoto);          // field "file"
router.post("/", auth("SELLER"), uploadBusinessImages, Controller.create);       // fields "logo" + "cover"
router.post("/", auth("SELLER"), uploadProductImages, Controller.create);        // field "images", up to 10
```

Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Max 5 MB per file.

---

## Testing Commands

There is **no test framework configured** in this project. The `test` script is a placeholder:

```bash
npm test
# -> "Error: no test specified" && exit 1
```

No test runner or assertion library is installed. Until one is added, rely on:

```bash
# Type-check the whole project (strict mode)
npx tsc --noEmit

# Build to catch bundling/import errors
npm run build

# Smoke-test locally
npm run dev          # then curl http://localhost:5000/
```

### When adding tests (recommended setup)

A sensible default for this stack is **Vitest** (ESM-native, works with `tsx`):

```bash
npm i -D vitest supertest
```

Add to `package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Create `vitest.config.ts` pointing at `src`, and co-locate `*.test.ts` files next to the modules they cover. Use `supertest` against the exported `app` from `src/app.ts` for integration tests (import the app, do not call `app.listen`).
