# Banime

Banime is a private, mobile-ready anime tracker, discovery app, and news hub.
Anime data comes from the Tenrai v1 API. Tracking is local-first and can
optionally sync across devices through Supabase.

Tenrai v1 follows the Jikan v4 response schema for the endpoints Banime uses.
Tenrai does not provide Jikan's `/watch` endpoints, so Banime builds its
trailer feed from trailer metadata on current-season anime records.

## Features

- Browse currently airing, upcoming, and the top 100 most popular anime
- Search the Tenrai catalog and filter by type, genre, score, and sort order
- Read news associated with current anime and browse popular trailers
- See the next scheduled weekly broadcast in your local time
- Track status, episode progress, notes, and personal scores
- Search and filter your library by status, type, genre, score, and progress
- Open configurable watch-search links from library and detail pages
- Use a persisted light or dark theme with a blue accent palette
- Keep tracking locally with no account or backend required
- Optionally sync the same library between desktop and phone
- Install as a Progressive Web App from a phone home screen
- Import MyAnimeList XML exports, and import or export Banime JSON backups
- Connect ChatGPT through MCP to search anime, read or update the synced
  library, pull news, and request recommendations

## Update cadence

- Deployed app code is checked at startup and every 60 minutes while Banime is
  open. The generated service worker installs updates automatically.
- Current-season and airing feeds refresh every 15 minutes while visible.
- Top 100 popular anime refreshes every 6 hours and uses persistent browser
  caching because that list changes slowly.
- News headlines and trailers refresh every 2 hours while visible.
- Fresh Tenrai responses are cached until their endpoint-specific expiry time.
- Returning to a stale browser tab triggers a refresh.
- Search results are cached for 10 minutes and anime details for 30 minutes.

Tenrai broadcast times are weekly schedule estimates. They may differ from the
time an episode becomes available on a streaming platform.

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

Local storage remains the primary offline copy. When a user signs in, Banime
merges local and cloud records and keeps the newest version of each title.

The database stores the complete tracker record as JSON and also maintains
query columns for status, title, type, score, progress, and added/updated time.
The schema adds user-scoped B-tree indexes and a trigram title-search index.
The current personal-library UI hydrates the user's rows once, then performs
memoized filtering locally so it stays responsive and works offline.

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

The publishable key may be used in browser or server code. The Supabase secret
key is only for username resolution inside Vercel Functions. Never put a
Supabase secret or service-role key in a `VITE_` environment variable.
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
- `src/services/storage`: Local browser repository and legacy data migration
- `src/services/supabase`: Auth client loading and cloud tracker repository
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
