# Migration: Railway → Vercel (keeping Neon)

The Next.js app currently runs on **Railway** (`web-production-83d44.up.railway.app`). We're moving the hosting layer to **Vercel Hobby (free)**; the database stays on **Neon free tier** untouched. Expected savings: full Railway bill → €0, with the same functionality.

## Pre-flight (already done in the repo)

- ✅ `vercel.json` with per-route `maxDuration` for heavy AI/PDF endpoints
- ✅ `export const maxDuration = 60` on the 3 pages that trigger AI generation / parsing / vision
- ✅ All DB schema already pushed to Neon (verified separately)
- ✅ No app code references Railway specifically
- ✅ `prisma generate` runs on `build` script already

## Vercel Hobby limits (as of 2026) — relevant ones

| Limit | Value | Impact on this app |
|---|---|---|
| Function `maxDuration` | 60s | Enough: AI gen ≤45s, batched saveProgram <3s |
| Bandwidth | 100GB/mo | Plenty for pre-launch |
| Function invocations | 100K/mo | Plenty |
| Serverless function size | 250MB | Our deps fit |
| Image Optimization | 5K sources/mo | We barely use next/image |
| Build minutes | 6000/mo | ~2min per build × 50/mo = fine |
| Custom domains | ✅ | Can bring Agon's domain later |
| Cron jobs | 1 (daily) | We don't use any (promotion runs on page load) |

## Step-by-step migration (5 min)

### 1. Create Vercel project

- Go to [vercel.com/new](https://vercel.com/new)
- Sign in with the GitHub account that owns `jorgeollerocorvo-dev/agonperformance`
- Import the repo
- **Framework preset**: Next.js (auto-detected)
- **Build command**: `prisma generate && next build` (should auto-detect from package.json)
- **Install command**: `npm install`
- Click **Deploy** — initial deploy will fail without env vars; that's expected

### 2. Paste every env var

Open the project in Vercel → **Settings → Environment Variables**. Paste each from the Railway dashboard (don't type anything by hand — copy-paste only). Set each for all environments (Production + Preview + Development):

**Required**:
- `DATABASE_URL` — Neon pooler URL (already in Railway, same value)
- `AUTH_SECRET` — the NextAuth secret from Railway
- `NEXTAUTH_URL` — set to your Vercel URL (e.g. `https://agonperformance.vercel.app`), update later if you add a custom domain
- `GEMINI_API_KEY` — primary AI tier
- `GROQ_API_KEY` — free-tier middle fallback

**Optional (keep if already set on Railway)**:
- `ANTHROPIC_API_KEY` — paid last-resort AI
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` — web push
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe billing
- `WHATSAPP_PHONE_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_COACH_PHONE` — bot
- `AI_IMPORT_ENABLED`, `AI_PROGRAM_GEN_ENABLED` — feature flags
- `COACH_INSTAGRAM`, `COACH_PHONE`
- `PUBLIC_URL`
- `GEMINI_MODEL`, `GROQ_MODEL`, `ANTHROPIC_GEN_MODEL`, `ANTHROPIC_VISION_MODEL` — model overrides if any
- `RESEND_API_KEY` — email if used
- `YT_USER_AGENT` — YouTube scraper override

### 3. Re-deploy

- Vercel → Deployments → **Redeploy** → check "Use existing Build Cache: no" the first time
- Watch the build log: `prisma generate` should run, then `next build`
- ~2-3 min for the first build

### 4. Smoke-test the new URL

Hit `https://your-vercel-url.vercel.app/en`:
- Landing + testimonials section loads
- `/en/coaches` shows the new finder
- Log in with the coach account (`jorge.ollero.corvo@gmail.com`)
- Verify `/en/coach` dashboard, `/en/coach/athletes`, open an athlete, edit a day, Save → should be fast
- Test `/en/account` from the client account (`@me.com`) — hub + password change

### 5. Flip DNS (later — optional)

When you're happy with Vercel, you can:
- Keep both running during transition (Railway + Vercel both pointing at Neon)
- Add your custom domain in Vercel: Settings → Domains
- Update any webhook URLs on third-party systems (Stripe, Meta WhatsApp) to the new Vercel URL
- Stop the Railway service when ready

### 6. Stop Railway (saves money)

In Railway dashboard (when it recovers from the current outage):
- `agonperformance` project → `web` service → Settings → **Pause** (keeps the DB on Neon, kills the compute pod)
- Verify billing drops to €0 next cycle

## Rollback (if Vercel surprises you)

- Railway service stays paused but intact
- Un-pause from Railway dashboard → the pod boots in <1min, pointing at the same Neon DB
- No data migration ever happened (Neon stayed untouched)
- Delete the Vercel project if you don't want to pay for it (free tier never charges though)

## What this costs

| | Railway | Vercel + Neon |
|---|---|---|
| App compute | $5-10/mo | **$0** (Hobby) |
| Database | Neon free | Neon free |
| Bandwidth | included | 100GB/mo free |
| **Total/mo** | **~$5-10** | **$0** |

Only crosses zero when: >100K function invocations/mo (unlikely), >100GB bandwidth/mo (we're nowhere close), or you upgrade for custom timeouts.
