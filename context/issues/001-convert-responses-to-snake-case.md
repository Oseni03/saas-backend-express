# Convert all API responses to snake_case

## What to build

Standardize all API response payloads to use `snake_case` field names instead of `camelCase`. This affects every controller: authentication (access_token, full_name, avatar_url), users, organizations, billing, notifications, MFA, and admin endpoints. All response objects should consistently use `snake_case` to match the OpenAPI 3.1.0 specification.

End-to-end: request → service layer → controller → response with normalized field names. Update tests to verify responses conform to the spec.

## Acceptance criteria

- [ ] All auth responses (register, login, refresh, verify-email, reset-password, getMe) use snake_case
- [ ] All user responses (profile, update-profile) use snake_case
- [ ] All organization responses (CRUD, members, invitations) use snake_case
- [ ] All billing responses (initialize, verify, manage, cancel) use snake_case
- [ ] All notification responses (list, mark-read) use snake_case
- [ ] All MFA responses (setup, verify, disable, validate) use snake_case
- [ ] All admin responses (stats, list-users, list-orgs) use snake_case
- [ ] Existing tests updated to verify snake_case response format
- [ ] No breaking schema changes in database or JWT payloads (internal only)

## Blocked by

None - can start immediately
