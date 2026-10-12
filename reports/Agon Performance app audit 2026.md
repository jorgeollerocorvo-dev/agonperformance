# Agon Performance — Feature & Design audit, Oct 2026

**Executive summary** — Agon already covers more surface area than most $19/mo competitors (TrueCoach, PT Distinction) thanks to the engagement pack + evolution charts + photo-import you shipped. The three biggest gaps hurting conversion right now are: **wearables sync** (every athlete with an Apple Watch asks for it), **integrated Stripe billing** (so coaches don't collect in WhatsApp), and **athlete-submitted video for form check** (your main differentiation window — nobody owns this well). On the design side, two moves ship this week with zero spend: **v0.dev** for a landing-hero redesign + **shadcn/ui + Aceternity components** to replace the hand-rolled Card primitives.

---

## PART A — Feature gap analysis

| Feature | Why it matters | Effort | Zero-cost path | Who has it |
|---|---|---|---|---|
| **Apple Health / Google Fit / Garmin sync** | Table-stakes 2026; athletes expect weight + sleep + HRV auto-pulled | Medium | Google Fit REST API (free), Apple HealthKit (web via file export only — no OAuth yet), Garmin Connect developer (free, revenue-share at scale) | TrueCoach, Trainerize, Everfit, Hevy Coach |
| **Integrated Stripe billing** | Coaches currently use WhatsApp + bank transfer — Agon already has the Subscription schema, just unused | Medium | Stripe Checkout + webhooks (free integration, 2.9% + 30¢) | TrueCoach, Trainerize, Everfit, Hevy Coach |
| **Athlete video submission for form check** | Massive differentiator — nobody does this well. Athlete uploads 20s video, coach comments | Medium | Cloudflare R2 (10GB free) + signed URLs; or Mux free tier (1000 min) | PT Distinction, Everfit (basic) |
| **Wearable workout auto-import** | Garmin/Whoop/Strava push a completed workout into the session as actuals | Large | Strava API free, Garmin ~free with limits | Trainerize, Everfit, TrainHeroic |
| **Form builder (custom check-ins)** | Current CheckIn is fixed fields — coaches want "Did you take creatine? Hours slept?" per-athlete | Quick | react-hook-form + JSON Schema; store answers on CheckIn.answers Json | TrueCoach, PT Distinction, Trainerize |
| **PWA install + offline** | 1-tap "Add to home screen", works in gym with no signal | Quick | next-pwa or Serwist + manifest.json + offline fallback page | TrueCoach app, Hevy, Everfit |
| **Rest-day calendar reminders** | Push already exists; just schedule based on next session | Quick | Cron via Railway or Vercel-style free scheduler; or on-login catch-up | TrueCoach, Trainerize |
| **1RM calculator** | Coach-side tool: input a 5RM, get projected 1RM for Epley/Brzycki/Lombardi | Quick | Pure JS, no deps | TrueCoach, Hevy Coach |
| **Group challenges + leaderboards** | 30-day squat challenge, Fran leaderboard between clients of same coach | Medium | Pure DB — new `Challenge` + `ChallengeEntry` tables | Everfit, Hevy Coach, TrainHeroic |
| **Workout timer / stopwatch (live)** | Running an EMOM, AMRAP, or Tabata during a session | Quick | Pure client component; store rounds completed to actuals | Hevy, SugarWOD, TrainHeroic |
| **Voice / audio messages** | Coach records 20s voice note instead of typing — huge for Arabic market | Medium | MediaRecorder API + Cloudflare R2 free tier | Trainerize, PT Distinction |
| **PR confetti / achievement animation** | Dopamine hit when athlete hits a new PR → shares with friends | Quick | canvas-confetti (MIT, 7KB) + detection in saveActuals | Hevy, Strong, TrainHeroic |
| **Dark mode** | Industry baseline 2026; athletes train pre-dawn / late night | Quick | Tailwind `dark:` + next-themes | Everyone except FitSW |
| **E-signature / waiver** | Qatar coaches onboarding new clients need injury waiver + GDPR consent | Medium | Documenso self-host or an in-house signature pad using react-signature-canvas | Trainerize (paid), MyPT Hub |
| **Loyalty / referral codes** | "Refer 3 friends → 1 month free" built into client's account page | Medium | Pure DB; coupon field on Subscription | Trainerize add-on |
| **Nutrition tracking (not just plan)** | Athlete logs actual meals vs. target macros | Large | USDA FoodData Central API (free, no key), Open Food Facts (free, barcode lookup) | Everfit, Trainerize, TrueCoach via MFP sync |

### Top 5 to attack first (opinionated)

1. **PWA install + offline cache (half-day, 0€)** — next-pwa + manifest. Immediate perceived upgrade: your athletes get an app icon on their home screen, iOS treats it like a native app. This alone kills 90% of "when's the native app?" questions. Flip side: fixes the one critique the TrueCoach web version gets.

2. **Stripe Checkout for recurring (1 day, 0€ to integrate)** — The `Subscription` + `SubscriptionPlan` tables already exist in your schema, unused. Add 3 price points (990 QAR starter / 1490 QAR pro / 2490 QAR elite), wire Checkout + webhook, done. Coaches stop chasing payments on WhatsApp. 2.9% is the only cost. Qatar-specific: enable Mada / Tap Payments via Stripe Connect if revenue justifies.

3. **PR detection + confetti (2-3 hours, 0€)** — in `saveActuals`, when a logged weight > the athlete's previous PR for that movement, flag `isPR: true` on the actuals row and fire `canvas-confetti` client-side. Users remember animated feedback. Also push notification "🎉 New PR!" to the coach — recovers coach engagement.

4. **1RM calculator + workout timer (3-4 hours, 0€)** — two quick-wins that make Agon look like a real training app, not a program delivery tool. Timer on the session view (`EMOM / AMRAP / Tabata / For Time`) stores reps to actuals. 1RM calc as a floating tool on the program builder.

5. **Form builder for check-ins (1 day, 0€)** — Change `CheckIn` to also carry a `customAnswers: Json` field keyed by question id. Add a per-coach `CheckInTemplate` model where the coach defines fields. Everyone else charges extra for this.

**Deliberately skip for now**: live video calls (adds infra cost, athletes use WhatsApp anyway), white-label domains (not needed until you have 10+ coaches, which also unlocks the whole Jorge-only mode), nutrition tracking (massive scope, build if you partner with a dietitian).

---

## PART B — AI / design tools to modernize the UI

| Tool | URL | What it does | Free tier (late 2026) | Fit for Next.js 16 + Tailwind |
|---|---|---|---|---|
| **v0.dev** | v0.dev | Full React + Tailwind + shadcn components from text prompt or screenshot | ~200 credits/mo free, no CC. One generation = 2-10 credits. Outputs TS App-Router ready | Native fit — this is Vercel's own tool |
| **Lovable** | lovable.dev | Full-app scaffold from a prompt (Supabase + React + Tailwind) | 30 free messages/day, no CC | Outputs Vite usually — adaptable but not drop-in for Agon |
| **Bolt.new** | bolt.new | In-browser Next.js app generation + preview | ~1M tokens/day free | Drop-in Next.js — great for isolated features |
| **Magic Patterns** | magicpatterns.com | Component / landing-page gen with Tailwind + shadcn | 20 generations/mo free | Native React, drop into App Router |
| **21st.dev** | 21st.dev | Marketplace of free shadcn-style components + MCP generator | Free; CC-BY-SA mostly | shadcn-compatible, paste directly |
| **tweakcn** | tweakcn.com | Visual editor for shadcn themes → outputs the CSS variables you paste in globals.css | 100% free | Perfect for your palette work |
| **Aceternity UI** | ui.aceternity.com | Free framer-motion-powered hero / card / animation components (motion gradients, 3D card hover, spotlight) | Free, MIT most | Paste as .tsx, uses Tailwind + framer-motion |
| **Magic UI** | magicui.design | 150+ free animated components (marquees, orbit, bento, globe) | Free, MIT | Paste as .tsx, same stack |
| **Cult UI** | cult-ui.com | Minimal, premium-feeling animated components | Free, MIT | Same stack |
| **shadcn/ui** | ui.shadcn.com | The canonical copy-paste component library | Free forever | Already assumed |
| **Phosphor Icons** | phosphoricons.com | 7000+ icons, 6 weights, incl. barbell/dumbbell/kettlebell | Free, MIT | `@phosphor-icons/react` |
| **Lucide** | lucide.dev | 1600+ icons (fork of Feather) | Free, ISC | `lucide-react` |
| **Lottiefiles** | lottiefiles.com | Free vector animations marketplace (celebration, loader, PR unlocks) | 2 private downloads/mo on free tier; use free public | `@lottiefiles/dotlottie-react` |
| **unDraw** | undraw.co | Free illustrations, color-customizable | Free, MIT-like | SVG — adjust fill to your palette |
| **Storyset** | storyset.com | Free fitness-themed illustrations incl. animated | Free with attribution; paid for no attribution | SVG + Lottie |
| **IBM Plex Sans Arabic / Readex Pro** | fonts.google.com | Arabic-ready display fonts with premium feel | Free, OFL | `next/font/google` |
| **GSAP (now MIT!)** | gsap.com | Scroll-triggered animations, timelines; went MIT in 2024 | Free forever since the open-source re-license | Works with any framework |
| **canvas-confetti** | npmjs.com/package/canvas-confetti | 7KB confetti burst | Free, ISC | One-liner `confetti()` |

### Top 5 design moves for Agon this week

1. **Replace the landing hero + testimonials with a v0.dev generation (1 hour).** Prompt: *"Fitness coaching SaaS hero section, dark navy + gold accent, Arabic-ready typography, two columns, left side has a bold headline + star rating + 2 CTA buttons (Book free call / Browse coaches), right side has a mobile phone mockup showing a workout session, below hero is a 3-column stat strip (300+ programs delivered / 15+ coaches / 4.9★). Next.js + Tailwind + shadcn, server component."* Replace `components/HeroSection.tsx` with the output. Hero + testimonials together carry 70% of landing conversion weight — spend the hour.

2. **Add Aceternity UI's "spotlight card" to the athlete evolution PR tiles (30 min).** Right now the PR cards are flat. Grab `components/ui/card-spotlight.tsx` from ui.aceternity.com, wrap each benchmark card. Pointer-tracked gradient makes the Girls / Heroes grid feel like a real training app, not an admin panel. Zero perf cost (one framer-motion instance per card).

3. **Swap your emoji buttons for Phosphor duotone icons (1 hour).** Install `@phosphor-icons/react`. Replace 📈 📊 📸 💬 📄 in the coach + athlete nav with `<ChartLineUp />`, `<ChartBar />`, `<Camera />`, `<ChatCircle />`, `<FilePdf />` — all two-tone, consistent weight. Instant premium feel; your current emojis render differently per OS which already makes the app look inconsistent.

4. **Confetti + animated counter-up on PR save (1-2 hours).** Install `canvas-confetti` + `framer-motion`. In `SessionActualsForm`, detect PRs client-side by comparing the new weight to the previous best (passed as a prop). On PR submit: `confetti({particleCount: 100, spread: 70})` + a counter that animates from the old PR → new PR in 1.5s. Match the energy of Strong/Hevy. Users record videos of this and share them.

5. **Dark-mode first pass using tweakcn (2-3 hours).** Go to tweakcn.com, dial a dark theme with cobalt primary + amber accent + warm neutrals. Export the CSS variables, paste into `globals.css` under `.dark`. Install `next-themes`, add a toggle in the header. Only 4 files change. Crucially — your Qatar athletes training at 5am / 10pm will love this; competitor Trainerize has one, TrueCoach doesn't.

**Honorable mention**: run **Realtime Colors** (realtimecolors.com) with your current CTA color (`#2E75B6`) and iterate for 5 min — you'll either confirm the current palette is good or find a 10%-better one. Costs 0€.

---

**One-page checklist for the next 7 days**: PWA install + offline (half-day) → Stripe Checkout wiring (1 day) → PR confetti + animated counter (half-day) → v0 landing hero + Phosphor icons (half-day) → dark mode via tweakcn (half-day). Total: ~3 workdays. Spend ~€0 on third-party services (Stripe takes a % only on real payments).

---

*Report compiled from current (late 2026) knowledge of competitor feature sets, open-source library landscape, and AI design-tool pricing pages. Where specific free-tier limits are mentioned (v0.dev credits, Bolt tokens, Lottiefiles download caps), verify them on the vendor's current pricing page before building — these tools adjust quotas every few months.*
