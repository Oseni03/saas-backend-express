# Express SaaS Boilerplate - API Documentation

**Base URL:** `http://localhost:4000/api/v1` (development)

**Version:** 1.0.0  
**Last Updated:** July 2024

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [Organizations](#organizations)
5. [Billing](#billing)
6. [Multi-Factor Authentication](#multi-factor-authentication)
7. [Admin Endpoints](#admin-endpoints)
8. [Notifications & Audit Logs](#notifications--audit-logs)
9. [Data Models](#data-models)
10. [Error Handling](#error-handling)

---

## Overview

This is a production-ready Express.js + TypeScript SaaS backend providing:

- **Authentication:** Email/password, OAuth (Google/GitHub), MFA support
- **Multi-tenancy:** Organizations with role-based access control (RBAC)
- **Billing:** Paystack payment gateway integration
- **Admin Panel:** System-wide user and organization management
- **Security:** JWT tokens, TOTP codes, audit logging, rate limiting

### Authentication Flow

1. **Register/Login:** Obtain access + refresh tokens (or mfa_pending if MFA enabled)
2. **Access Token:** Include in `Authorization: Bearer {token}` header
3. **Refresh Token:** Exchange expired access token for new pair
4. **MFA:** Complete TOTP validation with mfa_pending token to get full TokenPair

### Response Format

All responses use **snake_case** JSON format:

```json
{
  "id": "user123",
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_verified": true,
  "created_at": "2024-07-01T10:00:00Z"
}
```

---

## Authentication

### Register a New Account

**POST** `/auth/register`

Creates a new user account. Email must be unique. Password must have 8+ characters with uppercase letter and digit.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_verified": false,
    "is_active": true,
    "mfa_enabled": false,
    "created_at": "2024-07-01T10:00:00Z"
  },
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer"
}
```

**Error Responses:**
- `409 Conflict`: Email already registered
- `422 Unprocessable Entity`: Weak password or invalid email

---

### Login

**POST** `/auth/login`

Authenticate with email and password. Returns TokenPair or mfa_pending token if MFA enabled.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (No MFA):** `200 OK`
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer"
}
```

**Response (MFA Enabled):** `200 OK`
```json
{
  "mfa_pending": "eyJhbGc...",
  "expires_in": 300
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid email or password
- `401 Unauthorized`: Account is deactivated

---

### Refresh Access Token

**POST** `/auth/refresh`

Exchange refresh token for new TokenPair when access token expires.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid refresh token

---

### Verify Email

**POST** `/auth/verify-email`

Confirm email address with verification token (sent via email during registration).

**Request Body:**
```json
{
  "token": "verification_token_abc123..."
}
```

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "is_verified": true,
  "full_name": "John Doe",
  "created_at": "2024-07-01T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired token

---

### Forgot Password

**POST** `/auth/forgot-password`

Request password reset. Returns 202 regardless of email existence (security).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `202 Accepted`
```json
{
  "message": "If an account with that email exists, a reset link has been sent."
}
```

---

### Reset Password

**POST** `/auth/reset-password`

Reset password with reset token from email. New password must meet complexity requirements.

**Request Body:**
```json
{
  "token": "reset_token_abc123...",
  "new_password": "NewSecurePass456!"
}
```

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "is_verified": true
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired token
- `422 Unprocessable Entity`: Weak password

---

### Get Current User

**GET** `/auth/me`

Fetch authenticated user's profile. Requires valid access token.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "is_verified": true,
  "is_active": true,
  "mfa_enabled": true,
  "created_at": "2024-07-01T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

## User Management

All user management endpoints require authentication.

### Get User Profile

**GET** `/users/me`

Fetch authenticated user's full profile.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://avatar.example.com/user.jpg",
  "is_verified": true,
  "is_active": true,
  "mfa_enabled": true,
  "created_at": "2024-07-01T10:00:00Z"
}
```

---

### Update User Profile

**PATCH** `/users/me`

Update user profile information (name, avatar).

**Request Body:**
```json
{
  "full_name": "Jane Doe",
  "avatar_url": "https://avatar.example.com/newavatar.jpg"
}
```

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "avatar_url": "https://avatar.example.com/newavatar.jpg",
  "is_verified": true
}
```

---

### Change Password

**POST** `/users/me/change-password`

Change user's password. Must provide current password to verify identity.

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

**Response:** `204 No Content`

**Error Responses:**
- `401 Unauthorized`: Current password incorrect
- `422 Unprocessable Entity`: New password too weak

---

### Delete Account

**DELETE** `/users/me`

Permanently delete user account and all associated data.

**Response:** `204 No Content`

**Error Responses:**
- `401 Unauthorized`: Not authenticated

---

## Organizations

Multi-tenant organization management with role-based access control.

### Create Organization

**POST** `/organizations`

Create a new organization. Creator is automatically added as OWNER.

**Request Body:**
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp"
}
```

**Response:** `201 Created`
```json
{
  "id": "org_123",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "logo_url": null,
  "plan": "FREE",
  "created_at": "2024-07-01T10:00:00Z"
}
```

**Error Responses:**
- `409 Conflict`: Slug already taken
- `422 Unprocessable Entity`: Invalid input

---

### List Organizations

**GET** `/organizations`

List all organizations the user is a member of.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10, max: 100)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "org_123",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "plan": "PRO",
      "created_at": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3
  }
}
```

---

### Get Organization Details

**GET** `/organizations/{orgId}`

Fetch organization details. User must be a member.

**Path Parameters:**
- `orgId` (string): Organization ID

**Response:** `200 OK`
```json
{
  "id": "org_123",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "logo_url": "https://...",
  "plan": "PRO",
  "members_count": 5,
  "created_at": "2024-07-01T10:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Organization doesn't exist
- `403 Forbidden`: User not a member

---

### Update Organization

**PATCH** `/organizations/{orgId}`

Update organization details. Requires ADMIN role.

**Request Body:**
```json
{
  "name": "Acme Corp Updated",
  "logo_url": "https://logo.example.com/logo.png"
}
```

**Response:** `200 OK`
```json
{
  "id": "org_123",
  "name": "Acme Corp Updated",
  "slug": "acme-corp",
  "logo_url": "https://logo.example.com/logo.png"
}
```

**Error Responses:**
- `403 Forbidden`: Insufficient permissions (requires ADMIN role)

---

### Delete Organization

**DELETE** `/organizations/{orgId}`

Delete organization and all data. Requires OWNER role.

**Response:** `204 No Content`

**Error Responses:**
- `403 Forbidden`: Only OWNER can delete

---

### List Organization Members

**GET** `/organizations/{orgId}/members`

List all members in organization.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "user": {
        "id": "user_123",
        "email": "admin@example.com",
        "full_name": "Jane Doe"
      },
      "role": "OWNER"
    },
    {
      "user": {
        "id": "user_456",
        "email": "member@example.com",
        "full_name": "John Smith"
      },
      "role": "MEMBER"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

---

### Update Member Role

**PATCH** `/organizations/{orgId}/members/{userId}`

Change member's role. Requires ADMIN role.

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

Valid roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "user_456",
    "email": "member@example.com",
    "full_name": "John Smith"
  },
  "role": "ADMIN"
}
```

**Error Responses:**
- `403 Forbidden`: Insufficient permissions (requires ADMIN role)
- `404 Not Found`: User not a member

---

### Remove Member

**DELETE** `/organizations/{orgId}/members/{userId}`

Remove member from organization. Requires ADMIN role (or OWNER for self-removal).

**Response:** `204 No Content`

**Error Responses:**
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Cannot remove last owner

---

### Invite Member

**POST** `/organizations/{orgId}/invitations`

Invite user to organization via email. Requires ADMIN role.

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "MEMBER"
}
```

**Response:** `201 Created`
```json
{
  "id": "invite_123",
  "email": "newmember@example.com",
  "role": "MEMBER",
  "status": "PENDING",
  "expires_at": "2024-07-08T10:00:00Z"
}
```

**Error Responses:**
- `409 Conflict`: User already a member
- `422 Unprocessable Entity`: Invalid email

---

### List Invitations

**GET** `/organizations/{orgId}/invitations`

List pending and accepted invitations. Requires ADMIN role.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "invite_123",
      "email": "newmember@example.com",
      "role": "MEMBER",
      "status": "PENDING",
      "expires_at": "2024-07-08T10:00:00Z",
      "created_at": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

---

### Accept Invitation

**POST** `/organizations/invitations/accept`

Accept an organization invitation using token from email link.

**Request Body:**
```json
{
  "token": "invitation_token_abc123..."
}
```

**Response:** `200 OK`
```json
{
  "id": "org_123",
  "name": "Acme Corp",
  "slug": "acme-corp"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired token
- `409 Conflict`: Already a member

---

## Billing

Paystack payment gateway integration for subscription management.

### Initialize Payment

**POST** `/billing/organizations/{orgId}/initialize`

Start a Paystack payment for organization subscription. Requires OWNER role.

**Request Body:**
```json
{
  "plan": "PRO"
}
```

Valid plans: `FREE`, `PRO`, `ENTERPRISE`

**Response:** `200 OK`
```json
{
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "paystack_ref_123"
}
```

**Error Responses:**
- `403 Forbidden`: Only OWNER can initialize payment
- `402 Payment Required`: Invalid plan

---

### Verify Payment

**GET** `/billing/verify`

Verify payment after Paystack redirects back. Called by frontend after payment completion.

**Query Parameters:**
- `reference` (string): Paystack payment reference

**Response:** `200 OK`
```json
{
  "status": "success",
  "subscription": {
    "organization_id": "org_123",
    "plan": "PRO",
    "period_start": "2024-07-01T10:00:00Z",
    "period_end": "2024-08-01T10:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid reference
- `402 Payment Required`: Payment verification failed

---

### Get Paystack Dashboard URL

**GET** `/billing/organizations/{orgId}/manage`

Get URL for Paystack customer portal to manage subscription. Requires OWNER role.

**Response:** `200 OK`
```json
{
  "manage_url": "https://paystack.com/manageurl"
}
```

---

### Cancel Subscription

**POST** `/billing/organizations/{orgId}/cancel`

Cancel active subscription. Requires OWNER role.

**Response:** `204 No Content`

**Error Responses:**
- `403 Forbidden`: Only OWNER can cancel
- `400 Bad Request`: No active subscription

---

## Multi-Factor Authentication

TOTP-based MFA using authenticator apps (Google Authenticator, Authy, etc.).

### Setup MFA

**POST** `/mfa/setup`

Generate MFA secret and QR code for user's authenticator app.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `200 OK`
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ...",
  "otpauth_url": "otpauth://totp/YourApp:user@example.com?secret=JBSWY3DP..."
}
```

User must scan QR code or enter secret in authenticator app before verifying.

---

### Verify MFA Setup

**POST** `/mfa/verify?code=123456`

Verify MFA setup by submitting a TOTP code from authenticator app.

**Query Parameters:**
- `code` (string): 6-digit TOTP code

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

After verification, login will require MFA validation.

**Error Responses:**
- `400 Bad Request`: MFA already enabled
- `422 Unprocessable Entity`: Invalid code format
- `401 Unauthorized`: Incorrect TOTP code

---

### Disable MFA

**POST** `/mfa/disable?code=123456`

Disable MFA by confirming with current TOTP code.

**Query Parameters:**
- `code` (string): 6-digit TOTP code

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** `204 No Content`

**Error Responses:**
- `400 Bad Request`: MFA not enabled
- `401 Unauthorized`: Incorrect TOTP code

---

### Complete MFA Login

**POST** `/mfa/validate?code=123456`

Complete login flow when MFA is enabled. Use mfa_pending token from login response.

**Query Parameters:**
- `code` (string): 6-digit TOTP code

**Headers:**
```
Authorization: Bearer {mfa_pending_token}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "Bearer"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid mfa_pending token or expired (5 min expiry)
- `401 Unauthorized`: Incorrect TOTP code

---

## Admin Endpoints

System-wide admin operations. Requires admin access (superuser or org admin).

### Get System Statistics

**GET** `/admin/stats`

Get overall system statistics. Requires admin access.

**Response:** `200 OK`
```json
{
  "users": {
    "total": 150,
    "verified": 120
  },
  "organizations": {
    "total": 45
  }
}
```

---

### List All Users

**GET** `/admin/users`

List all users in system with pagination. Requires admin access.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10, max: 100)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "full_name": "John Doe",
      "is_verified": true,
      "is_active": true,
      "created_at": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150
  }
}
```

---

### List All Organizations

**GET** `/admin/organizations`

List all organizations in system with pagination. Requires admin access.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "org_123",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "plan": "PRO",
      "created_at": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45
  }
}
```

---

### Deactivate User

**PATCH** `/admin/users/{userId}/deactivate`

Deactivate user account (prevents login). Requires admin access.

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "is_active": false
}
```

---

### Activate User

**PATCH** `/admin/users/{userId}/activate`

Reactivate deactivated user account. Requires admin access.

**Response:** `200 OK`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "is_active": true
}
```

---

## Notifications & Audit Logs

### List Notifications

**GET** `/notifications`

Fetch user's notifications.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "notif_123",
      "title": "Invitation received",
      "body": "You've been invited to Acme Corp",
      "link": "/organizations/org_123",
      "is_read": false,
      "created_at": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

---

### Mark Notification as Read

**POST** `/notifications/{id}/read`

Mark a single notification as read.

**Response:** `204 No Content`

---

### Mark All Notifications as Read

**POST** `/notifications/read-all`

Mark all user notifications as read.

**Response:** `204 No Content`

---

### List Audit Logs

**GET** `/audit-logs/organizations/{orgId}`

View organization's audit logs. Requires ADMIN role.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "log_123",
      "action": "member_added",
      "resource_type": "Membership",
      "resource_id": "member_456",
      "user_email": "admin@example.com",
      "ip_address": "192.168.1.1",
      "meta": {
        "role": "MEMBER"
      },
      "created_at": "2024-07-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 120
  }
}
```

---

## OAuth Integration

### Get Google OAuth URL

**GET** `/auth/oauth/google`

Get authorization URL for Google OAuth flow.

**Response:** `200 OK`
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&scope=openid+email+profile&..."
}
```

Frontend redirects to this URL. After user grants permission, Google redirects to callback.

---

### Google OAuth Callback

**GET** `/auth/oauth/google/callback`

Paystack handles this. Should not be called directly by client.

**Query Parameters:**
- `code` (string): Authorization code from Google
- `state` (string): State parameter for CSRF protection

---

### Get GitHub OAuth URL

**GET** `/auth/oauth/github`

Get authorization URL for GitHub OAuth flow.

**Response:** `200 OK`
```json
{
  "authorization_url": "https://github.com/login/oauth/authorize?client_id=...&scope=read:user+user:email&..."
}
```

---

### GitHub OAuth Callback

**GET** `/auth/oauth/github/callback`

Paystack handles this. Should not be called directly by client.

**Query Parameters:**
- `code` (string): Authorization code from GitHub

---

## Data Models

### User

```json
{
  "id": "string (CUID)",
  "email": "string (unique, lowercase)",
  "full_name": "string (optional)",
  "avatar_url": "string (optional, URL)",
  "is_verified": "boolean",
  "is_active": "boolean",
  "mfa_enabled": "boolean",
  "oauth_provider": "LOCAL | GOOGLE | GITHUB",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
```

**Database Name:** `users`

---

### Organization

```json
{
  "id": "string (CUID)",
  "name": "string",
  "slug": "string (unique, lowercase with hyphens)",
  "logo_url": "string (optional, URL)",
  "plan": "FREE | PRO | ENTERPRISE",
  "paystack_customer_id": "string (optional)",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
```

**Database Name:** `organizations`

---

### Membership

```json
{
  "id": "string (CUID)",
  "user_id": "string",
  "organization_id": "string",
  "role": "OWNER | ADMIN | MEMBER | VIEWER",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
```

**Database Name:** `memberships`

---

### Subscription

```json
{
  "id": "string (CUID)",
  "organization_id": "string (unique)",
  "paystack_subscription_code": "string (unique)",
  "paystack_plan_code": "string",
  "status": "ACTIVE | TRIALING | PAST_DUE | CANCELED | INCOMPLETE",
  "period_start": "ISO 8601 datetime",
  "period_end": "ISO 8601 datetime",
  "cancel_at_end": "boolean",
  "canceled_at": "ISO 8601 datetime (optional)",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
```

**Database Name:** `subscriptions`

---

### Invitation

```json
{
  "id": "string (CUID)",
  "organization_id": "string",
  "email": "string",
  "role": "OWNER | ADMIN | MEMBER | VIEWER",
  "token": "string (unique)",
  "status": "PENDING | ACCEPTED | EXPIRED | REVOKED",
  "expires_at": "ISO 8601 datetime",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
```

**Database Name:** `invitations`

---

### AuditLog

```json
{
  "id": "string (CUID)",
  "organization_id": "string (optional)",
  "user_id": "string (optional)",
  "action": "string (e.g., 'member_added', 'org_updated')",
  "resource_type": "string (e.g., 'Membership', 'Organization')",
  "resource_id": "string (optional)",
  "ip_address": "string (optional)",
  "user_agent": "string (optional)",
  "meta": "JSON (additional context)",
  "created_at": "ISO 8601 datetime"
}
```

**Database Name:** `audit_logs`

---

## Error Handling

All errors follow the standard format:

```json
{
  "message": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 202 | Accepted | Request accepted (async processing) |
| 204 | No Content | Success, no response body |
| 400 | Bad Request | Malformed request or invalid input |
| 401 | Unauthorized | Missing or invalid authentication |
| 402 | Payment Required | Subscription needed for feature |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists or state conflict |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Server error |

### Common Error Codes

| Error | Status | Description |
|-------|--------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `RESOURCE_ALREADY_EXISTS` | 409 | Duplicate resource |
| `VALIDATION_ERROR` | 422 | Invalid input data |
| `RATE_LIMITED` | 429 | Too many requests |
| `PAYMENT_REQUIRED` | 402 | Upgrade subscription |

---

## Authentication Headers

Include access token in all authenticated requests:

```
Authorization: Bearer {access_token}
```

For MFA flow:

```
Authorization: Bearer {mfa_pending_token}
```

---

## Rate Limiting

- **Window:** 1 minute
- **Limit:** 60 requests per minute per IP
- **Header:** `RateLimit-Remaining` indicates requests left

---

## Pagination

List endpoints support cursor-based pagination:

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150
  }
}
```

**Query parameters:**
- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (1-100, default: 10)

---

## Token Expiration

| Token Type | Expiration | Usage |
|-----------|-----------|-------|
| `access_token` | 30 minutes | API requests |
| `refresh_token` | 30 days | Refresh access token |
| `mfa_pending` | 5 minutes | Complete MFA login |
| Verification | No expiry | Email verification |
| Reset | No expiry | Password reset |

---

## Best Practices

### Security

1. Always use HTTPS in production
2. Store tokens in secure, httpOnly cookies
3. Never expose refresh tokens in logs
4. Use CORS appropriately
5. Implement rate limiting on client

### Error Handling

1. Check status code before parsing response
2. Implement retry logic with exponential backoff
3. Handle 401 errors by refreshing token
4. Log errors for debugging

### Pagination

1. Don't hardcode page numbers; use cursor pagination
2. Handle `total` count for UI pagination
3. Respect `limit` query parameter

---

**For questions or issues, refer to context/issues/ for implementation details.**
