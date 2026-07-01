# Add admin role requirement to admin endpoints

## What to build

Protect all `/api/v1/admin/*` endpoints by requiring the authenticated user to have an admin role. Create a `requireAdmin` middleware that checks if the user has admin privileges (either system-level admin flag or admin role in any organization). Return 403 Forbidden if the user lacks admin access.

End-to-end: authenticated request → requireAdmin middleware checks user role → if not admin, return 403 → if admin, proceed to handler.

Affected endpoints:

- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/organizations`
- `PATCH /api/v1/admin/users/{user_id}/deactivate`
- `PATCH /api/v1/admin/users/{user_id}/activate`

## Acceptance criteria

- [ ] `requireAdmin` middleware created and checks user admin status
- [ ] All `/api/v1/admin/*` routes protected with requireAdmin
- [ ] Admin users (system flag or org admin role) can access endpoints
- [ ] Non-admin users receive 403 Forbidden response
- [ ] Test: admin user can access admin endpoints
- [ ] Test: non-admin user receives 403
- [ ] Test: unauthenticated user receives 401

## Blocked by

- #001 (Convert all API responses to snake_case)
