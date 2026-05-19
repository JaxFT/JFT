# Jax Family Travels, Project Context

## Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS, brand colour `brand-600` = `#2d6b4f`
- **Auth + DB**: Supabase, `https://wjpmdwugnwuydomdmetf.supabase.co`
- **Payments**: Stripe (one-off purchases + £49.99/year premium subscription)
- **Hosting**: Cloudflare Pages, domain `jaxfamilytravels.com`
- **Repo**: `https://github.com/JaxFT/JFT.git`

## File Structure
```
src/app/          , pages (App Router)
src/components/   , React components
  layout/         , Navbar, Footer
  blog/           , BlogCard
src/lib/
  supabase/client.ts , browser Supabase client
  supabase/server.ts , server Supabase client (uses cookies())
  blog.ts            , markdown parsing utils (gray-matter)
src/types/index.ts   , shared TypeScript types
content/blog/     , markdown blog posts (frontmatter + content)
supabase/schema.sql, full DB schema (run in Supabase SQL editor)
public/images/    , static assets
```

## Database Tables
| Table       | Purpose |
|-------------|---------|
| `profiles`  | Extends auth.users, subscription_tier ('free'\|'premium'), stripe IDs |
| `products`  | Purchasable items, guides, tools, packs (price_pence, stripe_price_id) |
| `purchases` | Records per-user product purchases |

Supabase Auth handles users. Profile is auto-created via trigger on signup.

## Access / Gating Rules
- **Free**: homepage, blog (all posts), guides listing, login/signup
- **Logged in + free**: can see guides, purchase individual items
- **Premium**: I Want To Travel, Learning Packs, all guides included
- Gating is done server-side in page components using `createClient()` from `lib/supabase/server.ts`

## Blog
- Markdown files in `content/blog/` with frontmatter: title, excerpt, date, author, coverImage, tags
- Parsed by `src/lib/blog.ts` using gray-matter
- No CMS, posts are added as `.md` files and committed to git

## Env Vars (see .env.example)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, for webhook/admin)
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL` = `https://jaxfamilytravels.com`

## Pricing Model
- Individual guides: ~£4.99 each (one-off Stripe payment)
- I Want To Travel tool: ~£2.99 one-off or included in premium
- Premium annual: £49.99/year (Stripe subscription), includes everything

## Key Components
- `Navbar`, transparent on homepage hero, white when scrolled or on other pages. Shows login/account state.
- `BlogCard`, used on homepage (latest 3) and /blog listing
- `GatedContent` pattern, server component checks `profiles.subscription_tier` before rendering

## Family Way questionnaire
The questionnaire on `/i-want-to-travel` is a self-contained HTML page rendered inside an iframe via `srcDoc`. Source of truth is `src/app/i-want-to-travel/family-way.html`. The TypeScript file `family-way.ts` is generated from it. After editing the HTML, regenerate the TS file:
```
node -e "const fs=require('fs');const h=fs.readFileSync('src/app/i-want-to-travel/family-way.html','utf8');fs.writeFileSync('src/app/i-want-to-travel/family-way.ts','// Generated from family-way.html, edit the HTML and re-run the conversion in CLAUDE.md\nexport const FAMILY_WAY_HTML = '+JSON.stringify(h)+'\n');"
```
In-iframe links to parent-window routes need `target="_top"` (e.g. the call CTA on the results screen links to `/work-with-us`).

## Not Yet Built
- Stripe checkout + webhook (`/api/stripe/`)
- Account page (`/account`)
- Auth callback route (`/api/auth/callback`)
- Family Way questionnaire embedded in `/i-want-to-travel`
- Blog post template builder for Bec
- Cloudflare Pages deployment config
