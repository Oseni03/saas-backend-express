# Documentation Hub

This directory contains comprehensive documentation for the Express SaaS Boilerplate project.

## Quick Navigation

### 📚 Documentation Files

| Document | Purpose | Audience |
|----------|---------|----------|
| **[API.md](API.md)** | Complete REST API reference with all endpoints, request/response examples, error codes | Frontend developers, API consumers |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design, authentication flows, authorization model, data flow diagrams | Backend developers, architects |
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Development setup, code patterns, adding features, database changes | Backend developers, contributors |
| **[issues/](issues/)** | Feature implementation requirements and acceptance criteria | Product managers, developers |

---

## 🚀 Getting Started

### For Frontend Developers
1. **Start here:** [API.md](API.md) - Understand all available endpoints
2. **Auth flow:** [ARCHITECTURE.md](ARCHITECTURE.md#authentication-flows) - Learn authentication patterns
3. **Data models:** [API.md](API.md#data-models) - Understand data structures

### For Backend Developers
1. **Setup:** [DEVELOPMENT.md](DEVELOPMENT.md#project-structure) - Project structure overview
2. **Patterns:** [DEVELOPMENT.md](DEVELOPMENT.md#code-patterns--conventions) - Code conventions
3. **New features:** [DEVELOPMENT.md](DEVELOPMENT.md#adding-new-endpoints) - Step-by-step guide
4. **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) - System design and flows

### For Architects
1. **Overview:** [ARCHITECTURE.md](ARCHITECTURE.md#system-architecture) - High-level architecture
2. **Data model:** [ARCHITECTURE.md](ARCHITECTURE.md#database-schema-overview) - Database design
3. **Security:** [ARCHITECTURE.md](ARCHITECTURE.md#security-considerations) - Security practices
4. **Flows:** [ARCHITECTURE.md](ARCHITECTURE.md#data-flow-diagrams) - Business process flows

---

## 📖 API Documentation Highlights

### Key Endpoints

**Authentication:**
```
POST   /api/v1/auth/register          Create account
POST   /api/v1/auth/login             Sign in
POST   /api/v1/auth/refresh           Get new access token
GET    /api/v1/auth/me                Current user
```

**Multi-Factor Authentication:**
```
POST   /api/v1/mfa/setup              Enable MFA
POST   /api/v1/mfa/verify?code=...    Confirm MFA setup
POST   /api/v1/mfa/validate?code=...  Complete MFA login
```

**Organizations:**
```
POST   /api/v1/organizations          Create org
GET    /api/v1/organizations          List user's orgs
GET    /api/v1/organizations/{id}     Get org details
PATCH  /api/v1/organizations/{id}     Update org
```

**Billing:**
```
POST   /api/v1/billing/organizations/{id}/initialize  Start payment
GET    /api/v1/billing/verify                         Verify payment
```

**Admin:**
```
GET    /api/v1/admin/stats            System statistics
GET    /api/v1/admin/users            All users
GET    /api/v1/admin/organizations    All organizations
```

**OAuth:**
```
GET    /api/v1/auth/oauth/google      Google login URL
GET    /api/v1/auth/oauth/github      GitHub login URL
```

Full reference: [API.md - Complete Endpoints](API.md#table-of-contents)

---

## 🏗️ Architecture Highlights

### Three-Tier Architecture

```
Controllers (HTTP Handlers)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Database (PostgreSQL)
```

### Authentication Types

1. **Email/Password** - Traditional username/password
2. **OAuth** - Google & GitHub integration
3. **MFA** - TOTP-based two-factor authentication
4. **Tokens** - JWT-based access/refresh pattern

### Role-Based Access Control

```
User Types:
  - System Admin (isSuperuser=true) → Full system access
  - Org Admin (ADMIN role in org) → Organization management
  - Org Member (MEMBER role) → Standard member privileges
  - Org Viewer (VIEWER role) → Read-only access
```

Full details: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 🛠️ Development Workflow

### Adding a New Endpoint

**Step-by-step guide in 5 parts:**
1. Define route with validation
2. Create controller
3. Create service
4. Create repository
5. Register route

[Full walkthrough: DEVELOPMENT.md - Adding New Endpoints](DEVELOPMENT.md#adding-new-endpoints)

### Database Changes

**Process:**
1. Update `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name {description}`
3. Update repositories
4. Write tests
5. Run migrations: `npx prisma migrate deploy`

[Detailed steps: DEVELOPMENT.md - Database Schema Changes](DEVELOPMENT.md#database-schema-changes)

### Testing

```bash
npm test                  # Run all tests
npm test -- file.test.ts # Run specific file
npm test:watch          # Watch mode
npm test:coverage       # Coverage report
```

[Testing patterns: DEVELOPMENT.md - Testing Patterns](DEVELOPMENT.md#testing-patterns)

---

## 🔐 Security Features

- **Password Security:** bcryptjs hashing with 10 salt rounds
- **Token Security:** JWT with 32+ character secrets, short expiries
- **MFA Support:** TOTP codes with ±30 second window
- **Database:** Encrypted secrets, audit logging, SQL injection protection
- **API:** Rate limiting (60 req/min), CORS, Helmet security headers
- **OAuth:** State parameter CSRF protection, verified providers

See: [ARCHITECTURE.md - Security Considerations](ARCHITECTURE.md#security-considerations)

---

## 📊 Data Models

### Core Models

**User** - User account with auth credentials
```json
{ "id", "email", "full_name", "is_verified", "mfa_enabled", "created_at" }
```

**Organization** - Multi-tenant workspace
```json
{ "id", "name", "slug", "plan", "created_at" }
```

**Membership** - User + Org + Role relationship
```json
{ "user_id", "organization_id", "role" }
```

**Subscription** - Billing information
```json
{ "organization_id", "status", "period_start", "period_end" }
```

**AuditLog** - Activity tracking
```json
{ "user_id", "organization_id", "action", "resource_type", "meta" }
```

Full schema: [API.md - Data Models](API.md#data-models)

---

## 🔄 Key Flows

### Registration & Email Verification

```
User Registration
  → Create account
  → Send verification email
  → User clicks link
  → Email verified
  → Can use account normally
```

### Login with MFA

```
Login (email/password)
  → Check if MFA enabled
  → If yes: Return mfa_pending token (5 min expiry)
  → User enters TOTP code
  → Validate code
  → Return full TokenPair
  → Access API with access_token
```

### OAuth Login

```
Click "Login with Google"
  → Get authorization URL
  → User grants permissions
  → Google redirects with code
  → Exchange code for tokens
  → Create/login user
  → Return TokenPair
```

### Subscription Payment

```
Initiate Payment
  → Select plan
  → Get Paystack checkout URL
  → User completes payment
  → Paystack redirects back
  → Verify payment
  → Activate subscription
```

Full flows: [ARCHITECTURE.md - Data Flow Diagrams](ARCHITECTURE.md#data-flow-diagrams)

---

## 🎯 Common Tasks

### View Database
```bash
npx prisma studio
```

### Generate Types
```bash
npx prisma generate
```

### Reset Database (Development Only!)
```bash
npx prisma migrate reset
```

### Seed Sample Data
```bash
npm run db:seed
```

### Check Linting
```bash
npm run lint
npm run lint:fix
npm run typecheck
```

More tasks: [DEVELOPMENT.md - Common Tasks](DEVELOPMENT.md#common-tasks)

---

## ⚠️ Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| **401 Unauthorized** | Token expired? Use refresh endpoint |
| **Database connection failed** | Start PostgreSQL: `docker-compose up -d` |
| **Validation errors (422)** | Check Zod schema constraints |
| **MFA code invalid** | Sync system time, verify secret |
| **CORS errors** | Check FRONTEND_URL environment variable |

[Full troubleshooting guide: DEVELOPMENT.md - Troubleshooting](DEVELOPMENT.md#troubleshooting)

---

## 📋 Issue Tracker

Feature requests and implementation details stored in [issues/](issues/):

| Issue | Status | Description |
|-------|--------|-------------|
| **#001** | ✅ Completed | Convert all API responses to snake_case |
| **#002** | ✅ Completed | OAuth return authorization URLs |
| **#003** | ✅ Completed | Implement MFA pending token flow |
| **#004** | ✅ Completed | Migrate MFA code to query parameters |
| **#005** | ✅ Completed | Add admin role requirement |

---

## 🔗 External References

- **Express.js:** https://expressjs.com/
- **TypeScript:** https://www.typescriptlang.org/
- **Prisma:** https://www.prisma.io/
- **Zod:** https://zod.dev/
- **JWT:** https://jwt.io/
- **Paystack:** https://paystack.com/docs/

---

## 📝 Project Structure Summary

```
/
├── src/                 # Source code
│   ├── controllers/     # HTTP request handlers
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   ├── repositories/   # Database queries
│   ├── middleware/     # Express middleware
│   ├── lib/           # Utilities & helpers
│   └── types/         # TypeScript definitions
├── tests/             # Test files
├── prisma/            # Database schema & migrations
├── context/           # Documentation (this folder)
├── docker-compose.yml # Local development setup
└── package.json       # Dependencies
```

---

## 🤝 Contributing

When adding new features:

1. **Update relevant documentation** in this folder
2. **Create issue** in [issues/](issues/) with acceptance criteria
3. **Follow code patterns** from [DEVELOPMENT.md](DEVELOPMENT.md)
4. **Write tests** before implementing
5. **Update API docs** in [API.md](API.md) if adding endpoints
6. **Update architecture docs** if changing data flows

---

## 📞 Support

For questions about:
- **API usage:** See [API.md](API.md)
- **Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Development:** See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Feature details:** See [issues/](issues/)

---

**Last Updated:** July 2024  
**Version:** 1.0.0
