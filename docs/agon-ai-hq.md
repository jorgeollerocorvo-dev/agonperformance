# AGON AI HQ — draft-only foundation

Owner-only page: /en/admin/ai-studio (existing credentials plus fresh database identity and ban check). No customer data, new paid service, publishing or price changes.

## Verification
Run npm ci, npx prisma generate, npx tsx --test tests/agon-hq-plan.test.ts, and npm run build on the development branch. Test logged-out, non-owner, banned-owner and owner sessions against a test database. Confirm draft creation, review, pause and duplicate handling. Do not merge until checks pass.

## Operation
The existing AiCache table stores namespaced draft records and the pause flag without schema changes. Default paused. The owner can generate a local template manually, review and reject drafts. No automatic retry after a failed attempt, maximum one claimed day (Qatar timezone). Review status does not publish.

To schedule, provision a separate Railway cron worker with the same application build and DATABASE_URL reference, start command npx tsx scripts/agon-hq-daily.ts, cron 0 3 * * * (06:00 Qatar), no restart, no public domain. Confirm that configuration overrides the root railway.json start command and pre-deploy migration command; do not run migrations from the worker. Set AGON_HQ_AUTOMATION_ENABLED=true on the worker and allow scheduled drafts in the dashboard. The job must exit after execution. Verify deployment and logs. The worker is not provisioned by this code.

Gemini is optional, disabled unless AGON_HQ_GEMINI_ENABLED=true; set on web and worker only after confirming billing tier and quotas. Reuse existing key securely; no paid-provider fallback. Only public catalog names and marketing topics sent to Gemini. No client records. Model output remains untrusted drafts. Railway usage can incur costs.

Instagram: authorize the professional account through an official Meta app, configure token and permissions in Railway securely, then implement and test media hosting, render pipeline, container processing, idempotent publish, token renewal, insights, and emergency stop. Do not treat approval as authorization to publish. No credentials in GitHub. No Instagram connection has been established by this code.

## Local video renderer
`node scripts/render-agon-hq.mjs draft.json output.mp4` makes a silent, text-based branded H.264 1080x1920 30fps Reel from the draft format and copy fields. Requires FFmpeg with libx264 and drawtext plus DejaVu Sans. Smoke-tested locally on a sample: 20 seconds, 1080x1920, 30fps, yuv420p. The dashboard now supports an optional private on-demand MP4 download (set AGON_HQ_RENDER_ENABLED=true only after FFmpeg, drawtext, libx264 and fonts are verified on the web service). The daily worker still generates copy only. These previews show storyboard instructions, not finished advertising video; never auto-publish them. The dashboard also exports a branded PNG cover (1080x1920 for Reels or 1080x1350 for posts/carousels) and draft JSON. Production needs automated rendering, approved media delivery and review; footage, voiceover and full carousel rendering remain unimplemented.

## Instagram identity check
Use Meta's Instagram Login flow for @agonperformanceqa. Set AGON_HQ_INSTAGRAM_TOKEN in Railway only and optionally AGON_HQ_INSTAGRAM_API_VERSION to the app's supported Graph version. The owner-only dashboard link verifies the username through graph.instagram.com and reports profile access only. No token is returned or logged. Publishing remains disabled and unimplemented. Never put access tokens in GitHub or chat.
