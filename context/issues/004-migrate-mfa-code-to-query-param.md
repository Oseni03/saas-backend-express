# Migrate MFA code parameter from body to query string

## What to build

Move TOTP code from request body to query parameters for MFA operations. This aligns with the OpenAPI specification and simplifies client implementation for code entry flows.

Update three POST endpoints:

- `POST /api/v1/mfa/verify?code=123456`
- `POST /api/v1/mfa/disable?code=123456`
- `POST /api/v1/mfa/validate?code=123456`

Routes accept code as `?code=` query param instead of `{code: "..."}` in body. Controller and middleware validation updated accordingly.

## Acceptance criteria

- [ ] `POST /api/v1/mfa/verify` accepts code as query parameter `?code=123456`
- [ ] `POST /api/v1/mfa/disable` accepts code as query parameter `?code=123456`
- [ ] `POST /api/v1/mfa/validate` accepts code as query parameter `?code=123456`
- [ ] Missing or invalid code returns 422 validation error
- [ ] Tests verify query param parsing for all three endpoints
- [ ] No breaking changes to service layer logic

## Blocked by

- #003 (Implement mfa_pending token flow for login)
