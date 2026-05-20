# Supabase Auth email templates

Branded HTML templates for the five Supabase Auth transactional emails. Copy
the body of each file into the matching textarea in:

  Supabase dashboard → your project → Auth → Email Templates

Each file uses Supabase's template variables (`{{ .ConfirmationURL }}`,
`{{ .Email }}`, `{{ .Token }}`, `{{ .SiteURL }}`) — paste them verbatim,
Supabase substitutes the real values when sending.

## File → Supabase template mapping

| File | Supabase template |
|---|---|
| `confirm-signup.html`  | Confirm signup |
| `magic-link.html`      | Magic Link |
| `reset-password.html`  | Reset Password |
| `change-email.html`    | Change Email Address |
| `invite-user.html`     | Invite user |

## Subjects

Supabase also lets you edit the subject line per template. Suggested ones:

- Confirm signup: **Confirm your Jax | Family Travels account**
- Magic Link: **Your sign-in link for Jax | Family Travels**
- Reset Password: **Reset your Jax | Family Travels password**
- Change Email: **Confirm your new email address**
- Invite User: **You've been invited to Jax | Family Travels**

## Brand colours used

- Header background: `#2d6b4f` (brand-600 — matches site CTA buttons)
- Button background: same
- Paper / body background: `#f5f4f1`
- Body text: `#1a1a18`
- Muted / footer: `#888`

Edit the green if/when the site brand shifts; nothing else depends on
these files.
