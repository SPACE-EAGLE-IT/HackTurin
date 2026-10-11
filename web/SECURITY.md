# Security

## Reporting a vulnerability

Report it privately through the repository's **Security → Report a vulnerability** form on GitHub. Please do
not open a public issue. You will get an acknowledgement within five working days.

## What the kit guarantees by design

- Every table has Row Level Security; policies call `has_access(feature, level)`. The application acts as the
  signed-in user with the publishable key; the service role key is never used.
- Anonymous requests have no database privileges at all. API routes answer `401` without a session.
- Server actions validate input with zod, check the feature level, and return typed results instead of throwing.
- Auth redirects accept relative paths only; sign-up links are built from `NEXT_PUBLIC_SITE_URL` in production.
- Responses carry `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`.
- The assistant: the provider key lives in Supabase Vault and is read through a function gated on feature access;
  environment variables override it for production; the chat endpoint is rate-limited per person and caps the
  request size; tools read or propose, never write.

## What the operator must do

- The repository is public during the event and private afterwards; the licence restricts use either way.
- Set `NEXT_PUBLIC_SITE_URL` and the Supabase *Redirect URLs* for every deployment.
- For a closed team, disable public sign-ups in Supabase (*Authentication → Providers → Email → Allow new users*)
  and add people from *Accessi* instead.
- Rotate the provider key from `/assistant/setup` if it is ever exposed.
