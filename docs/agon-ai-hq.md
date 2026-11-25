# AGON AI HQ — draft-only foundation

Owner-only page: /en/admin/ai-studio (existing credentials plus fresh database identity and ban check). No customer data, new paid service, publishing or price changes.

## Verification
Run npm ci, npx prisma generate, npx tsx --test tests/agon-hq-plan.test.ts, and npm run build on the development branch. Test logged-out, non-owner, banned-owner and owner sessions against a test database. Confirm draft creation, review, pause and duplicate handling. Do not merge until checks pass.

## Operation
The existing AiCache table stores namespaced draft records and the pause flag without schema changes. Default paused. The owner can generate a local template manually, review and reject drafts. No automatic retry after a failed attempt, maximum one claimed day (Qatar timezone). Review status does not publish.

To schedule, provision a separate Railway cron worker with the same application build and DATABASE_URL reference, start command npx tsx scripts/agon-hq-daily.ts, cron 0 3 * * * (06:00 Qatar), no restart, no public domain. Confirm that configuration overrides the root railway.json start command and pre-deploy migration command; do not run migrations from the worker. Set AGON_HQ_AUTOMATION_ENABLED=true on the worker and allow scheduled drafts in the dashboard. The job must exit after execution. Verify deployment and logs. The worker is not provisioned by this code.

Gemini is optional, disabled unless AGON_HQ_GEMINI_ENABLED=true; set on web and worker only after confirming billing tier and quotas. Reuse existing key securely; no paid-provider fallback. Only public catalog names and marketing topics sent to Gemini. No client records. Model output remains untrusted drafts. Railway usage can incur costs.

Instagram: authorize the professional account through an official Meta app, configure token and permissions in Railway securely, then implement and test media hosting, render pipeline, container processing, idempotent publish, token renewal, insights, and emergency stop. Do not treat approval as authorization to publish. No credentials in GitHub. No Instagram connection has been established by this code.
