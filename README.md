# Agon Performance

Online coaching platform targeted at Qatar — coaches design editable workouts with auto-fetched YouTube demos, athletes see and complete their daily session, log actuals, and track progress. Trilingual (English · Español · العربية), light PWA, WhatsApp bot, Stripe-ready pricing, coach directory with map search.

**Live**: https://web-production-83d44.up.railway.app

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript | server actions, RSC, native Next.js optimizations |
| Styling | TailwindCSS v4 | zero config, design tokens via `:root` vars |
| DB | **Neon Postgres** (free tier, serverless) | zero idle cost, autoscale |
| ORM | Prisma 6 + pgbouncer flag | safe pool + typed client |
| Auth | Auth.js v5 (credentials + JWT) | self-contained, no external IdP |
| Hosting | Railway (current) → migrating to **Vercel Hobby (free)** — see `MIGRATION.md` | free tier covers the app |
| Push | Web Push (VAPID) | zero cost native browser push |
| Payments | Stripe Checkout + webhook | industry standard, free integration |
| Messaging | **WhatsApp Cloud API** (Meta, free 1K convos/mo) | where clients already are |
| AI | **Gemini free → Groq free → OpenAI → Anthropic** chain with 30-day response cache | free-first, paid last |

## Features map

### Coach side
- `/[lang]/coach` — dashboard with active clients + alerts
- `/[lang]/coach/athletes` — client list + add athlete + auto-promotion of stable movements into coach library
- `/[lang]/coach/athletes/[id]` — client profile with tabs: **Perfil · Programas · Acceso cliente · Admin**
- `/[lang]/coach/athletes/[id]/evolution` — per-client PR charts across CrossFit benchmarks (Fran, Grace, Helen, Murph, …)
- `/[lang]/coach/athletes/[id]/engagement` — progress photos · measurements · check-ins · habits · nutrition plan
- `/[lang]/coach/programs/[id]` — program builder with autosave, batched inserts, YouTube video resolution
- `/[lang]/coach/programs/ai-new` — generate a full program from a brief (AI with deterministic fallback)
- `/[lang]/coach/import` — upload Word / Excel / PDF / paste — AI parses into a structured program
- `/[lang]/coach/import/photos` — upload training-log photos, AI vision extracts date + exercises + weights → writes to the athlete's calendar
- `/[lang]/coach/whatsapp` — bot + manual control panel for client WhatsApp
- `/[lang]/coach/templates` — quick-reply message templates
- `/[lang]/coach/marketing` — **Jorge-only** · timeline + decks + campaigns
- `/[lang]/admin/testimonials` — **Jorge-only** · landing page reviews

### Athlete side
- `/[lang]/athlete` — today's workout
- `/[lang]/athlete/calendar` — monthly grid with session states
- `/[lang]/athlete/session/[id]` — movements with YouTube thumbnails · per-movement actuals · rest timer · 1RM calc · intensity 1-5 feedback · **PR confetti** on new lifetime bests
- `/[lang]/athlete/evolution` — PRs and times per movement (tabs: Girls · Heroes · Lifts · Cardio · Gymnastics)
- `/[lang]/athlete/movements` — lifetime history of every exercise prescribed
- `/[lang]/athlete/engagement` — progress photos (client-side resize to 400KB) · body measurements chart · weekly check-in · habits grid
- `/[lang]/account` — hub with tabs: **Resumen · Mi plan · Progreso · Ajustes**

### Public
- `/[lang]` — landing with testimonials + pricing CTA
- `/[lang]/coaches` — **Doctoralia-style coach finder for Qatar** with map + advanced filters
- `/[lang]/coaches/[handle]` — individual coach profile
- `/[lang]/pricing` — 3 tiers + Stripe checkout
- `/[lang]/consultation` — book a free intro call

## Behavioural invariants

See **`STANDARDS.md`** for the four non-negotiable rules:

1. **Saves are sacred** — client/program/movement mutations must never fail silently or show false errors.
2. **Program UI is fast; videos stay quiet** — no autoplay; thumbnails until user clicks.
3. **Library-first for movements** — typeahead + saveProgram always check the Movement library before any YouTube call.
4. **Auto-promote stable movements** — after 24h in a program with a demo URL, movements copy into the coach's CoachMovement library automatically.

## Env vars (full)

```bash
# Required
DATABASE_URL=postgresql://...           # Neon pooler URL
AUTH_SECRET=                            # npx auth secret
NEXTAUTH_URL=https://your-app.vercel.app

# AI chain (configure at least ONE; chain picks the cheapest available)
GEMINI_API_KEY=                         # free — aistudio.google.com
GROQ_API_KEY=                           # free — console.groq.com
OPENAI_API_KEY=                         # paid — platform.openai.com (prepay credits, not ChatGPT Plus!)
ANTHROPIC_API_KEY=                      # paid — console.anthropic.com

# Web push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=           # same as VAPID_PUBLIC_KEY
VAPID_SUBJECT=mailto:you@example.com

# Stripe (optional — pricing page falls back to "Talk to coach" without these)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# WhatsApp (optional — bot stays dormant without these)
WHATSAPP_PHONE_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_COACH_PHONE=                   # fallback coach number if no User.phone set

# Feature flags
AI_PROGRAM_GEN_ENABLED=true
AI_IMPORT_ENABLED=true

# Branding (optional)
COACH_INSTAGRAM=
COACH_PHONE=
PUBLIC_URL=
```

## Local dev

```bash
git clone git@github.com:jorgeollerocorvo-dev/agonperformance.git
cd agonperformance
cp .env.example .env.local
# fill DATABASE_URL + AUTH_SECRET at minimum
npm install
npx prisma db push          # sync schema to your Neon DB
npm run dev                 # http://localhost:3000
```

## Deployment

### Vercel (recommended, free)
See **`MIGRATION.md`** for the 5-minute step-by-step. Summary:
1. Import the repo on vercel.com/new
2. Paste all env vars under Settings → Environment Variables
3. Push to `main` → deploy fires automatically

### Railway (legacy)
Still runs fine; the recovery after the Oct 2025 incident is ongoing. `vercel.json` sets per-route `maxDuration` so moving to Vercel is a drop-in.

## Working on this project from any device

Everything is in GitHub — the repo contains source, docs, env template and migration guide. To iterate from a new device:

```bash
# Clone
gh repo clone jorgeollerocorvo-dev/agonperformance   # or git clone
cd agonperformance

# Sync your local .env.local from the Vercel/Railway dashboard
# (never commit real credentials — .env.local is gitignored)

# Hack + push
npm install
npm run dev
git checkout -b my-change
# ... edit ...
git commit -am "..."
git push origin my-change     # open a PR, or just push to main
```

## Documents in the repo

| File | What's in it |
|---|---|
| `README.md` | this file |
| `STANDARDS.md` | the 4 invariants that must never regress |
| `MIGRATION.md` | step-by-step Railway → Vercel migration |
| `AGENTS.md` / `CLAUDE.md` | reminder notes for AI coding agents working here |
| `reports/Agon Performance app audit 2026.md` | Oct-2026 competitor + design-tool audit |

## License

Proprietary — Agon Performance / Jorge Ollero Corvo.
