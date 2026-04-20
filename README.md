# Agon Performance

Online coaching platform — coaches build editable workouts with YouTube demos, athletes see and complete their daily session.

## Stack

- Next.js 16 (App Router, Turbopack) · React 19
- Prisma + PostgreSQL
- Auth.js v5 (credentials)
- TailwindCSS v4
- i18n: ES / EN (auto-detected, switchable)

## Local dev

```bash
cp .env.example .env
# set DATABASE_URL to a running Postgres
npx auth secret  # paste into AUTH_SECRET
npm install
npx prisma migrate dev
npm run dev
```

## Deploy (Railway)

1. Link a Postgres plugin → exposes DATABASE_URL.
2. Set AUTH_SECRET and AUTH_TRUST_HOST=true in Railway variables.
3. Build command: `npx prisma generate && npx prisma migrate deploy && next build`
4. Start command: `next start`
