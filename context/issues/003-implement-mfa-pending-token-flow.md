# Implement mfa_pending token flow for login

## What to build

When a user with MFA enabled logs in, instead of returning an error, the login endpoint returns a short-lived `mfa_pending` token. This token grants access only to `/api/v1/mfa/validate` to complete the second factor. After successful MFA validation, the full `TokenPair` is issued.

End-to-end: user logs in with email/password → service checks if MFA enabled → if yes, return `{mfa_pending: "token", expires_in: 300}` → client uses mfa_pending token to call /mfa/validate with code → returns full TokenPair.

Requires new JWT token type `mfa_pending` with short expiry (5 minutes). Update login schema, service, and controller.

## Acceptance criteria

- [ ] Login endpoint returns `{mfa_pending: "token", expires_in: 300}` when user has MFA enabled
- [ ] Login still returns full `TokenPair` when user has no MFA
- [ ] JWT signing supports `mfa_pending` token type with 5-minute expiry
- [ ] `/api/v1/mfa/validate` accepts mfa_pending token in Authorization header
- [ ] Test: login without MFA returns TokenPair
- [ ] Test: login with MFA returns mfa_pending token
- [ ] Test: mfa_pending token expires after 5 minutes

## Blocked by

- #001 (Convert all API responses to snake_case)
