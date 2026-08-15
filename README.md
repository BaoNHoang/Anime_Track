# Banime

Banime is a private, mobile-ready anime tracker, discovery app, and news hub.
Anime data comes from the Tenrai v1 API. Tracking is local-first and can
optionally sync across devices through Supabase.

Tenrai v1 follows the Jikan v4 response schema for the endpoints Banime uses.
Tenrai does not provide Jikan's `/watch` endpoints, so Banime builds its
trailer feed from trailer metadata on current-season anime records.

## Documentation map

- `README.md` is the user-facing feature, setup, operation, and deployment
  guide.
- `PRODUCT.md` records product audience, purpose, scope, and principles; it
  does not duplicate implementation history.
- `DESIGN.md` records visual, interaction, responsive, and accessibility rules;
  it does not act as a feature checklist.
- `docs/engineering-history.md` records architecture, data flows, caching
  internals, security decisions, verification evidence, risks, and append-only
  chronological milestones.

## Feature reference

### Home and anime discovery

- Home presents the current season, a compact coming-soon shelf, top airing
  titles, recent headlines, a blast-from-the-past collection, and ranked
  collections for the 2000s, 2010s, and 2020s.
- Discover supports catalog search and paged browsing so users are not limited
  to the first response page. Browse presets include airing, upcoming, popular,
  classics, movies, family titles, Studio Ghibli, and most favorited titles.
- Search and discovery results remain cached between page changes. Previously
  visited pages can be revisited without immediately downloading the same data.
- Anime details open in an overlay drawer without shifting the page behind it.
  The drawer shows catalog metadata, synopsis, trailer availability, tracking
  controls, favorites, and the configured external watch-search action.
- The header provides catalog search and a shuffle action that opens a random
  currently airing title.
- News uses equal-weight article cards and links to the original publisher.
  Banime also builds a trailer feed from current catalog trailer metadata.

### Personal anime tracking

- Every tracked title has one of five statuses: Watching, Completed, On hold,
  Dropped, or Plan to watch.
- Users can record episode progress and a personal score from 1 through 10.
  Score controls can use whole-number or half-point increments. Notes imported
  from MyAnimeList or Banime backups are preserved and searchable, but Banime
  does not currently provide a notes editor.
- Marking a title Completed automatically fills its known episode count.
  Progress and scores are validated and cannot exceed their allowed ranges.
- The library can be searched across titles, studios, genres, and notes. It can
  be filtered by tracking status, anime type, genre, and minimum personal score,
  then sorted by recent update, recent addition, title, score, or progress.
- Large libraries are displayed 60 titles at a time. Changing a rating does not
  immediately reorder the visible Recently updated list and move the title away
  while the user is editing it.
- Library and detail pages can open a configurable third-party search or
  availability provider. Banime does not host, stream, or embed episodes.

### Profile and activity

- The profile shows a user banner, profile picture, total tracked anime, days
  watched, episodes watched, mean score, completion progress, and recent
  activity ordered by the latest update.
- Airing next prioritizes currently airing titles marked Watching, followed by
  Plan to watch titles and then the wider airing catalog. Broadcast times are
  shown in the user's local time zone.
- Genre overview calculates the five most represented genres in the user's
  library and displays their proportional distribution using theme-aware colors.
- Users can search for and maintain ordered favorites for anime, studios,
  directors, and characters. Favorite anime can also be toggled from the anime
  detail drawer.
- Accounts include ten built-in anime profile pictures and five built-in anime
  banners. Users may instead upload their own 512 x 512 profile picture or
  1600 x 500 banner.
- Uploaded profile media is decoded, resized, re-encoded as WebP, stripped of
  original metadata, bounded by output size, stored in a private bucket, and
  served through short-lived signed URLs.

### Release notifications

- Banime creates in-app alerts when a scheduled episode airs for a title marked
  Watching or Plan to watch. The profile picture and Notifications menu show an
  unread-count badge.
- A notification opens the related anime detail drawer. Individual alerts can
  be cleared with a check action, or all alerts can be cleared together.
- Release checks run when Banime opens, once per minute while it remains open,
  and when a background tab becomes visible again.
- These are schedule-based in-app notifications stored in the browser. They are
  not operating-system push notifications and do not run while the app is fully
  closed. Broadcast schedules can also differ from streaming availability.

### Accounts, privacy, and storage

- Banime can run in local-only mode with no account service. In that mode the
  library, profile, and settings remain usable and personal data stays in that
  browser.
- A production deployment can enable Banime accounts backed by Supabase. When
  enabled, protected profile, library, settings, and notification routes require
  sign-in, while Home, Discover, News, and legal pages remain public.
- Account flows include email or username sign-in, Google sign-in, password
  reset, email verification codes, verification-code resend, sign-out, and
  permanent account deletion.
- A sign-up is not considered usable until its email verification code is
  accepted. Passwords, password hashes, and identity tokens are handled by
  Supabase Auth rather than the browser application.
- Browser sessions use same-origin `HttpOnly`, `SameSite=Lax` cookies, with the
  `Secure` flag in production. API routes derive the owner from the verified
  session instead of trusting a browser-supplied user ID.
- Tracking writes are local-first for responsive interaction. Authenticated
  libraries are also synchronized to Supabase and cached per account in
  IndexedDB, while compact profile summaries load before the entire library.
- Account-specific browser caches are separated by owner and cleared during
  sign-out. Row-level security limits database records to their authenticated
  owner.
- The privacy and terms pages document cookies and account data. Users can
  permanently delete their account and associated profile, library, and profile
  media from the account controls.

### Portability, installation, and integrations

- MyAnimeList XML exports can be imported. Banime checkpoints the parsed list
  before enriching it with current Tenrai posters and metadata, so a partial
  catalog failure does not discard the base import.
- Banime JSON backups can be imported or exported. Imports are limited to 5 MB
  and 5,000 records, and all imported values are validated before storage.
- Banime is an installable Progressive Web App. Its application shell remains
  available offline, deployed updates are detected automatically, and loading
  regions use layout-matched skeletons instead of temporary zero-value content.
- Light and dark themes persist on the current device. Motion respects the
  operating system's reduced-motion preference, and desktop/mobile navigation
  adapt to the available screen size.
- The separate MCP server can let an approved ChatGPT connection search anime,
  load details and news, read or update the authenticated library, and produce
  recommendation candidates. MCP library access uses the caller's Supabase
  identity and the same row-level security rules as the app.

### Route map

| Route | Purpose | Access when cloud accounts are enabled |
| --- | --- | --- |
| `/` | Current season, coming soon, historical shelves, headlines, and top airing | Public |
| `/discover` | Search, feed presets, filters, sorting, and catalog pagination | Public |
| `/news` | Anime headlines and trailer feed | Public |
| `/profile` | Identity, statistics, activity, airing next, genres, favorites, and profile editing | Signed-in user |
| `/library` | Personal tracking grid, search, filters, sorting, and pagination | Signed-in user |
| `/notifications` | Scheduled-release alerts and clear actions | Signed-in user |
| `/settings` | Theme, score precision, install, watch provider, imports, exports, and connection status | Signed-in user |
| `/account` | Sign-in, sign-up, verification, and password recovery | Public when signed out |
| `/privacy`, `/terms`, `/accessibility`, `/sitemap` | Legal, privacy, accessibility, and navigation references | Public |

When cloud accounts are disabled, Profile, Library, Notifications, and Settings
remain available through the local profile instead of requiring sign-in.

## Update cadence

- Deployed app code is checked at startup and every 60 minutes while Banime is
  open. The generated service worker installs updates automatically.
- Current-season data polls every 15 minutes while mounted. Airing and upcoming
  pages become stale after 15 minutes and refresh the next time requested.
- Popular, search, and historical browse pages use persistent browser caching;
  slow-changing browse feeds remain fresh for 6 hours.
- News headlines and trailers refresh every 2 hours while visible.
- Fresh Tenrai responses are cached until their endpoint-specific expiry time.
- Current-season and news queries refresh on their configured intervals while
  mounted. Window-focus refetching is disabled to avoid unnecessary repeat
  requests when switching tabs.
- Search results and anime details are cached for 30 minutes.

Tenrai broadcast times are weekly schedule estimates. They may differ from the
time an episode becomes available on a streaming platform.

## Caching at a glance

Banime uses separate caches for separate kinds of data. A cache improves load
time but never grants account access; authenticated API requests still verify
the server session and database ownership.

| Cached data | Storage | User-visible behavior |
| --- | --- | --- |
| Tenrai catalog responses | Memory plus bounded `sessionStorage` or `localStorage` | Reuses fresh search, detail, season, news, and browse responses instead of repeating identical upstream requests |
| React Query results | Browser memory | Keeps previously visited discovery pages visible and coordinates retries, cancellation, and background refresh |
| Authenticated library snapshot | Owner-scoped IndexedDB record | A refresh can show the last validated library while fresh cloud pages load |
| Profile summary | Compact server response | Statistics, recent activity, genres, and airing priorities can render without waiting for thousands of complete library rows |
| PWA application shell | Generated service worker cache | Installed/static UI can open without redownloading every application asset |

Tenrai memory and persistent caches are capped at 120 entries each. Expired or
malformed records are removed. Authenticated library caches are keyed by the
account ID, validated when read, refreshed after tracker changes, and cleared
for the previous owner during sign-out. Release notifications use a separate
owner-scoped `localStorage` record and are not part of the library cache.

## Run locally

Use Vite for local-only mode. It serves the browser application but does not
run files under `api/`:

```bash
npm install
npm run dev
```

Use the Vercel development server when testing sign-in, cloud sync, or any
other `/api` route:

```bash
npx vercel env pull .env.local
npx vercel dev
```

Production verification:

```bash
npm run build
npm run lint
npm run api:check
npm run mcp:check
npm test
```

## Accounts and cross-device sync

Banime uses Supabase Auth behind same-origin Vercel Functions. Access and
refresh tokens are stored in `HttpOnly`, `SameSite=Lax`, secure production
cookies instead of browser storage. Password hashing, JWT issuance, email
verification, and identity-provider tokens are handled by Supabase Auth.

Users can sign in with email or username and password, or continue with
Google. Username-to-email resolution uses the server-only Supabase secret and
never exposes the profile directory to browsers. Every library endpoint
derives the owner from the verified session; it does not accept a user ID from
the URL or request body.

Local mode writes its own browser library immediately. Account mode keeps that
anonymous local library separate: after sign-in, Banime loads only the signed-in
owner's cloud records and owner-scoped IndexedDB snapshot. This prevents one
person's local data from being silently merged into another person's account.
Authenticated writes update the owner cache immediately and queue the matching
cloud mutation.

The database stores the complete tracker record as JSON and also maintains
query columns for status, title, type, score, progress, and added/updated time.
The schema adds user-scoped B-tree indexes and a trigram title-search index.
The cloud library API returns bounded pages and the client loads those pages in
parallel batches. A smaller profile-summary endpoint independently returns
statistics, recent activity, favorite genres, and tracked airing titles so the
profile does not wait for a library containing thousands of rows. Once the
library is hydrated, deferred search and memoized filtering keep repeated local
interactions responsive.

1. Create a Supabase project at <https://supabase.com>.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. In Supabase Auth, require email confirmation.
4. Replace the **Confirm signup** and **Reset password** email templates with
   [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html)
   and [`supabase/templates/recovery.html`](supabase/templates/recovery.html).
5. Configure custom SMTP. For a small private deployment, Gmail SMTP uses
   `smtp.gmail.com`, port `587`, your Gmail address, and a Google app password.
   Store the app password only in Supabase; never add it to this repository.
6. In Google Cloud, create a Web OAuth client. Add the Supabase callback URL
   shown on the Supabase Google provider page, then enable Google in Supabase
   with that client ID and secret.
7. Copy `.env.example` to `.env.local` for local Vercel development, or add
   the variables in the Vercel project:

```env
VITE_ACCOUNT_AUTH_ENABLED=true
APP_URL=https://your-banime-domain.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-server-only-secret-key
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

8. Add `http://localhost:3000` and the production account page to the Supabase
   redirect allow list. Set the production Site URL to the deployed origin.
9. Configure Upstash in production with
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so account rate
   limits are shared by every serverless instance. Production account and
   library mutations fail closed when these variables are absent.
10. Run locally with `npx vercel dev`, then open `/account`.

The SQL file is designed to be rerun. It backfills query columns for existing
rows, creates private user profiles, adds missing constraints and indexes, and
recreates the same RLS policies.

The publishable key is not a secret, but Banime keeps it server-side for the
web account boundary. The Supabase secret key is used only by narrowly scoped
Vercel account-administration paths. Never put a Supabase secret or service-role
key in a `VITE_` environment variable.
Row-level security limits each signed-in user to their own profile and tracker
records even if an API handler is implemented incorrectly.

## Connect ChatGPT with MCP

Banime includes a separate Streamable HTTP MCP server under `mcp/`. Public
Tenrai tools can search anime, load details, and pull title news. Library tools
use Supabase OAuth and the existing row-level security policies.

Available tools:

- `search_anime`
- `get_anime_details`
- `get_anime_news`
- `get_library`
- `add_to_library`
- `update_library_item`
- `remove_from_library`
- `get_recommendation_candidates`

### Run the MCP server locally

Copy `.env.mcp.example` to `.env.mcp.local`, add the same Supabase project URL
and publishable key used by the PWA, then run:

```bash
npm run mcp:dev
```

The default endpoint is `http://localhost:8787/mcp`. ChatGPT requires a public
HTTPS endpoint, so local execution is for development and MCP client tests.

### Deploy and authorize it

1. Deploy Banime over HTTPS with the account server variables.
2. Deploy `Dockerfile.mcp` as a separate public web service. `render.yaml` is
   included as one option.
3. Set `MCP_PUBLIC_URL` to the complete public `/mcp` URL.
4. Set `MCP_TRUST_PROXY=true` only when the service is behind a trusted proxy
   that replaces `X-Forwarded-For` and `X-Forwarded-Host`.
5. Set `MCP_ALLOWED_ORIGINS` to the exact Banime web origins that may call the
   endpoint. Do not use `*`.
6. Add a cookie-aware MCP consent endpoint before enabling the Supabase OAuth
   2.1 server. The previous browser-token consent route has been removed so it
   cannot bypass the account cookie boundary.
7. In Supabase Auth, enable the OAuth 2.1 server.
8. Enable dynamic client registration, or register the ChatGPT OAuth client
   manually.
9. Add `VITE_MCP_URL` to the PWA deployment and rebuild it.
10. In ChatGPT, open **Settings > Apps & Connectors > Advanced settings**,
   enable developer mode, create an app, and enter the public MCP URL.
11. Connect the app and approve access on Banime's consent page.

For production, use a Supabase access-token hook to issue a resource-specific
audience and set the same value in `MCP_EXPECTED_AUDIENCE`. Until that is
configured, leave `MCP_EXPECTED_AUDIENCE` unset. RLS still limits every token
to its own user's rows.

Official setup references:

- [OpenAI Apps SDK MCP server guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Connect an MCP server to ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)
- [OpenAI Apps SDK authentication](https://developers.openai.com/apps-sdk/build/auth)
- [Supabase MCP OAuth authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)

### MCP security controls

The public MCP edge applies:

- Exact host and optional browser-origin allow lists
- Per-IP request limits and additional hashed-token limits
- A separate tool-call quota
- A shared Tenrai budget capped at 120 requests per minute
- A 64 KiB JSON body cap and 16 KiB header cap by default
- Strict JSON content type, method, encoding, and URL-path checks
- Concurrent request, header, request, and upstream timeouts
- Strict Zod schemas that reject unknown keys, control characters, oversized
  text, invalid IDs, and invalid numeric ranges
- Generic client errors so Supabase and internal details are not leaked
- Supabase JWT issuer, authenticated-role, signature/expiry, and optional
  audience checks
- Parameterized Supabase/PostgREST filters with escaped `ILIKE` wildcards
- RLS enforcement using the caller's token rather than a service-role key

Rate limits default to in-memory counters, which are suitable for one MCP
process. For multiple replicas, configure `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`. This shares request, tool, and Tenrai limits across
all replicas. The server fails closed with `503` when a configured distributed
rate-limit store is unavailable.

The PWA deployment files add CSP, HSTS, frame blocking, MIME sniffing
protection, referrer controls, and a restrictive permissions policy. The
theme bootstrap is an external same-origin file so CSP does not require
`unsafe-inline`.

### Input and storage validation

- MyAnimeList XML imports and Banime JSON imports are limited to 5 MB by the
  UI and 5,000 records by the parser.
- MyAnimeList XML imports save the parsed list to local storage before Tenrai
  enrichment starts. If the app is stopped during enrichment, the base list is
  still available after relaunch.
- After the checkpoint save, Banime checks Tenrai for posters and current
  catalog details and saves those enriched details when available. Signed-in
  users also queue the same saves to Supabase.
- Imported text, arrays, IDs, scores, years, progress, and timestamps are
  bounded and validated.
- External links must be credential-free HTTPS URLs. Unsafe links are rejected
  on import and removed from Tenrai responses.
- Local storage is validated again when read, so manually altered persisted
  data is not trusted.
- The Supabase schema limits JSON records to 100 KB and adds title/type length
  checks.

Rerun `supabase/schema.sql` after this security update. The new constraints can
fail if existing rows exceed the limits; inspect and repair those rows before
retrying rather than removing the checks.

### Watch links

Banime does not host or embed anime episodes. Library cards and anime detail
pages can open an external search or availability page for the selected title.
The current provider is stored per browser in Settings. Default providers are
Anikoto, JustWatch, and Crunchyroll. Anikoto is the default provider and opens
its filter page for the selected title.

To rotate providers later, update `WATCH_PROVIDERS` in
`src/domain/watch/providers.ts`. Keep providers to authorized search or
availability destinations. Direct Anikoto episode links like
`/watch/{slug}/ep-1` require Anikoto's internal slug or ID, so Banime uses the
title filter URL unless a stable mapping is added later.

### Scaling model

Recommended production layout:

1. TLS/WAF or hosting proxy
2. One or more stateless Banime MCP containers
3. Upstash Redis for distributed rate limits
4. Supabase Auth/Postgres with RLS
5. Tenrai as the read-only catalog source

The MCP transport is stateless, so replicas do not require sticky sessions.
The Supabase verifier client is reused within each process, library reads are
paginated, and Postgres has user/status/date/type/score/title indexes. Keep the
shared Tenrai limiter enabled when adding replicas; otherwise each replica
would multiply traffic against Tenrai's public 4-per-second and 120-per-minute
limits.

Operational scaling still requires edge DDoS protection, request metrics,
central logs with token redaction, alerts, database connection monitoring, and
load testing. Application rate limiting is not a substitute for a provider
WAF.

## Install on a phone

A phone can install Banime as an app after it is deployed over HTTPS.

1. Deploy the repository to Vercel, Netlify, Cloudflare Pages, or another
   static HTTPS host.
2. Add the same Supabase environment variables to the hosting provider.
3. Add the deployed URL to the Supabase Auth redirect URL allow list.
4. Open the deployed site on the phone.
5. Android: use Chrome's **Install app** or **Add to Home screen** action.
6. iPhone: use Safari's **Share > Add to Home Screen** action.

`vercel.json` and `public/_redirects` are included so client-side routes work
when deployed to Vercel or Netlify.

## Architecture

- `src/app`: Application composition, routing, and shared providers
- `src/app/providers`: Context providers and their colocated consumer hooks
- `src/domain`: Framework-independent anime, news, and tracker models
- `src/domain/account`: Profile appearance and bounded favorites models
- `src/domain/watch`: Watch-provider registry and search-link builder
- `src/services/tenrai`: Tenrai DTOs, mapping, throttling, news, and API access
- `src/services/storage`: Local tracker/profile records, notification storage,
  account session hint, owner-scoped IndexedDB cache, and legacy migration
- `src/services/account`: Same-origin cookie-authenticated account client
- `src/services/supabase`: Paged cloud tracker and profile-summary repository
- `api`: Same-origin Vercel auth, profile-media, and owner-scoped library routes
- `src/hooks`: Reusable query, install, and utility hooks
- `src/features`: Dashboard, discovery, news, library, details, and settings
- `src/components`: Shared presentation components
- `docs`: Engineering history and long-form project records
- `mcp`: Streamable HTTP server, OAuth token validation, tool registration,
  Supabase library repository, and recommendation ranking

Tenrai is read-only. Personal tracking data is never sent to Tenrai or
MyAnimeList.

Profile favorites use Tenrai only for public catalog search. The selected and
ordered favorites remain in local browser storage or the authenticated Banime
profile. Rerun `supabase/schema.sql` after updating so cloud profiles receive
the `favorites` JSONB column and size constraint.

Provider references:

- [Tenrai API documentation](https://api.tenrai.org/llms.txt)
- [Tenrai service status](https://tenrai.org/status)
