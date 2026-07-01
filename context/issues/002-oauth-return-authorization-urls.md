# Update OAuth routes to return authorization URLs

## What to build

Change the OAuth initiation routes (`GET /api/v1/auth/oauth/google` and `GET /api/v1/auth/oauth/github`) from performing HTTP redirects to returning a JSON object with an `authorization_url` field. This allows frontend clients to handle redirect logic themselves instead of server-side redirects.

The callback routes remain unchanged: they exchange the authorization code for tokens and return a `TokenPair` in snake_case format.

End-to-end: GET /oauth/google returns `{authorization_url: "https://accounts.google.com/..."}` → client redirects → callback exchanges code → returns `{access_token, refresh_token, token_type}`.

## Acceptance criteria

- [ ] GET `/api/v1/auth/oauth/google` returns `{authorization_url: "..."}` (no redirect)
- [ ] GET `/api/v1/auth/oauth/github` returns `{authorization_url: "..."}` (no redirect)
- [ ] Callback routes `/google/callback` and `/github/callback` still work correctly
- [ ] Callback responses use snake_case `TokenPair` format
- [ ] Tests verify JSON response structure, not redirect status codes

## Blocked by

- #001 (Convert all API responses to snake_case)
