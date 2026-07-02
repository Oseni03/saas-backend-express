# Architecture & Flows Documentation

**Version:** 1.0.0  
**Last Updated:** July 2024

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Authentication Flows](#authentication-flows)
3. [Authorization Model](#authorization-model)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Key Concepts](#key-concepts)
6. [Database Schema Overview](#database-schema-overview)
7. [Error Handling Strategy](#error-handling-strategy)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│                  (Web / Mobile / Desktop)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                        HTTPS/REST
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    Express.js API Server                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Route Handlers (Controllers)            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Middleware (Auth, Validation, Error Handling)   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Services (Business Logic)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Repositories (Data Access)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    PostgreSQL         Redis Cache      Paystack API
    (Primary DB)       (Sessions)      (Payments)
```

### Layered Architecture

```
┌─────────────────────────────────────────┐
│          API Routes (v1/*)              │
│  - RESTful endpoints                    │
│  - Request validation with Zod          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│      Middleware Pipeline                │
│  1. requestId - Request tracking        │
│  2. pino - HTTP request logging         │
│  3. helmet - Security headers           │
│  4. cors - Cross-origin policy          │
│  5. express.json - Parse JSON           │
│  6. authenticate - JWT validation       │
│  7. validate - Zod schema validation    │
│  8. errorHandler - Error responses      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│    Services (Business Logic)            │
│  - authService (auth flow)              │
│  - orgService (org management)          │
│  - billingService (payment handling)    │
│  - mfaService (TOTP logic)              │
│  - notificationService (notifications) │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│    Repositories (Data Access)           │
│  - userRepository                       │
│  - orgRepository                        │
│  - invitationRepository                 │
│  - auditLogRepository                   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│        Libraries (Utilities)            │
│  - jwt.ts (token signing/verification) │
│  - crypto.ts (password hashing, TOTP)  │
│  - email.ts (Resend integration)       │
│  - logger.ts (Pino logging)            │
│  - prisma.ts (Database client)         │
│  - redis.ts (Cache client)             │
└─────────────────────────────────────────┘
```

---

## Authentication Flows

### 1. Email/Password Registration & Login

#### Registration Flow

```
User → POST /auth/register
       └─ AuthController.register()
           └─ authService.register()
               ├─ Check email uniqueness
               ├─ Hash password with bcryptjs
               ├─ Create user record
               ├─ Generate verification token
               ├─ Send verification email
               └─ Issue TokenPair
       ← 201 Created + TokenPair

User → POST /auth/verify-email
       └─ AuthController.verifyEmail()
           └─ authService.verifyEmail()
               ├─ Hash token
               ├─ Find user by token
               └─ Update isVerified = true
       ← 200 OK + User details
```

#### Login Flow (No MFA)

```
User → POST /auth/login
       └─ AuthController.login()
           └─ authService.login()
               ├─ Find user by email
               ├─ Verify password with bcryptjs
               ├─ Check isActive flag
               ├─ Check if MFA enabled
               │   ├─ If YES: return issueMfaPendingToken()
               │   └─ If NO: return issueTokenPair()
               └─ Log auth.login event
       ← 200 OK + TokenPair or mfa_pending

User → Subsequent requests
       └─ Include Authorization: Bearer {access_token}
           └─ authenticate middleware validates token
               ├─ verifyAccessToken(token)
               ├─ Find user in DB
               └─ Attach req.user
```

### 2. MFA Flow

#### Setup MFA

```
User → POST /mfa/setup
       └─ authenticate middleware (access_token required)
           └─ mfaController.setup()
               └─ mfaService.setup()
                   ├─ Generate random secret
                   ├─ Create otpauth URI with qrcode
                   ├─ Store unconfirmed secret
                   └─ Return secret + URI
       ← 200 OK + secret + otpauthUrl

User → Scans QR code → Adds to authenticator app
       Generate TOTP code (6 digits)

User → POST /mfa/verify?code=123456
       └─ authenticate middleware (access_token required)
           └─ validate middleware (query code length check)
               └─ mfaController.verify()
                   └─ mfaService.verify()
                       ├─ authenticator.verify(code, secret)
                       ├─ Update user.mfaEnabled = true
                       └─ Log mfa.enabled event
       ← 204 No Content
```

#### Login with MFA

```
User → POST /auth/login
       └─ authService.login()
           ├─ Validate credentials
           └─ Check user.mfaEnabled
               └─ Return issueMfaPendingToken() {
                    mfa_pending: token,
                    expires_in: 300  // 5 minutes
                   }
       ← 200 OK + mfa_pending token

User → POST /mfa/validate?code=123456
       └─ authenticateMfaPending middleware (mfa_pending required)
           └─ validate middleware (query code length check)
               └─ mfaController.validate()
                   └─ mfaService.validate()
                       ├─ authenticator.verify(code, secret)
                       ├─ If valid: return issueTokenPair()
                       └─ Log mfa.validated event
       ← 200 OK + access_token + refresh_token
```

#### Disable MFA

```
User → POST /mfa/disable?code=123456
       └─ authenticate middleware (access_token required)
           └─ validate middleware (query code length check)
               └─ mfaController.disable()
                   └─ mfaService.disable()
                       ├─ authenticator.verify(code, secret)
                       ├─ Update user.mfaEnabled = false
                       ├─ Clear user.mfaSecret
                       └─ Log mfa.disabled event
       ← 204 No Content
```

### 3. Token Refresh Flow

```
Client has expired access_token + valid refresh_token

Client → POST /auth/refresh
         └─ authController.refresh()
             └─ authService.refresh()
                 ├─ verifyRefreshToken(token)
                 ├─ Find user
                 ├─ Check isActive
                 └─ Issue new TokenPair
         ← 200 OK + new access_token + refresh_token

Client stores new tokens and continues with new access_token
```

### 4. OAuth (Google/GitHub) Flow

#### Get Authorization URL

```
User clicks "Login with Google"

Client → GET /auth/oauth/google
         └─ oauthController.google()
             ├─ Build authorization URL with client_id + scopes
             └─ Return authorization URL
         ← 200 OK { authorization_url: "https://..." }

Client redirects user to authorization_url
```

#### OAuth Callback

```
Google/GitHub redirects → /auth/oauth/google/callback?code=...&state=...

Request → oauthController.googleCallback()
          ├─ Extract authorization code
          ├─ Exchange code for tokens with Google
          ├─ Fetch user info from Google
          └─ authService.oauthLoginOrRegister()
              ├─ Find user by oauth provider + id
              ├─ If exists: use existing user
              └─ If not: create new user
              └─ Issue TokenPair
          ├─ Redirect to frontend with token
          └─ Frontend extracts token from URL/session
```

---

## Authorization Model

### Role-Based Access Control (RBAC)

#### Member Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | Full control: Create, Update, Delete, Manage members, Invite, Cancel subscription |
| **ADMIN** | Manage: Update org, Manage members, View audit logs, Initialize/manage payments |
| **MEMBER** | Standard: View org, View members, Accept invitations |
| **VIEWER** | Read-only: View org details only |

#### Admin Access Levels

```
System-level Admin (superuser)
  └─ Can access all /admin/* endpoints
     ├─ View all users
     ├─ View all organizations
     ├─ Activate/Deactivate users
     └─ View system statistics

Organization-level Admin
  └─ Can manage own organization
     ├─ Update organization
     ├─ Manage members
     ├─ Invite members
     ├─ View audit logs
     └─ Manage subscription (if OWNER)
```

#### Authorization Flow

```
Request → GET /organizations/{orgId}
          └─ authenticate middleware
              └─ requireOrg middleware
                  ├─ Check if user is organization member
                  ├─ Attach org to req.org
                  └─ Check member role if route requires it
              └─ requireRole("ADMIN") middleware (if specified)
                  ├─ Check member.role >= required role
                  ├─ If true: next()
                  └─ If false: 403 Forbidden
          └─ Handler executes with access granted
```

---

## Data Flow Diagrams

### Organization Creation & Member Management

```
1. User creates organization
   User → POST /organizations
          └─ Create Organization + Membership(OWNER)

2. Owner invites member
   Owner → POST /organizations/{id}/invitations
           └─ Create Invitation (PENDING)
           └─ Send email to invitee

3. Invitee accepts
   Invitee → POST /organizations/invitations/accept
             └─ Create Membership with invited role
             └─ Update Invitation (ACCEPTED)
             └─ Create AuditLog

4. Admin updates member role
   Admin → PATCH /organizations/{id}/members/{userId}
           └─ Update Membership.role
           └─ Create AuditLog
```

### Subscription & Payment Flow

```
1. Organization owner initiates payment
   Owner → POST /billing/organizations/{id}/initialize
           └─ Create temporary subscription record
           └─ Request Paystack authorization
           └─ Return authorization_url

2. User completes payment on Paystack
   User → Redirects to Paystack checkout
           └─ User enters payment details
           └─ Paystack processes payment
           └─ Paystack redirects to callback URL

3. Verify payment
   Client → GET /billing/verify?reference={paystack_ref}
            └─ Verify payment with Paystack
            └─ Update subscription status = ACTIVE
            └─ Update organization.plan
            └─ Create AuditLog
            ← Return success

4. Ongoing billing
   Paystack webhook → POST /billing/webhooks/paystack
                      └─ Update subscription on renewal
                      └─ Send notification if failed
```

### Notification & Audit Log Flow

```
User invites member
  └─ Create Invitation
  └─ Send email
  └─ Create Notification for invitee
  └─ Create AuditLog("member_invited")

Member accepts invitation
  └─ Create Membership
  └─ Create Notification for organization (admin)
  └─ Create AuditLog("member_joined")

Admin updates member role
  └─ Update Membership.role
  └─ Create Notification for affected member
  └─ Create AuditLog("member_role_updated")
```

---

## Key Concepts

### Tokens

#### Access Token
- **Duration:** 30 minutes (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
- **Use:** Authentication for API requests
- **Format:** JWT signed with JWT_ACCESS_SECRET
- **Payload:** `{ sub: userId, type: "access" }`

#### Refresh Token
- **Duration:** 30 days (configurable via REFRESH_TOKEN_EXPIRE_DAYS)
- **Use:** Obtain new access token when expired
- **Format:** JWT signed with JWT_REFRESH_SECRET
- **Payload:** `{ sub: userId, type: "refresh" }`
- **Security:** Stored client-side (httpOnly cookie recommended)

#### MFA Pending Token
- **Duration:** 5 minutes (hardcoded)
- **Use:** Complete MFA login flow only
- **Format:** JWT signed with JWT_ACCESS_SECRET
- **Payload:** `{ sub: userId, type: "mfa_pending" }`
- **Scope:** Only grants access to `/mfa/validate` endpoint

#### Verification Token
- **Use:** Email verification
- **Generation:** Random token hashed with SHA-256
- **Storage:** Stored in user.verificationToken (hashed)
- **Verification:** Token not hashed, compared against stored hash

#### Reset Token
- **Use:** Password reset
- **Generation:** Random token hashed with SHA-256
- **Expiry:** Stored in user.resetTokenExpiresAt
- **Verification:** Token not hashed, compared against stored hash

### Organization Hierarchy

```
Organization
  ├─ Memberships (User → Role mapping)
  │   └─ Role: OWNER | ADMIN | MEMBER | VIEWER
  ├─ Invitations (Pending member invites)
  │   └─ Status: PENDING | ACCEPTED | EXPIRED | REVOKED
  ├─ Subscription (Payment tracking)
  │   ├─ Status: ACTIVE | TRIALING | PAST_DUE | CANCELED | INCOMPLETE
  │   └─ Plan: FREE | PRO | ENTERPRISE
  ├─ AuditLogs (Activity tracking)
  └─ Notifications (User alerts)
```

### Error Handling Strategy

```
Request arrives
  └─ Express middleware pipeline
      ├─ Parsing, validation, authentication
      ├─ If error: throw AppError or next(error)
      └─ Continue to route handler
  └─ Route handler
      ├─ Try-catch block
      ├─ If error: next(error)
      └─ Otherwise: res.json(...)
  └─ Error Handler Middleware
      ├─ Catch all errors
      ├─ Format response
      ├─ Log error
      └─ Send to client with HTTP status
```

---

## Database Schema Overview

### Relationships

```
User (1) ──────── (Many) Membership
         (1) ────── (Many) AuditLog
         (1) ────── (Many) Notification
         (1) ────── (Many) Invitation (as InvitedBy)

Organization (1) ──────── (Many) Membership
             (1) ────── (Many) Invitation
             (1) ────── (Many) AuditLog
             (1) ────── (1)    Subscription

Invitation relates to:
  - Organization (which org being invited to)
  - User (who sent invite, optional: InvitedBy)

AuditLog relates to:
  - Organization (optional: which org action affected)
  - User (optional: who performed action)
```

### Indexes for Performance

```
Users table
  └─ PK: id
  └─ Unique: email
  └─ Index: oauthProviderId (for OAuth lookups)

Organizations table
  └─ PK: id
  └─ Unique: slug
  └─ Unique: paystackCustomerId

Memberships table
  └─ PK: id
  └─ Unique: (userId, organizationId)
  └─ Index: userId (for user's orgs)
  └─ Index: organizationId (for org's members)

Invitations table
  └─ PK: id
  └─ Unique: token
  └─ Index: email (for invite lookups)
  └─ Index: organizationId

AuditLogs table
  └─ PK: id
  └─ Index: organizationId
  └─ Index: userId
  └─ Index: action (for filtering by action type)

Notifications table
  └─ PK: id
  └─ Index: userId (for user's notifications)
```

---

## Error Handling Strategy

### Error Propagation

```
1. Validation Error (Zod)
   └─ validate middleware catches
   └─ Formats as ZodError
   └─ errorHandler converts to 422 response

2. Service Layer Error (AppError subclass)
   └─ Thrown by service (e.g., authService)
   └─ Caught by controller's try-catch
   └─ Passed to next(error)
   └─ errorHandler formats response

3. Async Error (uncaught promise rejection)
   └─ Caught by express-async-errors
   └─ Passed to error handler
   └─ Converted to 500 response

4. Middleware Error (authentication failed)
   └─ authenticate middleware throws UnauthorizedError
   └─ Passed to next(error)
   └─ errorHandler formats as 401 response
```

### Error Response Format

```json
{
  "message": "Invalid email or password",
  "code": "UNAUTHORIZED",
  "statusCode": 401
}
```

### Validation Error Response

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 422,
  "errors": [
    {
      "path": ["password"],
      "message": "Must contain an uppercase letter"
    }
  ]
}
```

---

## Security Considerations

### Password Security
- Hashed with bcryptjs (10 salt rounds)
- Minimum 8 characters, 1 uppercase, 1 digit
- Never transmitted in logs or responses
- Reset token validates ownership

### Token Security
- Signed with strong secrets (min 32 chars)
- Short expiry times (5 min for MFA, 30 min for access)
- Stored in httpOnly cookies (recommended for clients)
- Refresh tokens rotated on use (recommended)

### OAuth Security
- CSRF protection via state parameter
- Secrets stored in environment
- Redirect URIs whitelist (configured in OAuth provider)
- Email verified by provider before trust

### MFA Security
- TOTP codes validated with ±30 second window
- Secrets stored encrypted in database
- Backup codes not implemented (future feature)
- Recovery codes optional (future feature)

### Database Security
- Passwords hashed before storage
- Sensitive data not logged
- PII handled per GDPR requirements
- Audit logs immutable (no updates/deletes)

### API Security
- Rate limiting: 60 req/min per IP
- CORS configured per environment
- Helmet.js security headers
- SQL injection protected (Prisma ORM)
- XSS protected (JSON responses, no inline HTML)

---

**For detailed endpoint specifications, see context/API.md**
