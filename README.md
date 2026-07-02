# Express SaaS Boilerplate

Production-ready **Express.js + TypeScript** backend with auth, multi-tenant orgs, Paystack billing, transactional email, MFA, notifications, audit logs, and full observability.

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 + TypeScript 5 |
| Framework | Express 4 |
| Database | PostgreSQL via **Prisma** |
| Cache | Redis (ioredis) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| Email | Resend |
| Billing | Paystack |
| Logging | Pino (structured JSON) |
| Error tracking | Sentry |
| Testing | Vitest + Supertest |

## Project Structure

```
src/
├── app.ts               # Express factory — no listen(), fully testable
├── server.ts            # Entry point — binds port, graceful shutdown
├── config/              # Zod-validated env config
├── routes/v1/           # Thin route files (one per domain)
├── controllers/         # Request/response only — delegate to services
├── services/            # Business logic (framework-agnostic)
├── repositories/        # All DB access via Prisma
├── middleware/          # auth, validation, errors, rate limiting
├── lib/                 # prisma, redis, jwt, crypto, email, logger
└── types/               # Shared types, Express augmentation
```

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Fill in your secrets (at minimum DATABASE_URL, JWT_ACCESS_SECRET,
# JWT_REFRESH_SECRET, APP_SECRET_KEY)

# 2. Install dependencies
npm install

# 3. Start infrastructure (Postgres + Redis)
docker compose up db redis -d

# 4. Generate Prisma client & run migrations
npx prisma generate
npx prisma migrate deploy

# 5. (Optional) Seed dev data
npx tsx scripts/seed.ts

# 6. Start the dev server (hot-reload)
npm run dev
```

## API Endpoints

```
GET  /api/v1/health
GET  /api/v1/ready

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/verify-email
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me

GET  /api/v1/oauth/google
GET  /api/v1/oauth/google/callback
GET  /api/v1/oauth/github
GET  /api/v1/oauth/github/callback

GET    /api/v1/users/me
PATCH  /api/v1/users/me
POST   /api/v1/users/me/change-password
DELETE /api/v1/users/me

POST   /api/v1/mfa/setup
POST   /api/v1/mfa/verify
POST   /api/v1/mfa/disable
POST   /api/v1/mfa/validate

POST   /api/v1/organizations
GET    /api/v1/organizations
GET    /api/v1/organizations/:orgId
PATCH  /api/v1/organizations/:orgId
DELETE /api/v1/organizations/:orgId
GET    /api/v1/organizations/:orgId/members
PATCH  /api/v1/organizations/:orgId/members/:userId
DELETE /api/v1/organizations/:orgId/members/:userId
GET    /api/v1/organizations/:orgId/invitations
POST   /api/v1/organizations/:orgId/invitations
POST   /api/v1/organizations/invitations/accept

POST /api/v1/billing/organizations/:orgId/initialize
GET  /api/v1/billing/organizations/:orgId/manage
POST /api/v1/billing/organizations/:orgId/cancel
GET  /api/v1/billing/verify?reference=xxx
POST /api/v1/billing/webhooks/paystack

GET  /api/v1/notifications
POST /api/v1/notifications/:id/read
POST /api/v1/notifications/read-all

GET   /api/v1/admin/stats
GET   /api/v1/admin/users
GET   /api/v1/admin/organizations
PATCH /api/v1/admin/users/:userId/deactivate
PATCH /api/v1/admin/users/:userId/activate
```

## Commands

```bash
npm run dev            # Start dev server with hot-reload (tsx watch)
npm run build          # Compile TypeScript to dist/
npm start              # Run production build (node dist/server.js)
npm run test           # Run tests
npm run test:coverage  # Run tests with coverage
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck      # tsc --noEmit

npx prisma migrate deploy   # Apply Prisma migrations
npx prisma migrate dev      # Create & apply dev migrations
npx prisma studio           # Open Prisma Studio (DB GUI)
npx tsx scripts/seed.ts     # Seed dev data

docker compose up -d        # Start Postgres + Redis
docker compose stop         # Stop all containers
```

## Paystack Billing Flow

Paystack works differently from Stripe — there is no hosted checkout session object. The flow is:

```
1. POST /billing/organizations/:orgId/initialize
      body: { plan: "PRO", callbackUrl: "https://yourapp.com/billing/callback" }
   ← returns { authorizationUrl }

2. Frontend redirects user to authorizationUrl (Paystack-hosted payment page)

3. User pays → Paystack redirects to callbackUrl?reference=xxx

4. Frontend calls GET /billing/verify?reference=xxx
   ← returns { plan, organizationId } — your DB is now updated

5. Subscription management:
   GET  /billing/organizations/:orgId/manage  → { manageUrl }  (links to your own billing UI)
   POST /billing/organizations/:orgId/cancel  → 204

6. Webhooks at POST /billing/webhooks/paystack
   Events handled:
     charge.success          → syncs plan on org
     subscription.create     → upserts Subscription record
     subscription.disable    → sets plan back to FREE
     invoice.payment_failed  → marks subscription as PAST_DUE
```

**Environment variables needed:**
```
PAYSTACK_SECRET_KEY=sk_test_xxx        # From Paystack dashboard → Settings → API
PAYSTACK_WEBHOOK_SECRET=your-phrase    # Settings → Webhooks → Secret hash
PAYSTACK_PRO_PLAN_CODE=PLN_xxx         # Subscriptions → Plans → Plan code
PAYSTACK_ENTERPRISE_PLAN_CODE=PLN_xxx
```

## Architecture Decisions

- **`app.ts` is a factory** — no side effects on import, fully testable with Supertest
- **Thin controllers** — validate input (via Zod middleware), call a service, return JSON
- **Services own business logic** — no `req`/`res`, no Prisma in controllers
- **Repositories abstract the DB** — swap Prisma for anything without touching services
- **Zod everywhere** — schemas defined alongside services, reused in route validators
- **Raw body for Paystack** — `/billing/webhooks/paystack` uses `express.raw()` before JSON middleware; HMAC-SHA512 verified against `x-paystack-signature`
- **Graceful shutdown** — drains connections on SIGTERM before exiting
