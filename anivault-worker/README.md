# AniVault — Cloudflare Worker (Phase 2 + 3a)

## Phase 2: Auth & Sessions
Full port of `includes/auth.php`: email/password login+register, Google OAuth,
Discord OAuth (with auto-join to your server), account linking/unlinking,
activity logging, and your Discord relay notifications. Session handling
(`$_SESSION` doesn't exist on Workers) is replicated with a `sessions` table
in D1 + an httpOnly cookie — functionally identical to what PHP was doing.

## Phase 3a: Shared layout + home + browse + search — COMPLETE
- `MalAPI` (`src/lib/mal-api.ts`) — full port of `includes/api.php`'s MAL API
  wrapper (with the Jikan fallback for characters/episodes/streaming), using
  Workers KV instead of local cache files
- `Settings`, `Notification`, `AnimeTracker` — ported from their PHP classes
- Header/footer/nav (`src/render/layout.ts`) — ported from `includes/header.php`
  / `includes/footer.php`, byte-for-byte on the markup/CSS/JS
- Home page (`src/routes/home.ts`) — ports `index.php`: hero, stats bar,
  Continue Watching (with the live TMDB→AniList episode-thumbnail fetching
  JS carried over verbatim), Watch Now, Airing This Season, Top Anime, Coming Soon
- Browse + search (`src/routes/browse.ts`) — ports `pages/browse.php`
  (filters, genre tags, pagination), `pages/search.php` (redirect into
  browse), `api/search_suggest.php` (live search dropdown)
- `renderAnimeCard` — ports `includes/anime_card.php`
- `renderPagination` is exported from `browse.ts` since `top.php`/`seasonal.php`
  in Phase 3b will need the same pager

**One intentional change:** CSS/JS/the icon sprite are served as normal static
assets (Workers Assets, same URLs as before — `/assets/css/style.css` etc.)
instead of being read into every page with PHP's `readfile()`. Same visual
result, but now cacheable by the browser instead of resent on every request.

**One thing I dropped, not ported:** `index.php` had a
`var_dump(session_id(), $_SESSION)` at the very top of the file — that dumps
session internals to your live homepage on every load. Looked like leftover
debug code, so I didn't carry it over. Flag it if that was intentional.

All routes kept the **exact same URLs** as your PHP site so your existing
`app.js` and OAuth redirect URIs don't need any changes.

## Setup

1. **Install deps**
   ```
   npm install
   ```

2. **Create D1 + KV**
   ```
   npx wrangler d1 create anivault
   npx wrangler kv namespace create API_CACHE
   ```
   Copy both IDs into `wrangler.toml`.

3. **Load schema + data + sessions table**
   ```
   npm run db:schema
   npm run db:sessions
   npm run db:data
   ```
   (`d1_data.sql` is the 3MB production data file from Phase 1 — grab it from
   that earlier message if it's not already in this folder.)

4. **Copy your image assets** into `public/assets/img/` (logo.png, icon.png,
   anime-library covers, etc.) — these weren't part of the code upload, so I
   couldn't bring them over, but all the paths referencing them are already
   correct.

5. **Set secrets** (rotate these — they were plaintext in your old
   `config.php`, which was in a downloadable zip):
   ```
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put DISCORD_CLIENT_ID
   npx wrangler secret put DISCORD_CLIENT_SECRET
   npx wrangler secret put DISCORD_BOT_TOKEN
   npx wrangler secret put DISCORD_SERVER_ID
   npx wrangler secret put BOT_SECRET
   npx wrangler secret put DISCORD_RELAY_URL
   npx wrangler secret put MAL_CLIENT_ID
   npx wrangler secret put MAL_CLIENT_SECRET
   npx wrangler secret put TMDB_API_KEY
   ```

6. **Update `wrangler.toml`** `SITE_URL`, `GOOGLE_REDIRECT_URI`,
   `DISCORD_REDIRECT_URI` to your real domain once DNS is on Cloudflare.

7. **Run locally / deploy**
   ```
   npm run dev       # local dev server
   npm run deploy    # ship it
   ```

## Phase 3b: Anime detail, character, schedule/top/seasonal — COMPLETE
- Seasonal (`pages/seasonal.php`), Top (`pages/top.php`, with smart
  paginated numbering), Schedule (`pages/schedule.php`, with JST
  episode-countdown math) — all in `src/routes/discover.ts`
- Anime detail (`pages/anime.php`) — `src/routes/anime.ts`. Episodes/
  characters/related tabs are populated by client-side JS hitting Jikan/
  AniList directly, exactly like the PHP version (`$loadExtra` was already
  `false` there) — that ~18KB of client JS is carried over verbatim
- Character page (`pages/character.php`) — `src/routes/character.ts`, fully
  server-rendered (unlike anime.php, this one never lazy-loaded)
- `streamWatchOn`/`SERVICE_DEFS` (`src/lib/stream-services.ts`) — ports the
  streaming-service logo/region-lock logic used on the anime detail page

**Streaming service logos aren't included** — copy your
`assets/img/streaming/*.png` files into `public/assets/img/streaming/` (same
as the other images that weren't part of the code upload).

## Phase 3c: Watch page + Senshi player — COMPLETE
Ports `pages/watch.php` + `pages/player.php` together (`src/routes/watch.ts`),
since the original PHP-included player.php directly into watch.php, sharing
variables. CSS and the bulk of client JS are carried over verbatim:
- `render/watch-css.ts`, `render/watch-script1.ts` (server probing/switching —
  AnimeHeaven MP4, Miruro HLS providers, Senshi/Volt), `render/watch-script2.ts`
  (wall-clock watch-progress tracker, only rendered for logged-in users)
- `render/player-css.ts`, `render/player-script.ts` (the full Senshi HLS
  player engine — HLS.js integration, custom controls, subtitle rendering,
  double-tap seek zones, keyboard shortcuts) carried over verbatim
- `render/player-body.ts` — the player's markup skeleton, with prev/next
  episode nav and the episode-chip grid computed the same way the PHP did

**A real bug caught during this phase, in already-shipped Phase 3b/3c code:**
my template-literal extraction script had an escaping-order bug — it
substituted the PHP variable first, *then* escaped backticks/`${`, which
meant any `${...}` already present in the *original* client-side JS (normal
JS template literals, e.g. `` `${lvl.height}p` ``) got left as live
expressions in my outer TS template literal instead of being preserved as
literal text. That would have thrown `ReferenceError`s at render time. Caught
it by actually evaluating the generated functions in Node with real
arguments and checking the output, not just type-checking. Fixed in both
`anime-tail.ts` (Phase 3b — regenerated and reverified) and this phase's
`watch-script1.ts`/`watch-script2.ts` (generated correctly from the start
once I knew to check for it).

## Verified so far (all phases)
- `tsc --noEmit` — clean, no type errors across all Phase 2/3a/3b/3c code
- `wrangler deploy --dry-run` — bundles clean (535KB), D1/KV bindings recognized
- Rendered every pure render function (`renderHeader`/`renderFooter`/
  `renderAnimeCard`/`renderPagination`/`playerBody`/`renderWatchBody`) with
  mock + edge-case data in Node directly and checked actual output
- Tested `currentEpisode()` and `parseDurationSeconds()` against real edge
  cases (future dates, capped episode counts, missing duration strings)
- Tested `streamWatchOn()` and the watch page's video/gate/no-video states
  across logged-in and logged-out branches
- Not yet tested: an actual live request against a real D1 instance (that's
  the "test together" step)

## Not yet built (later phases)
- Profile, feed, mylist, history, notifications, import/export (3d)
- `requireLogin()` / `requireAdmin()` middleware (ships with 3d/5)
- Admin panel, scraper wiring (5–6)

## Phase 3d: Profile, public profiles, import/export — COMPLETE (feed skipped per request)
- Import/export (`src/routes/importexport.ts`) — MAL XML export/import with
  a hand-rolled regex-based XML parser (Workers has no `simplexml_load_string`),
  JSON export/import, tested against a realistic sample with CDATA and HTML entities
- Profile page (`src/routes/profile.ts`) — bio/password editing, avatar
  upload flow, connected accounts
- Avatar storage (`src/routes/avatar.ts`) — moved to R2 since Workers can't
  write to local disk. Static image cropping is full-fidelity (cropping
  already happens client-side on canvas). **Animated GIF cropping has no
  Workers equivalent** (no Imagick/FFmpeg) — GIFs upload unmodified rather
  than silently dropping the feature; a real fix needs an external image
  service.
- Public profile page (`src/routes/user.ts`) — anime list, favorites,
  followers/following tabs with infinite scroll, follow/unfollow
- `src/lib/badges.ts`, `src/lib/follow.ts` — full ports of `includes/badges.php`, `includes/follow.php`

**Skipped per your instruction:** the social feed (`feed.php`, `post.php`)
since you flagged it as already broken in the live PHP version and want to
redesign/fix it later rather than porting bugs forward. `user.php` (public
profile) has zero dependency on the feed system, so it was safe to build
independently.

**A deliberate improvement:** the Discord connect/disconnect UI on the
profile page was fully commented out in your original PHP with a note
"temporarily disabled (curl blocked on free hosting)" — that's an
InfinityFree-specific limitation that doesn't exist on Workers, so it's
re-enabled.

## Final verification (all phases)
- `tsc --noEmit` — clean across all ~30 source files
- `wrangler deploy --dry-run` — bundles clean (683KB), all bindings (D1, KV, R2) recognized
- Every pure render/logic function tested with real and edge-case data in
  Node directly, not just type-checked

## Phase 4: Admin Panel — COMPLETE (all 27 pages)
Every admin page from the PHP site now has a Worker route:
- **Dashboard & auth**: index (KPIs, top anime, activity), impersonation (owner-only)
- **Users**: users.php (search/filter/role/ban/rename), merge_users (owner-only account merging), username_fixer (regex validation done in JS since D1 has no REGEXP)
- **Content**: episodes.php + api/episode_override.php, videos.php + api/videos.php (with iframe XSS sanitizer, tested against real attack strings), ep_thumbnails.php + api/thumb_search.php (5-source thumbnail scraper: Kitsu, TMDB, AniList, Jikan, AniSearch), anime_images.php, heal_images.php
- **Community**: badges.php, announcements.php, reviews.php, feedback.php, survey.php, banner.php
- **Analytics**: activity.php, analytics.php (heatmap using SQLite strftime instead of MySQL HOUR/DAYOFWEEK), watch_stats.php (MySQL CONCAT rewritten as SQLite `||`)
- **System**: cache.php + api_cache.php, ip_country.php

**Images now live in R2** (avatars, announcements, badges, anime library) instead of local disk, all under the same `AVATARS` bucket with different key prefixes.

**One real gap worth knowing about:** the sitewide banner (`banner.php`) writes to Settings, and `renderHeader()` already has the props to display it — but wiring "read Settings and pass banner data" into every single already-built page route wasn't done as part of this pass. It works end-to-end on infrastructure but needs a few lines added per-route to actually show live. Flagging this rather than silently leaving it half-wired.

## Final verification (all phases)
- `tsc --noEmit` — clean across all ~50 source files
- `wrangler deploy --dry-run` — bundles clean (952KB / 219KB gzipped), D1/KV/R2 all recognized
- Every pure render/logic function tested with real and edge-case data in
  Node directly, not just type-checked — including the iframe sanitizer
  against real XSS payloads, username validation regex, time formatting,
  and pagination URL building across every paginated page

## Phase 5: Scraper wiring, Discord relay, banner fix — COMPLETE
- All streaming-provider proxies ported: `senshi_stream.php`, `animeheaven_stream.php`,
  `miruro_stream.php` + `miruro_stream_cached.php`, `anikoto_stream.php` —
  all still call your existing Railway scraper services, curl → fetch
- `server_check.php` + `server_check_stream.php` — the SSE endpoint now uses
  a real `ReadableStream`, emitting each server's result the moment it
  resolves (Promise-based, same "don't wait for the slowest one" behavior
  as the original `curl_multi`)
- `dub_check.php` / `dub_report.php` — MegaPlay dub detection + community
  confirm/deny voting
- `embed.php` — the social-media embed page (OG tags for Discord/Twitter previews)
- `discord_user.php` — internal bot-secret-protected endpoint for your Discord bot
- **`api/series.php` was NOT ported** — it called `JikanAPI::getAnimeSeries()`,
  a method that doesn't exist anywhere in your PHP codebase (it would have
  fatally errored if ever hit), and nothing in `app.js` or any page calls
  this endpoint. Confirmed dead code, not carried forward.
- **Fixed the banner-wiring gap** flagged at the end of Phase 4 — every
  public page now actually fetches and displays the sitewide banner
  configured in `admin/banner.php`. Verified by rendering the header with
  banner data on/off and confirming the markup appears/disappears correctly.

## What this means for your Discord bot / relay
No changes needed on the Railway scraper or Discord bot side — the Worker
calls the exact same Railway URLs your PHP site called
(`ap1249-production-304e.up.railway.app`, `anivault-scraper.up.railway.app`),
and `discord_user.php` keeps the same secret-protected contract your bot
already expects.

## Everything is now ported except
- The social feed (`feed.php`, `post.php`) — set aside per your call, since
  it was already broken and you want to redesign it separately
- Whatever surfaces during real testing against live D1/KV/R2 (this has
  been verified with `tsc`, `wrangler --dry-run`, and targeted Node runtime
  tests throughout, but never against a real deployed instance)
