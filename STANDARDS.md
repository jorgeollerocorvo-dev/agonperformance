# Agon Performance — invariant standards

These four rules take precedence over any other optimization, feature, or
refactor. Any change — code, schema, deploy — MUST preserve all four. If a
proposed change would violate one, redesign it before shipping.

## 1. Saves are sacred

Clients, programs, workouts, and movements MUST always save successfully.

- Every mutation path (`saveProgram`, `createProgram`, `copyDayToAthlete`,
  `importAndCreateProgram`, `importWorkoutPhotos`, athlete engagement actions)
  completes within the Next.js server-action budget (~25s hard cap, target
  <5s for a 12-week program).
- Transactions use `createMany` / `createManyAndReturn` for anything that
  loops over weeks/days/blocks/movements. **Never** put a per-item `await`
  inside a `for` loop inside a `prisma.$transaction`.
- Any network call that could take >1s (YouTube scrape, external API) MUST
  run outside the save path — either lazily on read, or fire-and-forget
  after the response is sent.
- Every mutation uses explicit `{ timeout: >= 30_000, maxWait: >= 5_000 }`
  when `prisma.$transaction` is involved, and times itself.

Enforced in: `app/[lang]/coach/programs/[id]/actions.ts`,
`lib/youtube-search.ts`.

## 2. Program UI is fast; videos stay quiet

Program creation and viewing MUST feel instant. Videos load their thumbnails
but DO NOT auto-play. Playback starts only when the coach or the athlete
clicks.

- No `autoplay` attribute on any `<video>` or YouTube iframe (default is
  off; never pass `autoplay=1`).
- Video iframes are lazy-loaded (`loading="lazy"`) and only mounted when the
  user requests playback.
- Thumbnails are static `img` tags against YouTube's thumbnail service
  (`https://i.ytimg.com/vi/{id}/hqdefault.jpg`) — zero third-party JS until
  playback.
- Any page that renders a session, program, calendar, or history MUST open
  in <1s on a warm Neon connection.

Enforced in: `components/CoachMovementVideoThumb.tsx`,
`components/AthleteMovementVideo.tsx`, `lib/youtube.ts`.

## 3. Library-first for every movement

When the coach types a movement name, the typeahead recommends matches from
the Movement library first. Only AFTER the coach stops typing (debounced on
save), unmatched names are resolved by searching YouTube for a demo video.

- `/api/movements/suggest` queries the library (`Movement` + `CoachMovement`
  for the active coach), case-insensitive across `nameEn` / `nameEs` /
  `nameAr`.
- `saveProgram` runs the library sweep first; unresolved names fall through
  to a fire-and-forget YouTube bootstrap AFTER the save response is sent.
- `resolveOrCreateMovementByName` always library-checks before any YouTube
  call. Negative results are cached for 7 days.
- `ensureMovementVideoUrls` on athlete pages batch-reads the library in one
  query, then only hits YouTube for the <=5 unresolved names that are
  outside the negative-cache window.

Enforced in: `components/MovementNameInput.tsx`, `lib/movement-resolver.ts`,
`lib/youtube-search.ts`, `app/[lang]/coach/programs/[id]/actions.ts`.

## 4. Auto-promote stable movements into the coach's library

If a movement has been in a client's program for more than 24 hours AND has
a YouTube demo URL attached, it MUST be promoted into the owning coach's
`CoachMovement` library so future programs find it in the library-first
sweep.

- "Stable" means `ProgramMovement.createdAt > 24h ago`.
- "Has demo" means the referenced `Movement.videoUrl` is set (not null) OR
  the ProgramMovement's `prescription.youtubeUrl` is a real video (not a
  search URL).
- Promotion creates a `CoachMovement` row with the coach's id, the movement
  name (preferring the Movement library's canonical `nameEn` when linked,
  otherwise `customName`), the resolved `videoUrl`, and `code` derived from
  the name. Duplicates are protected by `(coachProfileId, code)` unique.
- The promotion job runs fire-and-forget on coach-side page loads
  (`/coach/athletes`, `/coach/athletes/[id]`, `/coach/programs/[id]`) so
  there's no cron cost; each run is capped at 25 promotions to stay cheap.

Enforced in: `lib/promote-movements.ts`,
`app/[lang]/coach/athletes/page.tsx`.
