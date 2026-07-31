# Banime Engineering History

This document is the durable development record for Banime. It describes the
current architecture, data flows, development workflow, engineering decisions,
verification evidence, known limitations, and chronological project history.

The current-state sections should be updated when the implementation changes.
Chronological history entries should remain append-only. If a historical entry
is incorrect, add a dated correction rather than silently changing the event.

## Document Control

| Field | Value |
| --- | --- |
| Application | Banime |
| Version | `0.1.0` development snapshot |
| Document owner | Project maintainer |
| Created | 2026-06-06 |
| Last updated | 2026-06-20 |
| Time zone | America/New_York |
| Workspace | `C:\Users\bao12\OneDrive\Desktop\Anime_Track` |
| Status | Active development |
| Entry ID format | `HIST-####` |
| Decision ID format | `ADR-####` |
| Experiment ID format | `EXP-####` |
| Incident ID format | `INC-####` |

## Maintenance Rules

1. Update this file in the same change set as meaningful architecture,
   dependency, database, deployment, security, or behavior changes.
2. Keep the Current-State Summary, Architecture, Risks, and Roadmap accurate.
3. Add a new chronological entry for completed milestones or important failed
   attempts.
4. Record exact verification commands and results. Do not write only "tested."
5. Keep facts separate from plans. Label unverified behavior clearly.
6. Never record passwords, access tokens, Supabase secret keys, service-role
   keys, personal account data, or production credentials.
7. Do not claim a deployment, browser test, cloud sync test, or release unless
   direct evidence exists.

## Project Purpose

Banime is a personal anime application with four primary responsibilities:

1. Discover anime through the Jikan v4 API.
2. Track a private watch library, episode progress, status, and scores.
3. Present anime-related news and promotional videos.
4. Expose approved search, library, and recommendation actions to ChatGPT
   through MCP.

The application is designed to work as:

- A responsive desktop web application.
- An installable Progressive Web App on Android and iPhone.
- A local-only tracker when no backend is configured.
- A cross-device tracker when Supabase is configured and the user signs in.
- A private ChatGPT data source and library tool when MCP and Supabase OAuth
  are deployed.

### Current Product Goals

| ID | Goal | Status | Current evidence |
| --- | --- | --- | --- |
| GOAL-0001 | Track anime locally without requiring an account | Implemented | Local repository and tracker provider |
| GOAL-0002 | Discover and search anime through Jikan | Implemented | Dashboard and Discover routes |
| GOAL-0003 | Show anime news and promotional videos | Implemented with limited scope | News route aggregates current-season title news and popular promos |
| GOAL-0004 | Run as an installable phone application | Implemented as PWA, not yet deployed | Manifest, service worker, install UI, responsive navigation |
| GOAL-0005 | Sync one personal library across desktop and phone | Implemented but not end-to-end verified | Optional Supabase Auth, Postgres repository, merge and write queue |
| GOAL-0006 | Maintain modular boundaries for future native/mobile work | Implemented | Domain, service, context, hook, feature, and component layers |
| GOAL-0007 | Maintain reproducible quality checks | Implemented at basic level | Build, lint, and 26 unit/protocol tests |
| GOAL-0008 | Support accessible light and dark themes | Implemented | Persisted theme provider and device-level controls |
| GOAL-0009 | Restore a library from MyAnimeList XML or Banime JSON | Implemented | MAL XML parsing, Jikan enrichment, and JSON backup import/export in Settings |
| GOAL-0010 | Show the next scheduled broadcast | Implemented with source limitations | Jikan weekly broadcast metadata converted to local time |
| GOAL-0011 | Provide direct, efficient catalog and library filtering | Implemented | Memoized client filters and indexed Supabase query columns |
| GOAL-0012 | Reduce repeated Jikan work and News wait time | Implemented | Memory, session, and persistent catalog caches plus progressive News queries |
| GOAL-0013 | Let ChatGPT search anime and manage the approved private library | Implemented locally, not deployment-verified | Eight MCP tools, Supabase OAuth consent, RLS-bound repository, and protocol tests |
| GOAL-0014 | Open configurable watch-search links from tracked anime | Implemented with provider limits | Watch provider registry, Settings selector, and library/detail "Find on" links |

### Current Non-Goals

These are not implemented and should not be implied by the UI or
documentation:

- Streaming or hosting anime episodes.
- Editing MyAnimeList user lists.
- A native iOS or Android binary.
- Social features, public profiles, or comments.
- Server-side aggregation of arbitrary anime news sources.
- Real-time cross-device synchronization.
- Multi-user administration.
- Production monitoring, analytics, or incident alerting.

## Current-State Summary

As of 2026-06-20:

- The project is a React 19 and TypeScript single-page application built with
  Vite.
- React Router provides Home, Discover, News, Library, Settings, and OAuth
  consent routes.
- TanStack React Query manages remote Jikan query state.
- Jikan v4 provides catalog, seasonal, detail, news, and promotional data.
- Jikan list responses are deduplicated by MAL ID before entering feature code.
- Weekly broadcast metadata is normalized and converted to the user's local
  time for the next scheduled airing display.
- Tracking writes synchronously to browser `localStorage`.
- Banime JSON backups and MyAnimeList XML exports are validated and merged by
  anime ID and `updatedAt`; malformed files are rejected.
- MyAnimeList XML imports save a validated base list locally before Jikan
  enrichment starts. Jikan detail lookups then update the same rows with
  posters and current catalog fields when the title is returned.
- Existing data under the former `kitsu-log:library:v1` key is migrated to
  `banime:library:v1` when read.
- Supabase support is optional and activated only when environment variables
  are present.
- Supabase Auth uses email/password sessions stored by the Supabase browser
  client.
- Supabase Postgres stores one JSON tracker aggregate plus indexed query
  columns per user and anime.
- Row-level security restricts authenticated users to their own rows.
- A separate Streamable HTTP MCP server exposes modular Jikan search, detail,
  news, library, mutation, and recommendation tools.
- Public MCP tools do not require an account. Library tools validate a
  Supabase OAuth access token and execute through the caller's RLS session.
- The PWA hosts `/oauth/consent`, where the signed-in user can approve or deny
  ChatGPT's Supabase OAuth request.
- The Supabase package is dynamically imported so local-only users do not load
  it in the initial JavaScript bundle.
- The application is configured as an auto-updating PWA using
  `vite-plugin-pwa`.
- App code update checks run at startup and every 60 minutes while open.
- Active seasonal and airing queries refresh every 15 minutes, and News
  headlines and trailers refresh every two hours.
- Fresh Jikan responses are cached in memory and browser storage until each
  endpoint's expiry. Slow-changing Top 100 data uses persistent
  `localStorage`; most other API responses use `sessionStorage`.
- Most Popular combines four rate-limited Jikan pages into a deduplicated list
  of up to 100 titles and refreshes every 6 hours.
- Theme preference is stored locally and applied before React mounts.
- The visual system uses flat surfaces, one blue product accent, one system
  font stack, and no gradients, glass effects, fake profile controls, or
  decorative floating elements.
- Discover filters results by media type, genre, minimum score, and sort order.
- Library search covers titles, studios, genres, and notes, with status, type,
  genre, score, and sort controls.
- Library cards and anime details can open the selected title in the current
  external watch-search provider. Banime does not host or embed episode
  streams.
- Vercel and Netlify SPA route rewrites are included.
- MCP traffic is protected by host/origin checks, body/header/concurrency
  limits, per-IP and per-token quotas, a separate tool quota, and a shared
  60-per-minute Jikan budget.
- Rate limits use bounded in-memory counters for one process and optional
  Upstash Redis counters across multiple replicas.
- MyAnimeList XML imports, JSON imports, local storage, upstream URLs, OAuth
  inputs, and MCP schemas are bounded and validated before use.
- The PWA deployment configuration includes CSP, HSTS, frame, MIME, referrer,
  and permissions headers.
- The MCP production image is multi-stage, runs as a non-root user, and
  installs only runtime dependencies.
- The current automated suite contains 37 tests across 16 files.
- Production build, ESLint, tests, local route checks, PWA manifest checks, and
  live Jikan endpoint checks passed.
- A real Supabase project was not configured during development, so
  authentication and database synchronization are not end-to-end verified.
- Automated visual browser testing was blocked by a recurring Windows sandbox
  `spawn setup refresh` failure.
- The Git working tree currently contains uncommitted application changes.
- No production deployment or formal release has been recorded.

## Technology Stack

### Runtime Dependencies

| Package | Current version | Responsibility |
| --- | --- | --- |
| React | `19.2.7` | Component rendering and state |
| React DOM | `19.2.7` | Browser renderer |
| React Router DOM | `7.17.0` | SPA routing |
| TanStack React Query | `5.101.0` | Remote data fetching, stale state, cancellation, and cache coordination |
| Supabase JS | `2.107.0` | Optional browser authentication and Postgres access |
| Model Context Protocol SDK | `1.29.0` | Streamable HTTP MCP server and protocol types |
| Zod | `4.4.3` | MCP tool input validation |
| dotenv | `17.4.2` | MCP server environment loading |
| Upstash Rate Limit | `2.0.8` | Optional distributed request, tool, and Jikan quotas |
| Upstash Redis | `1.38.0` | HTTP-based shared rate-limit storage |
| Lucide React | `1.17.0` | Interface icons |

### Development Dependencies

| Package | Current version | Responsibility |
| --- | --- | --- |
| Vite | `8.0.16` | Development server and production build |
| TypeScript | `6.0.3` | Static type checking |
| Vitest | `4.1.8` | Unit tests |
| ESLint | `10.4.1` | Static analysis |
| TypeScript ESLint | `8.60.1` | TypeScript lint rules |
| Vite PWA | `1.3.0` | Manifest and generated service worker |
| React plugin for Vite | `6.0.2` | React transform and refresh |
| tsx | `4.22.4` | TypeScript execution for the MCP service |
| Node types | `25.9.2` | Node HTTP and process type declarations |
| esbuild | `0.28.0` | Bundles the production MCP server artifact |

Dependency versions are recorded in `package-lock.json`. Update this section
when dependencies change materially.

## Architecture Overview

Banime uses a layered frontend architecture. Dependencies should point inward
toward domain contracts and outward through service adapters.

```text
Browser / Installed PWA
        |
        v
App bootstrap and routing
  src/main.tsx
  src/App.tsx
        |
        v
Feature pages and shared components
  src/features/*
  src/components/*
        |
        v
Application hooks and context providers
  src/hooks/*
  src/context/*
        |
        +----------------------------+
        |                            |
        v                            v
Domain models and pure logic     Service adapters
  src/domain/*                    src/services/*
                                      |
                         +------------+-------------+
                         |                          |
                         v                          v
                    Jikan API             localStorage / Supabase
```

The ChatGPT integration is a separate deployable process:

```text
ChatGPT
   |
   | MCP Streamable HTTP + OAuth bearer token
   v
mcp/server.ts -> mcp/tools.ts
   |                 |
   |                 +--> Jikan services (public read tools)
   |
   +--> Supabase token validation
           |
           +--> tracked_anime through the caller's RLS session

Supabase OAuth authorization
   |
   +--> Banime PWA /oauth/consent
```

### Architectural Boundaries

#### `src/domain`

Owns framework-independent types and pure business logic.

- `domain/anime/types.ts`
  - Normalized `Anime` and `AnimePage` contracts.
- `domain/news/types.ts`
  - Normalized article, promotion, and feed contracts.
- `domain/tracker/types.ts`
  - Tracking statuses, labels, item model, and statistics contract.
- `domain/tracker/stats.ts`
  - Pure aggregation of totals, progress, completion, and mean user score.
- `domain/tracker/merge.ts`
  - Pure local/cloud conflict resolution by latest `updatedAt`.
- `domain/watch/providers.ts`
  - Authorized external watch-provider registry.
  - Search URL construction for selected anime titles.

Domain code should not import React, browser storage, Supabase, or Jikan DTOs.

#### `src/services/jikan`

Owns the external Jikan boundary.

- `client.ts`
  - API base URL.
  - Request serialization.
  - Minimum 350 ms interval between request starts.
  - In-memory and session response caches with endpoint-specific expiry.
  - HTTP error normalization.
- `dto.ts` and `newsDto.ts`
  - External response shapes.
- `mapper.ts`
  - Converts nullable Jikan anime data into the internal `Anime` model.
- `animeService.ts`
  - Seasonal, paginated top, search, and detail operations.
- `newsService.ts`
  - Maps per-title news and popular promo responses.

Feature and domain code should not depend directly on Jikan response shapes.

#### `src/services/storage`

Owns local browser persistence.

- Reads and writes the complete tracker array in `localStorage`.
- Current key: `banime:library:v1`.
- Legacy key: `kitsu-log:library:v1`.
- Migration is copy-on-read and does not delete the legacy key.
- Creates new tracker records with timestamps and initial progress.

#### `src/services/supabase`

Owns optional cloud persistence.

- `client.ts`
  - Detects configuration through Vite environment variables.
  - Dynamically imports `@supabase/supabase-js`.
  - Persists and refreshes browser sessions.
- `trackerCloudRepository.ts`
  - Reads a user's rows ordered by latest update.
  - Upserts one or many tracker items and their normalized query columns.
  - Deletes one tracker item.

Supabase-specific objects should not leak into domain models. The authenticated
`User` type is currently exposed only through the auth context.

#### `src/context`

Owns application-wide state coordination.

- `CloudAuthProvider`
  - Initializes the optional Supabase session.
  - Subscribes to auth-state changes.
  - Provides sign-in, sign-up, and sign-out actions.
- `TrackerProvider`
  - Loads local tracking state.
  - Applies add, update, and remove operations.
  - Writes local changes immediately.
  - Queues cloud writes when authenticated.
  - Merges local and cloud records on authenticated startup.
  - Exposes sync state and tracker statistics.
- `AnimePanelProvider`
  - Owns the currently selected anime detail panel.
- `WatchProvider`
  - Stores the selected external watch-search provider per browser.
  - Exposes provider metadata and title-specific external search URLs.

Context object declarations and provider components are separated to preserve
React Fast Refresh boundaries.

#### `src/hooks`

Provides typed feature-facing APIs:

- Jikan query hooks.
- News query hook.
- Tracker context hook.
- Cloud authentication hook.
- Anime detail panel hook.
- Watch-provider hook.
- Debounced-value utility.
- PWA installation prompt handling.

#### `src/features`

Feature-owned pages and components:

| Feature | Responsibility |
| --- | --- |
| `dashboard` | Summary statistics, continue watching, current season |
| `discover` | Search and top anime feeds |
| `news` | Featured news, article grid, popular promos |
| `library` | Filtering, status editing, progress, scores, deletion, watch-search links |
| `anime` | Detail side panel, tracker controls, watch-search link |
| `settings` | PWA installation, cloud auth, sync status, watch provider, MAL XML import, JSON import/export |
| `oauth` | Supabase OAuth consent and ChatGPT connection approval |

#### `src/components`

Shared presentation components:

- Application shell.
- Responsive navigation.
- Brand.
- Anime card.
- Section heading.
- Loading and error states.

#### `src/styles.css`

Contains the complete visual system and responsive behavior. This is currently
a single global stylesheet rather than CSS modules or a token package.

#### `mcp`

Owns the ChatGPT/MCP boundary and is independently deployable from the PWA.

- `config.ts`
  - Loads server-only configuration from `.env.mcp.local`, `.env.local`, or
    process environment variables.
  - Validates HTTPS/local URLs, origins, hosts, limits, timeouts, proxy mode,
    and optional distributed-store configuration.
- `auth.ts`
  - Extracts bearer tokens, verifies Supabase JWT claims, checks issuer and an
    optional resource audience, and creates an RLS-bound Supabase client.
- `libraryRepository.ts`
  - Performs indexed library reads and user-scoped add, update, and removal.
- `recommendations.ts`
  - Pure ranking based on library genres, studios, status, and user scores.
- `tools.ts`
  - Registers eight tools with strict bounded Zod schemas, security metadata,
    sanitized output, generic errors, and accurate annotations.
- `rateLimiter.ts`
  - Provides bounded process-local counters or Upstash sliding windows for
    request, tool, and global Jikan budgets.
- `server.ts`
  - Hosts stateless Streamable HTTP at `/mcp`, applies host/origin validation,
    quotas, concurrency, body/header limits, security headers, health output,
    and OAuth protected-resource metadata.
- `index.ts`
  - Starts and stops the Node HTTP process.

The MCP service imports domain contracts and Jikan service functions but does
not import React, browser state, or local storage.

## Application Bootstrap and Provider Order

`src/main.tsx`:

1. Registers the generated service worker immediately.
2. Mounts React in `StrictMode`.
3. Loads the global stylesheet.

`src/App.tsx` wraps the router in this order:

```text
QueryClientProvider
  CloudAuthProvider
    TrackerProvider
      AnimePanelProvider
        RouterProvider
```

This order is intentional:

- Tracker state depends on the authenticated cloud user.
- Feature pages depend on tracker and panel state.
- Jikan queries depend on React Query.

## Routes

| Path | Component | Purpose |
| --- | --- | --- |
| `/` | `DashboardPage` | Personal summary, queue, current season |
| `/discover` | `DiscoverPage` | Search, filter, and sort catalog feeds |
| `/news` | `NewsPage` | Current-title news and popular promotions |
| `/library` | `LibraryPage` | Search, filter, sort, and manage saved records |
| `/settings` | `SettingsPage` | Install, sync, account, and export |
| `/oauth/consent` | `OAuthConsentPage` | Sign in and approve or deny an external OAuth client |

There is currently no explicit 404 route or route-level error boundary.

## Data Models

### Anime

The normalized `Anime` model stores:

- MyAnimeList/Jikan identifier.
- Default and optional English titles.
- Poster URLs.
- Synopsis.
- Community score, rank, and popularity.
- Episode count.
- Airing status and media type.
- Rating and duration.
- Year and season.
- Genre and studio names.
- Trailer URL.
- MyAnimeList URL.

The model intentionally removes Jikan-specific nested response structures.

### Tracked Anime

```text
TrackedAnime
  anime: complete normalized Anime snapshot
  status: watching | completed | on_hold | dropped | plan_to_watch
  progress: non-negative episode count
  userScore: optional numeric score
  notes: string
  addedAt: ISO timestamp
  updatedAt: ISO timestamp
```

Important behavior:

- Progress is clamped to zero or greater.
- If the anime has a known episode count, progress is clamped to that count.
- Updating any tracked field replaces `updatedAt` with the current timestamp.
- The `notes` field exists in the model but no editing UI is currently
  implemented.
- The full anime snapshot is duplicated into each tracker record. This makes
  local rendering independent from Jikan availability but can become stale.

### News

News articles contain:

- Article and related anime IDs.
- Anime title and fallback anime image.
- Article title, URL, date, author, image, excerpt, and comment count.

Promos contain:

- Related anime ID, title, URL, and image.
- Promotion title.
- Optional direct video URL and required embed URL.

## Jikan Integration

Base URL:

```text
https://api.jikan.moe/v4
```

### Endpoints

| Use | Endpoint pattern | Local cache |
| --- | --- | --- |
| Current season | `/seasons/now?limit=18&sfw=true` | 15 minutes |
| Airing/upcoming top anime | `/top/anime?filter={filter}&limit=18&page=1&sfw=true` | 15 minutes |
| Most popular | Four `/top/anime?filter=bypopularity&limit=25&page={1-4}&sfw=true` requests | 6 hours in persistent browser storage |
| Search | `/anime?q={query}&limit=20&sfw=true&order_by=popularity&sort=asc` | 10 minutes |
| Details | `/anime/{id}/full` | 30 minutes |
| Anime news | `/anime/{id}/news` | 2 hours |
| Popular promos | `/watch/promos/popular?limit=8` | 2 hours |

### Request Control

The client enforces a minimum 350 ms delay between request starts. Requests are
placed on a shared promise queue. This is intended to remain under Jikan's
request-rate constraints.

There are three cache layers:

1. The Jikan client stores successful responses in an in-memory `Map`.
2. The client stores the same expiring responses in browser storage:
   `sessionStorage` by default and `localStorage` for slow-changing Top 100
   popular data.
3. React Query stores normalized query state and applies matching stale times.

The browser cache survives route changes and page reloads until the
endpoint-specific expiry. Top 100 data can also survive a closed browser
session, while faster-changing feeds stay session scoped.

Jikan list responses are deduplicated by `mal_id`. This was added after live
airing and seasonal responses returned Dr. Stone ID `62568` twice in the same
payload.

### Cancellation and Retry

- React Query supplies an `AbortSignal`.
- Services pass the signal to `fetch`.
- React Query retries failed queries once.
- Refetch on window focus is enabled for stale queries.
- Current-season, airing, and upcoming feeds poll every 15 minutes while
  mounted.
- Most Popular polls every 6 hours while mounted.
- News title feeds and promos poll every two hours while mounted.
- HTTP 429 receives a specific user-facing error.
- Other non-success responses receive a generic Jikan error.

### News Aggregation

The News feed currently:

1. Loads the current season.
2. Selects the first four returned titles.
3. Uses one independently cached React Query request for each title.
4. Renders articles progressively as title requests finish.
5. Tolerates individual title-news failures.
6. Deduplicates articles by URL.
7. Sorts articles newest first and returns at most 24.
8. Loads eight popular promotional videos through an independent query.

This is not a comprehensive global anime-news service. It is a current-season
aggregation based on Jikan and MyAnimeList data.

## Tracking and Persistence Flows

### Local-Only Flow

```text
User action
  -> TrackerProvider mutation
  -> update React state
  -> write full library to localStorage
  -> UI updates immediately
```

No account, network connection, or Supabase project is needed.

### MyAnimeList XML Import Flow

```text
User selects MyAnimeList XML file
  -> reject files larger than 5 MB
  -> parse MyAnimeList XML export
  -> validate every tracker and anime field
  -> save the parsed base list locally
  -> queue Supabase sync when authenticated
  -> request Jikan details for each MAL ID at a conservative rate
  -> replace placeholder MAL metadata with Jikan posters and details when found
  -> save enriched rows locally using same-timestamp replacement
  -> queue Supabase sync for enriched rows when authenticated
```

Accepted import formats are MyAnimeList XML exports and Banime JSON backups.
Banime exports its own backups as JSON because Jikan and the app's internal
data contracts are JSON-based. Invalid files do not modify the library.

### Authenticated Startup Flow

```text
Supabase session initializes
  -> TrackerProvider detects user
  -> load all cloud tracker rows
  -> merge local and cloud arrays by anime ID
  -> choose record with greatest updatedAt string
  -> save merged array locally
  -> upsert merged array to cloud
  -> mark sync status as synced
```

ISO timestamps compare correctly as strings when all values use the same UTC
ISO format.

### Authenticated Mutation Flow

```text
User action
  -> save locally immediately
  -> enqueue cloud upsert/delete
  -> operations execute sequentially
  -> expose syncing, synced, or error status
```

Cloud failures do not roll back local changes.

### Current Conflict Policy

- Conflict key: anime ID.
- Winner: record with latest `updatedAt`.
- Clock source: each client device.
- Delete handling: direct cloud row deletion with no tombstone.

This policy is simple but not fully safe for offline multi-device editing. A
device with an incorrect clock can win incorrectly. An offline deletion can be
resurrected later because deletions have no versioned tombstone.

## Supabase Design

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_MCP_URL=https://your-banime-mcp-host.example/mcp
```

The client also accepts `VITE_SUPABASE_ANON_KEY` as a compatibility fallback.

Only browser-safe publishable or anon keys belong in Vite variables. A
service-role or secret key must never be added because all `VITE_` values are
included in client-accessible build output.

### Table

`public.tracked_anime`:

| Column | Type | Purpose |
| --- | --- | --- |
| `user_id` | `uuid` | References `auth.users`; deleted with the user |
| `anime_id` | `integer` | Jikan/MyAnimeList anime ID |
| `item` | `jsonb` | Complete `TrackedAnime` aggregate |
| `tracking_status` | `text` | Validated status used by status queries |
| `anime_title` | `text` | Normalized title used by title search |
| `anime_type` | `text` | Media type used by type filters |
| `user_score` | `numeric(3,1)` | Optional personal score used by score filters |
| `progress` | `integer` | Non-negative episode progress |
| `added_at` | `timestamptz` | Mirrors the item creation time |
| `updated_at` | `timestamptz` | Mirrors item update time |

Primary key:

```text
(user_id, anime_id)
```

Indexes support:

- User-scoped status queries ordered by latest update.
- User-scoped latest-updated and latest-added ordering.
- User-scoped media-type and personal-score filtering.
- Case-insensitive partial title search through `pg_trgm`.

The complete JSON aggregate remains the compatibility and hydration source.
The normalized columns avoid repeatedly extracting common filter fields from
JSON and allow later server-side pagination without replacing the domain
model.

### Schema Migration Behavior

`supabase/schema.sql` is designed to be rerun:

- Missing query columns are added.
- Existing rows are backfilled from `item`.
- Status, progress, and score constraints are added when absent.
- Indexes are created only when absent.
- Existing named RLS policies are dropped and recreated with the same rules.

The migration is additive and does not delete tracker data. Rolling it back
would require dropping the added indexes, constraints, query columns, and
`pg_trgm` extension manually after confirming no other database object uses
them.

### Authorization

Row-level security is enabled. Authenticated users may select, insert, update,
or delete only rows where:

```sql
auth.uid() = user_id
```

The application relies on RLS for authorization. Client filters are not a
security boundary.

### Authentication

Current supported operations:

- Email/password sign-up.
- Email/password sign-in.
- Sign-out.
- Persisted and refreshed sessions.
- Email confirmation redirect to the current origin.
- Supabase OAuth 2.1 consent handling for MCP clients.
- OAuth approval and denial through `/oauth/consent`.

Not implemented:

- Password reset.
- Email change.
- Account deletion.
- Third-party login providers.
- Multi-factor authentication.
- Reauthentication for sensitive actions.

### Cloud Sync Limitations

- No Supabase Realtime subscription.
- No periodic pull while the app remains open.
- No manual "sync now" action.
- No persisted background sync queue.
- No retry backoff after a failed write.
- No tombstones for deletions.
- No server-assigned version counter.
- No generated database TypeScript types.
- No automated Supabase integration test.
- No migration framework beyond the current SQL file.
- Supabase OAuth server settings and token audience hardening still require
  deployment-specific configuration.

## Progressive Web App and Mobile Design

Banime is currently a PWA, not a native application.

### Manifest

- Name and short name: Banime.
- Display: standalone.
- Orientation: portrait-primary.
- Theme and background: `#11101a`.
- Categories: entertainment and lifestyle.
- Start URL and scope: `/`.
- Icon: SVG with `any maskable`.

### Service Worker

- Generated by `vite-plugin-pwa`.
- Registered immediately.
- Uses `registerType: "autoUpdate"`.
- Precaches the built application assets.
- Checks for a newly deployed worker at registration and every 60 minutes while
  the application remains open.
- Applies an available worker update automatically.

There is no service-worker runtime caching strategy for Jikan responses or
remote images. The app shell can remain available offline. Fresh Jikan data
already present in browser storage can still be reused until expiry, but
remote images and uncached or expired catalog/news requests are not guaranteed
offline.

### Installation

- Chromium browsers use the captured `beforeinstallprompt` event.
- Installation success is detected through `appinstalled`.
- Installed display mode is detected with media query support.
- iOS receives manual Safari "Add to Home Screen" instructions.
- Installation requires an HTTPS deployment, except for local development
  browser exceptions.

### Responsive UI

- Desktop uses a fixed left sidebar.
- Mobile uses a fixed five-item bottom navigation.
- Main grids collapse from six/four/three columns to two or one.
- Query controls collapse from four columns to two and then one.
- The anime detail panel becomes a mobile sheet.
- Safe-area inset is used for the mobile navigation bottom padding.
- All surfaces are flat colors with one blue product accent.
- The light canvas is intentionally darker than content cards so white and
  near-white surfaces remain distinguishable.
- Dark mode uses a lighter, less saturated blue and dedicated dark active-chip
  colors instead of using the near-white text token as a background.
- The interface uses the system `Segoe UI` stack with consistent body line
  height and no separate display font.

### Future Native Option

The current domain and service boundaries make a future React Native, Expo, or
Capacitor client possible, but browser-specific modules must be replaced:

- `localStorage`.
- DOM download APIs.
- PWA install events.
- Browser routing.
- CSS-based presentation.

The domain types, Jikan mapping, merge logic, and repository contracts are the
most portable parts.

## User Interface Behavior

### Dashboard

- Displays watching, completed, episodes watched, and mean user score.
- Shows up to three recently updated watching items.
- Allows incrementing or decrementing episode progress.
- Automatically marks a known-length anime completed when progress reaches the
  episode count through the Continue Watching control.
- Shows six current-season anime cards.
- Shows up to four nearest weekly broadcasts converted to the device's local
  timezone.

### Discover

- Search starts only after two characters.
- Input is debounced by 500 ms.
- Browse filters: airing, popularity, and upcoming.
- Most Popular combines four 25-item pages and displays up to 100 unique titles.
- Results can be narrowed by media type, genre, and minimum community score.
- Results can be sorted by score, popularity, title, or year.
- Filter option lists and final results are memoized from the current feed.
- Search results are ordered by popularity ascending as requested from Jikan.
- Current implementation does not expose pagination.

### Anime Detail Panel

- Loads the full Jikan record after opening.
- Falls back to card data while details load.
- Closes through backdrop, close button, or Escape.
- Locks body scrolling while open.
- Displays facts, genres, synopsis, tracking controls, trailer, and MAL link.
- Displays the next scheduled weekly broadcast when Jikan provides complete
  day, time, and timezone data.
- Opens an external provider search for the selected title through the current
  watch provider.

### Library

- Filters by all tracking statuses.
- Searches title, English title, studio, genre, and notes through one
  normalized lowercase search string per record.
- Filters by media type, genre, and minimum personal score.
- Sorts by latest update, date added, title, personal score, or progress.
- Memoizes the search index, available filter values, and final result list.
- Supports status, progress, score, and removal.
- Opens an external provider search for each tracked title.
- Does not currently expose note editing.
- Removal has no confirmation dialog or undo.

### News

- Displays the newest aggregated article as a feature.
- Shows remaining articles in a responsive grid as independent title queries
  complete.
- Opens articles on MyAnimeList in a new tab.
- Loads popular promotional video links independently from article requests.
- Uses lazy image decoding and skips rendering work for offscreen cards where
  the browser supports `content-visibility`.

### Settings

- Shows PWA installation state and instructions.
- Shows local-only or cloud configuration state.
- Supports account creation, sign-in, and sign-out when configured.
- Displays sync status and sync errors.
- Imports validated MyAnimeList XML exports or Banime JSON backups and reports
  added or updated counts.
- Saves MyAnimeList XML imports before Jikan enrichment, then updates posters
  and current details when Jikan lookups finish.
- Exports the library as Banime JSON.
- Selects and persists light or dark mode.
- Selects and persists the external watch-search provider for this browser.
- Explains the app-code and content-data update cadence and shows the most
  recent service-worker check time.

## Development Workflow

### Prerequisites

- Node.js capable of running the dependency versions in `package-lock.json`.
- npm.
- A modern browser.
- Optional Supabase project for cloud development.

The development machine used Node.js `v24.11.0`.

### Install

```powershell
npm.cmd install
```

On the development machine, PowerShell blocked `npm.ps1`, so `npm.cmd` was
used. The local certificate chain also required:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd install
```

Do not disable TLS verification to work around certificate errors.

### Run

```powershell
npm.cmd run dev
```

The development server was run with:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Run the MCP service in a second terminal after creating
`.env.mcp.local`:

```powershell
npm.cmd run mcp:dev
```

### Quality Checks

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run mcp:check
```

`npm run build` checks both browser and MCP TypeScript projects before the
Vite build.

### Optional Cloud Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Add the project URL and publishable key.
5. Add local and deployed origins to the Supabase Auth redirect allow list.
6. Restart Vite after changing environment variables.

### Optional MCP and ChatGPT Setup

1. Copy `.env.mcp.example` to `.env.mcp.local`.
2. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the complete
   `MCP_PUBLIC_URL`.
3. Enable the Supabase OAuth 2.1 server.
4. Set its authorization path to the deployed PWA's `/oauth/consent` route.
5. Enable dynamic client registration or register ChatGPT manually.
6. Deploy the MCP service over public HTTPS.
7. Add that endpoint to ChatGPT developer mode under Apps & Connectors.
8. Connect and approve the request with the intended Banime account.

### Environment and Secret Rules

- `.env.local` is ignored by `*.local`.
- `.env.mcp.local` is ignored by the same rule.
- `.env.example` contains placeholders only.
- `.env.mcp.example` contains MCP server placeholders only.
- Never commit passwords or secret/service-role keys.
- Treat a publishable key as public configuration and rely on RLS.
- Review built assets if adding any new `VITE_` variable.
- `MCP_EXPECTED_AUDIENCE` must match the audience produced by a configured
  Supabase access-token hook; leave it unset until that hook exists.

## Deployment

### Static Hosting

The application builds to `dist/` and can be hosted on static HTTPS services.

Included SPA fallbacks:

- `vercel.json` rewrites all paths to `index.html`.
- `public/_redirects` provides a Netlify fallback.

### MCP Hosting

The MCP server is a separate long-running Node service and must not be
deployed as static files.

- Development entry command: `npm run mcp:start`.
- Production build/start: `npm run mcp:build` then
  `npm run mcp:start:prod`.
- Default port: `8787`, overridden by `PORT`.
- MCP endpoint: `/mcp`.
- Health endpoint: `/health`.
- OAuth metadata:
  `/.well-known/oauth-protected-resource/mcp`.
- Container definition: `Dockerfile.mcp`.
- The final container stage runs as the non-root `node` user and excludes
  development dependencies.
- Example Render infrastructure file: `render.yaml`.

### Required Deployment Configuration

- Build command: `npm run build`.
- Output directory: `dist`.
- Add Supabase public environment variables if cloud sync is required.
- Set `VITE_MCP_URL` on the PWA deployment after the MCP URL is known.
- Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `MCP_PUBLIC_URL` on the
  MCP service.
- Set exact `MCP_ALLOWED_ORIGINS`; enable `MCP_TRUST_PROXY` only behind a
  trusted proxy that overwrites forwarded headers.
- Configure both Upstash values before running multiple replicas.
- Add the deployed origin to Supabase Auth redirect URLs.
- Use HTTPS for PWA installation and service workers.

### Deployment Verification Checklist

1. Open all six routes directly, not only through client navigation.
2. Confirm the service worker and manifest load without errors.
3. Confirm install UI on Android and manual instructions on iOS.
4. Create a test user.
5. Add and update a library item on desktop.
6. Sign into the same account on a phone.
7. Verify merge and cloud writes.
8. Test sign-out and local-only behavior.
9. Test Jikan failure and rate-limit states.
10. Confirm RLS blocks access to another user's rows.
11. Confirm the MCP protected-resource metadata is public and correct.
12. Add the MCP URL to ChatGPT and complete OAuth consent.
13. Verify search, library read, add, update, remove, news, and recommendation
    tool calls against a non-production test account.

No production deployment has completed this checklist yet.

## Quality and Testing

### Current Automated Tests

| File | Coverage |
| --- | --- |
| `domain/tracker/stats.test.ts` | Tracker totals, progress sum, and average score |
| `domain/tracker/merge.test.ts` | Newest record wins during local/cloud merge |
| `services/jikan/mapper.test.ts` | Nullable Jikan fields normalize correctly |
| `domain/anime/dedupe.test.ts` | Duplicate MAL IDs are removed |
| `domain/anime/airing.test.ts` | Weekly Jikan broadcast time converts to UTC |
| `domain/tracker/import.test.ts` | Banime exports import and malformed status is rejected |
| `mcp/recommendations.test.ts` | Preference ranking, tracked-title exclusion, and explicit filters |
| `mcp/libraryRepository.test.ts` | Partial updates, score clearing, and progress clamping |
| `mcp/tools.test.ts` | MCP tool discovery and OAuth challenge metadata through an in-memory client |
| `mcp/server.test.ts` | Security headers, origin rejection, body caps, and rotating-token rate-limit resistance |
| `mcp/rateLimiter.test.ts` | Independent request, tool, and shared Jikan budgets |
| `domain/security/validation.test.ts` | HTTPS URL, control-character, truncation, and wildcard escaping rules |

Current result:

```text
Test files: 13 passed
Tests: 26 passed
```

### Static Checks

- TypeScript strict mode.
- Unused local and parameter checks.
- ESLint recommended JavaScript and TypeScript rules.
- React Hooks rules.
- React Fast Refresh boundary warning.

### Missing Test Coverage

Priority test gaps:

1. Tracker provider local mutation behavior.
2. Cloud write queue ordering and failure state.
3. Auth initialization and sign-in/sign-out behavior.
4. Supabase repository integration against a test project.
5. Deletion conflict and merge semantics.
6. Jikan throttling and cache expiration.
7. Search debounce and disabled-query behavior.
8. News partial-failure behavior.
9. PWA install event handling.
10. Route and UI integration tests.
11. Keyboard and accessibility tests.
12. Mobile and desktop visual regression tests.
13. Real Supabase OAuth authorization and token exchange.
14. Authenticated MCP mutation tests against a disposable Supabase project.

## Security and Privacy

### Data Collected

Local tracking data may contain:

- Selected anime metadata.
- Tracking status.
- Episode progress.
- User score.
- Notes field, when a UI is added.
- Timestamps.

Cloud mode additionally sends:

- Email and authentication data to Supabase Auth.
- Tracking records to the configured Supabase project.

Banime does not send personal tracking data to Jikan or MyAnimeList.

### Security Controls

- Supabase RLS policies scope rows to `auth.uid()`.
- No service-role key is used in the browser.
- Password handling is delegated to Supabase Auth.
- External links use `target="_blank"` with `rel="noreferrer"`.
- Search parameters are encoded with `URLSearchParams`.
- React escapes rendered text by default.
- The application does not render raw article HTML.
- MCP library tools validate signed Supabase JWT claims before repository
  access.
- MCP database operations use the caller's access token, so existing RLS
  policies remain the authorization boundary.
- No service-role key is used by the MCP server.
- Protected tools advertise OAuth security metadata and return an OAuth
  challenge when no valid token is present.
- Mutation tools are marked destructive where they overwrite or remove data.
- Host validation rejects unexpected forwarded or direct host names.
- Browser CORS uses exact configured origins and rejects wildcard setup.
- Every MCP request is charged to an IP quota; bearer-shaped requests also
  receive a token-hash quota so rotating fake tokens cannot bypass IP limits.
- Tool calls and outbound Jikan requests have independent budgets.
- Upstash can share all limits across stateless replicas.
- Request bodies, headers, concurrent work, request reading, and upstream
  calls are bounded.
- MCP Zod objects are strict and reject unknown keys, unsafe controls,
  excessive lengths, and invalid numeric ranges.
- Supabase and internal errors are logged without request data and returned as
  generic client messages.
- Imported and upstream URLs must be credential-free HTTPS URLs.
- Local storage is validated on every read instead of trusted as typed JSON.
- Vercel and Netlify configurations provide CSP and other security headers.
- Postgres checks cap JSON row size and normalized title/type lengths.
- The production MCP container runs as non-root with development dependencies
  removed.
- Current-tree and three-commit credential-pattern scans found no secret-like
  values outside documentation text.
- `npm audit` reported zero known vulnerable dependencies on 2026-06-10.

### Security Work Still Needed

- Verify RLS policies with two distinct test users.
- Automate dependency and secret scanning in CI instead of relying on manual
  checks.
- Define account deletion and data-retention behavior.
- Decide whether notes can contain sensitive personal information.
- Add explicit confirmation for destructive library removal if desired.
- Configure a resource-specific OAuth token audience and enforce it with
  `MCP_EXPECTED_AUDIENCE`.
- Add structured audit logs, provider WAF rules, central metrics, and abuse
  monitoring for the public MCP endpoint.
- Complete load tests and tune quotas against measured traffic.
- Verify deployed Supabase Auth settings, production CORS settings, source-map
  exposure, and provider-side login/signup rate limits.
- Add a real backup and restore plan beyond manual JSON export/import.

### Security Risk Checklist Review

Review date: 2026-06-20. This maps the requested risk checklist to the
current Banime implementation. Status meanings:

- Mitigated: implemented in code, schema, or checked-in deployment config.
- Partially mitigated: local controls exist, but production/provider behavior
  still needs proof.
- Open: not implemented yet and should stay on the risk register.
- Not applicable: Banime does not currently include that feature or attack
  surface.

| # | Risk | Status | Banime evidence or next action |
| --- | --- | --- | --- |
| 1 | Exposed database credentials | Mitigated | Checked-in files use placeholders and publishable Supabase variables only; service-role keys must never be committed. |
| 2 | Public `.env` files | Partially mitigated | Only `.env.example` and `.env.mcp.example` are intended for source control; verify real deployment secrets stay in provider secret stores. |
| 3 | Hardcoded API keys | Mitigated | Jikan does not require a key; source scans found no hardcoded secret-like values outside documentation examples. |
| 4 | Weak or missing authentication | Partially mitigated | Local mode is intentionally accountless; private cloud/MCP data uses Supabase Auth and bearer-token verification, but real production OAuth still needs end-to-end verification. |
| 5 | Missing authorization checks | Partially mitigated | MCP derives the user from the verified token and Supabase policies scope library rows; verify with two separate real users. |
| 6 | Users able to access other users' data | Partially mitigated | Schema uses `auth.uid() = user_id` RLS policies; two-user cloud testing remains required. |
| 7 | Open database read/write permissions | Partially mitigated | `supabase/schema.sql` enables RLS and authenticated owner policies; confirm those policies are applied in the live project. |
| 8 | Misconfigured Firebase, Supabase, or S3 buckets | Partially mitigated | No Firebase or S3 is used; Supabase table policy must be verified in the provider dashboard after migration. |
| 9 | Admin routes left unprotected | Not applicable | Banime has no admin routes or multi-user administration UI. |
| 10 | Debug pages exposed in production | Mitigated | No debug route is tracked in the app; production deployment should still be scanned before release. |
| 11 | Build logs leaking secrets | Open | This is operational; CI/host logs must be reviewed once a deployment pipeline exists. |
| 12 | Verbose error messages leaking stack traces | Mitigated | MCP returns generic client errors and logs backend errors without request bodies or credentials. |
| 13 | Leaked GitHub repositories or commit history | Partially mitigated | Local current-tree and three-commit secret scans passed; remote repository visibility and branch history must be reviewed before release. |
| 14 | Secrets included in frontend JavaScript | Mitigated | Frontend uses only Vite `VITE_` public Supabase variables; service-role or MCP secrets are server-side only. |
| 15 | Client-side-only security checks | Mitigated | Persisted cloud data is protected by Supabase RLS and MCP server authorization, not only React UI checks. |
| 16 | Missing input validation | Mitigated | MCP schemas are strict; MyAnimeList XML import, JSON import, local storage, URLs, IDs, ranges, and text lengths are validated. |
| 17 | SQL injection | Mitigated | Supabase client requests are parameterized, and user search text escapes `ILIKE` wildcard characters. |
| 18 | NoSQL injection | Not applicable | Banime does not use a NoSQL database. |
| 19 | Cross-site scripting, or XSS | Mitigated | React escapes rendered text, raw HTML is not used, external URLs are validated, and CSP headers are configured. |
| 20 | Cross-site request forgery, or CSRF | Mostly not applicable | Banime does not expose cookie-authenticated write endpoints; MCP uses bearer tokens and rejects unapproved origins. |
| 21 | Insecure file uploads | Mitigated | There is no server file upload path; local MyAnimeList XML and Banime JSON import is parsed, bounded, and validated before merge. |
| 22 | Path traversal bugs | Not applicable | Users do not control server filesystem paths. |
| 23 | Server-side request forgery, or SSRF | Mitigated | Server calls are limited to configured Supabase Auth/JWKS endpoints and fixed Jikan service calls, not arbitrary user URLs. |
| 24 | Broken password reset flows | Not applicable | Banime does not implement a custom password reset flow; Supabase Auth settings must be reviewed if password login is enabled. |
| 25 | Weak session management | Partially mitigated | Supabase manages browser sessions; production session lifetime and token refresh behavior still need provider review. |
| 26 | JWT secrets that are weak, leaked, or reused | Partially mitigated | Banime does not define its own JWT secret; Supabase signing configuration and OAuth audience enforcement must be verified. |
| 27 | Overly permissive CORS | Mitigated | MCP requires exact allowed origins and host validation; production `MCP_ALLOWED_ORIGINS` must be explicit. |
| 28 | Missing rate limits on login, signup, APIs, and AI endpoints | Partially mitigated | MCP and outbound Jikan calls are rate-limited; Supabase Auth login/signup limits and provider WAF settings remain operational tasks. |
| 29 | Public test or staging environments | Open | No staging environment is documented yet; any future staging URL needs the same auth and headers as production. |
| 30 | Default credentials left unchanged | Mitigated | No default accounts or credentials are defined in the repo. |
| 31 | Webhook endpoints without signature verification | Not applicable | Banime does not expose webhooks. |
| 32 | Payment or subscription checks only done on the frontend | Not applicable | Banime has no payments or subscriptions. |
| 33 | Insecure direct object references, or IDOR | Partially mitigated | Library rows are user-scoped by RLS and MCP user context; verify live with two users. |
| 34 | API endpoints that trust user-controlled IDs or roles | Mitigated | MCP trusts user identity from verified token claims, not request-supplied user IDs or roles. |
| 35 | Logs containing tokens, emails, passwords, or private user data | Partially mitigated | MCP avoids logging request bodies and tokens; central log retention and redaction must be configured at deployment. |
| 36 | Source maps exposed in production | Partially mitigated | Vite source maps are not enabled in config; verify deployed artifacts do not expose `.map` files. |
| 37 | Dependency vulnerabilities | Mitigated at last check | `npm audit` reported zero known vulnerabilities on 2026-06-10; automate this in CI. |
| 38 | Outdated packages | Open | Package freshness needs scheduled review or Dependabot/Renovate. |
| 39 | Prompt injection in AI features | Partially mitigated | MCP tools use strict schemas, bounded outputs, and do not execute returned text; model behavior still needs prompt and tool review when deployed. |
| 40 | AI tools or actions allowed to access data without permission checks | Mitigated | Public search tools expose Jikan data only; private library tools require verified Supabase OAuth identity. |
| 41 | Excessive database permissions for the app user | Partially mitigated | Frontend uses publishable Supabase access plus RLS; confirm no service-role key is present in deployed frontend or MCP environment. |
| 42 | Missing audit logs | Open | No structured production audit log exists for library mutations or MCP actions. |
| 43 | Missing monitoring or alerting | Open | No production metrics, alerting, uptime checks, or abuse dashboards are configured. |
| 44 | Missing backup or restore plan | Partially mitigated | JSON export/import helps personal recovery, but Supabase backup and restore procedures are not documented. |
| 45 | Publicly exposed internal dashboards | Not applicable in repo | Banime has no internal dashboard; provider dashboards must stay private. |
| 46 | Missing security headers | Mitigated | `vercel.json`, `public/_headers`, and MCP responses set CSP, HSTS, frame denial, MIME, referrer, and permissions headers. |
| 47 | Cookies missing HttpOnly, Secure, or SameSite settings | Mostly not applicable | The app does not set its own cookies; review Supabase/Auth hosting settings if cookie-based auth is introduced. |
| 48 | Unencrypted sensitive data | Partially mitigated | HTTPS is expected in production and Supabase handles managed storage; local device storage and personal notes are not client-side encrypted. |
| 49 | Poor tenant isolation in multi-user applications | Partially mitigated | Tenant isolation is based on per-user RLS policies; real multi-user verification remains required. |
| 50 | Over-trusting generated code without review | Mitigated operationally | Changes are documented, tested, and reviewed against this history file; this remains an ongoing discipline. |
| 51 | Missing idempotency keys for payments or critical write operations | Not applicable currently | No payments exist; future critical non-idempotent writes should add explicit idempotency keys. |

## Reliability and Performance

### Implemented

- Local-first writes keep tracking responsive during network failures.
- Cloud writes are serialized to preserve mutation order within one tab.
- Jikan requests are serialized and cached.
- Jikan responses are reused from browser storage after page reloads until
  their endpoint-specific expiry.
- Query cancellation prevents unnecessary stale requests.
- Individual title-news failures do not discard all other title articles.
- News articles and trailers render independently instead of waiting for one
  combined response.
- Large popular, article, and trailer grids use offscreen rendering
  containment.
- Supabase is code-split into an on-demand chunk.
- The PWA precaches static application assets.
- Library search builds one normalized search value per item and memoizes
  filter/sort work.
- Postgres query columns and indexes support user, status, date, type, score,
  and partial-title retrieval.
- MCP calls are stateless at the HTTP transport layer.
- Jikan data requested by MCP reuses the same in-process throttling and cache
  implementation as the PWA services.
- Recommendation ranking is pure and deterministic for the same library and
  candidate set.
- MCP library reads support bounded offset pagination.
- The Supabase JWT verifier client is reused within each MCP process.
- The shared Jikan budget preserves the official 60-per-minute ceiling across
  replicas when Upstash is configured.
- The direct `ILIKE` title query has a matching trigram index.
- Rate-limit memory is capped to prevent unbounded identity-map growth.

### Last Recorded Production Build

```text
Main CSS: 30.11 kB, 6.43 kB gzip
Main JS: 398.22 kB, 123.20 kB gzip
Supabase lazy chunk: 199.77 kB, 51.03 kB gzip
MCP production bundle: 51.2 kB
PWA precache: 8 entries, 619.91 KiB
```

These values are development evidence, not a permanent performance budget.

### Reliability Gaps

- Cloud queue exists only in memory.
- Closing the tab during a pending write can lose that cloud write, though the
  local copy remains.
- No retry backoff or manual retry exists.
- No offline mutation tombstones exist.
- A health endpoint and container health check exist, but no external alerting
  or uptime monitor is configured.
- No Jikan fallback data source exists.
- Invalid local storage is rejected and currently falls back to an empty
  library without a user-facing recovery prompt.
- There is no corruption recovery or import restore.

## Accessibility and UX

### Existing Measures

- Main and mobile navigation use semantic links.
- Icon-only controls generally have accessible labels.
- Anime details use dialog semantics and Escape handling.
- Loading and error states are explicit.
- Reduced-motion preferences disable significant animation.
- Responsive layouts support small screens.
- Form inputs use labels and autocomplete attributes.
- Color is usually supplemented by text or icons for status.
- Placeholder notification, profile, decorative orb, and promotional card
  elements have been removed.
- Dashboard cards display actual tracker statistics and application content.

### Accessibility Gaps

- The detail dialog does not trap focus or restore focus to its opener.
- No automated accessibility audit has run.
- No screen-reader verification has run.
- Some small text sizes may need mobile readability review.
- Color contrast has not been formally measured.
- Removal actions have no confirmation or undo.
- Browser visual verification was blocked, so responsive layout claims are
  based on CSS inspection and compilation rather than automated screenshots.

## Architecture Decision Log

| ID | Date | Decision | Status | Rationale |
| --- | --- | --- | --- | --- |
| ADR-0001 | 2026-06-06 | Use `history.md` as the central engineering record | Accepted | Keeps product, architecture, evidence, and risks discoverable |
| ADR-0002 | 2026-06-06 | Build the initial client with React, TypeScript, and Vite | Accepted, supersedes the initial defer-stack decision | Supports a responsive SPA, strong typing, and fast PWA development |
| ADR-0003 | 2026-06-06 | Separate domain, external services, application state, hooks, features, and shared UI | Accepted | Keeps Jikan, persistence, and presentation replaceable |
| ADR-0004 | 2026-06-06 | Use Jikan v4 as the read-only anime data source | Accepted | No API key is required and it exposes MAL catalog/news/promos |
| ADR-0005 | 2026-06-06 | Normalize Jikan DTOs at the service boundary | Accepted | Prevents nullable external structures from spreading through UI code |
| ADR-0006 | 2026-06-06 | Use TanStack React Query for remote server state | Accepted | Provides cancellation, retries, stale times, and query-key caching |
| ADR-0007 | 2026-06-06 | Make tracking local-first | Accepted | The personal app works without an account or network connection |
| ADR-0008 | 2026-06-06 | Add Supabase as an optional cloud adapter | Accepted | Provides Auth, Postgres, and RLS without making local use dependent on a backend |
| ADR-0009 | 2026-06-06 | Resolve record conflicts with latest `updatedAt` | Accepted with known limitations | Simple deterministic merge for the first sync implementation |
| ADR-0010 | 2026-06-06 | Store one complete tracker aggregate as JSON per user/anime | Accepted for v0.1 | Simplifies schema evolution and preserves Jikan snapshot data |
| ADR-0011 | 2026-06-06 | Dynamically import Supabase | Accepted | Keeps optional cloud code out of the initial local-only bundle |
| ADR-0012 | 2026-06-06 | Deliver phone support as a PWA before a native app | Accepted | Reuses the web codebase and enables installation with minimal platform work |
| ADR-0013 | 2026-06-06 | Generate and auto-update the service worker | Accepted | Keeps static app assets current without a manual update flow |
| ADR-0014 | 2026-06-06 | Aggregate news from current-season Jikan title feeds | Accepted as an initial scope | Uses the existing trusted data boundary without another news provider |
| ADR-0015 | 2026-06-06 | Deduplicate all Jikan anime pages by MAL ID | Accepted | Live Jikan feeds can contain exact duplicate records |
| ADR-0016 | 2026-06-06 | Treat Jikan broadcast metadata as an estimated weekly schedule | Accepted | Jikan does not guarantee streaming-platform episode availability |
| ADR-0017 | 2026-06-06 | Validate and merge JSON imports instead of replacing storage directly | Superseded by `ADR-0031` | Prevented malformed files and avoided discarding newer local records |
| ADR-0018 | 2026-06-06 | Check deployed app code hourly and poll active content by freshness class | Accepted | Gives users an explicit update guarantee without excessive API traffic |
| ADR-0019 | 2026-06-06 | Persist theme per device and apply it before React mounts | Accepted | Prevents theme flash and keeps personal display preference local |
| ADR-0020 | 2026-06-06 | Use flat surfaces, one product accent, and one system font stack | Accepted | Keeps hierarchy readable without gradients, glass effects, or decorative template elements |
| ADR-0021 | 2026-06-06 | Keep the JSON aggregate and add indexed query columns | Accepted | Preserves simple hydration while enabling efficient Postgres retrieval and future server-side pagination |
| ADR-0022 | 2026-06-06 | Cache Jikan responses per tab and split News into progressive queries | Extended by `ADR-0032` | Reduces repeated API work and allows useful content to render before every rate-limited request finishes |
| ADR-0023 | 2026-06-10 | Expose ChatGPT capabilities through a separate Streamable HTTP MCP service | Accepted | Keeps the PWA static while providing a standard, independently deployable tool interface |
| ADR-0024 | 2026-06-10 | Reuse Supabase OAuth and RLS for MCP identity and authorization | Accepted | Avoids a second account system and keeps user row policies authoritative |
| ADR-0025 | 2026-06-10 | Keep Jikan tools public and require OAuth only for personal library tools | Accepted | Catalog information is public while tracking data and mutations are private |
| ADR-0026 | 2026-06-10 | Generate recommendation candidates with deterministic local ranking | Accepted for the first MCP version | Uses existing library signals without sending private history to another recommendation service |
| ADR-0027 | 2026-06-10 | Apply layered limits at the MCP HTTP edge | Accepted | IP/token/tool quotas, payload caps, concurrency, timeouts, and allow lists reduce abuse and resource exhaustion |
| ADR-0028 | 2026-06-10 | Use optional Upstash Redis for distributed quotas | Accepted | Stateless replicas require shared counters to prevent per-instance bypass |
| ADR-0029 | 2026-06-10 | Treat imported, stored, OAuth, and Jikan content as untrusted input | Accepted | Validation must cover persisted links and external data, not only SQL arguments |
| ADR-0030 | 2026-06-10 | Bundle the MCP server into a minimal non-root production image | Accepted | Removes development tooling from runtime and supports repeatable replica startup |
| ADR-0031 | 2026-06-20 | Use XML for user-facing library import/export and support MyAnimeList XML imports | Superseded by `ADR-0033` | Matched the initial interpretation of the requested backup format before the user clarified XML is only for MAL imports |
| ADR-0032 | 2026-06-20 | Persist slow-changing Top 100 Jikan responses in browser `localStorage` for 6 hours | Accepted | Popularity rankings change slowly enough to reduce repeat requests beyond one tab session without stale airing data |
| ADR-0033 | 2026-06-20 | Keep Banime backups as JSON and use XML only for MyAnimeList import | Accepted | Jikan and Banime data contracts are JSON; XML is needed only to consume MAL's export format |
| ADR-0034 | 2026-06-20 | Use a provider registry for external watch-search links | Accepted | Keeps watch-link destinations configurable without hardcoding one streaming site into library and detail UI |

### Superseded Decision Note

The original baseline included a decision not to select a stack until product
requirements existed. The user subsequently defined the anime tracker, Jikan,
mobile, modularity, news, and cross-device goals. `ADR-0002` records the
resulting stack selection.

## Known Risks and Technical Debt

| ID | Priority | Area | Description | Recommended action |
| --- | --- | --- | --- | --- |
| RISK-0001 | High | Cloud data | Offline deletions can be resurrected because there are no tombstones | Add versioned tombstones or an operation log |
| RISK-0002 | High | Verification | Supabase auth, RLS, and sync have not been tested against a real project | Create a development project and run two-user integration tests |
| RISK-0003 | High | Deployment | PWA is not yet deployed over HTTPS or installed on a physical phone | Deploy preview and complete device checklist |
| RISK-0004 | High | Sync | Device clocks control conflict resolution | Use server timestamps or monotonic row versions |
| RISK-0005 | Medium | Sync | No realtime pull or refresh while another device edits | Add manual refresh or Supabase Realtime |
| RISK-0006 | Medium | Offline | Service worker does not runtime-cache Jikan or images | Define explicit offline behavior and Workbox strategies |
| RISK-0007 | Medium | News | Feed covers only the first four current-season titles | Add category sources, pagination, or server-side aggregation |
| RISK-0008 | Medium | Quality | Unit tests do not cover providers, live APIs, or end-to-end flows | Add provider, API, integration, and end-to-end tests |
| RISK-0009 | Medium | Accessibility | Dialog focus management and visual audit are incomplete | Add focus trap, focus return, and axe/browser testing |
| RISK-0010 | Medium | Data | Full anime snapshots can become stale | Add catalog refresh or split tracker and catalog data |
| RISK-0011 | Medium | Recovery | Import has no preview/rollback, and MyAnimeList XML imports can be slow or partially enriched when Jikan lookups fail | Add import preview, explicit restore modes, and resumable post-import catalog enrichment |
| RISK-0012 | Medium | UX | Notes field is not editable | Add note editor or remove the unused field |
| RISK-0014 | Low | Routing | No 404 page or route error boundary | Add route-level fallback and error handling |
| RISK-0015 | Low | Mobile | Only SVG app icon is supplied | Add 192 px and 512 px PNG icons and Apple touch icon |
| RISK-0016 | Low | CSS | One large global stylesheet increases collision risk | Introduce feature styles or CSS modules when growth justifies it |
| RISK-0017 | Process | Git | Current changes are uncommitted | Review and create a baseline commit before further large changes |
| RISK-0018 | High | MCP auth | Supabase OAuth and authenticated tool calls are not verified against a real deployed project | Complete OAuth, RLS, and mutation tests with a disposable user |
| RISK-0019 | High | Public service | MCP endpoint has no production rate limiting, audit sink, or abuse monitoring | Add proxy limits, structured logs, alerts, and a documented incident process |
| RISK-0020 | Medium | OAuth tokens | Resource-specific audience enforcement is optional until a Supabase token hook is configured | Add the hook and set `MCP_EXPECTED_AUDIENCE` before production use |
| RISK-0021 | Medium | Recommendations | Candidate pool is limited to current season and top-popularity feeds | Add Jikan recommendation or genre-specific candidate sources if results are too narrow |
| RISK-0022 | High | Operations | Application limits do not replace edge DDoS protection or monitoring | Add provider WAF rules, metrics, logs, alerts, and incident response |
| RISK-0023 | Medium | Scaling | In-memory quotas are per process when Upstash is not configured | Configure Upstash before running more than one replica |
| RISK-0024 | Medium | Recovery | Invalid local data falls back to an empty library without an in-app recovery path | Quarantine corrupt data and offer export/reset recovery |
| RISK-0025 | Medium | Migration | New database size constraints may reject oversized legacy rows | Inspect and repair affected rows before rerunning the schema |
| RISK-0026 | Medium | Verification | Security controls are unit/integration tested locally but not penetration or load tested | Run deployed DAST, two-user RLS tests, and sustained load tests |
| RISK-0027 | Medium | Watch links | External provider search URLs can change or point to availability rather than direct playback | Keep providers isolated in `domain/watch/providers.ts` and verify provider links during release testing |

## Prioritized Roadmap

### Phase 1: Make Current Capabilities Trustworthy

1. Configure a development Supabase project.
2. Verify sign-up, confirmation, sign-in, sign-out, RLS, and two-device sync.
3. Add integration tests for cloud repositories and tracker provider behavior.
4. Deploy an HTTPS preview.
5. Install and test on one Android and one iPhone device.
6. Add PNG PWA icons and Apple touch metadata.
7. Deploy the MCP service and configure the Supabase OAuth server.
8. Verify all eight tools through ChatGPT with a disposable account.

### Phase 2: Fix Synchronization Semantics

1. Replace client-clock conflict resolution with server versions.
2. Add deletion tombstones.
3. Persist failed operations for retry.
4. Add manual sync/refresh and last-successful-sync time.
5. Consider Supabase Realtime after deterministic conflict behavior exists.

### Phase 3: Improve Data and Recovery

1. Add import preview and rollback.
2. Add note editing.
3. Add refresh of stored anime snapshots.
4. Add pagination to search and discovery.
5. Add account deletion and cloud-data deletion.

### Phase 4: Improve News and Discovery

1. Expand beyond four seasonal titles.
2. Add news categories and filters.
3. Define source attribution and freshness rules.
4. Consider a backend aggregator only if Jikan scope becomes insufficient.

### Phase 5: Production Quality

1. Add Playwright end-to-end tests.
2. Add automated accessibility checks.
3. Add dependency and security scanning.
4. Add CSP and hosting security headers.
5. Define release, rollback, monitoring, and backup procedures.
6. Measure Core Web Vitals and set bundle budgets.
7. Add MCP request metrics, rate limits, audit logs, and health monitoring.

## Experiment and Failure Log

| ID | Date | Hypothesis or attempt | Result | Action |
| --- | --- | --- | --- | --- |
| EXP-0001 | 2026-06-06 | Inspect workspace using the standard sandboxed command runtime | Failed with Windows `spawn setup refresh` | Repeated required read-only commands through the approved host path |
| EXP-0002 | 2026-06-06 | Treat the workspace as an existing application | Initial inspection showed an empty application workspace | Scaffolded a new modular application |
| EXP-0003 | 2026-06-06 | Run npm directly through PowerShell | Failed because `npm.ps1` execution was disabled | Used `npm.cmd` |
| EXP-0004 | 2026-06-06 | Install packages using Node's default certificate chain | Failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Retried with `NODE_OPTIONS=--use-system-ca`; install succeeded |
| EXP-0005 | 2026-06-06 | Use in-app browser automation for visual verification | Repeatedly failed because the browser runtime hit Windows `spawn setup refresh` | Used build, HTTP, manifest, and live API checks; retained visual QA as open work |
| EXP-0006 | 2026-06-06 | Bundle Supabase in the main application chunk | Build produced a JavaScript chunk above 500 kB | Converted Supabase initialization to dynamic import; build split the cloud client into a separate chunk |
| EXP-0007 | 2026-06-06 | Use Jikan anime news and popular promo endpoints | Live responses matched implemented DTOs | Added the News feature using those endpoints |
| EXP-0008 | 2026-06-10 | Run npm scripts directly through PowerShell for MCP verification | Failed because `npm.ps1` and `npx.ps1` were blocked by execution policy | Used `npm.cmd` and `npx.cmd`; checks passed |
| EXP-0009 | 2026-06-10 | Verify MCP compatibility without deployed Supabase credentials | In-memory SDK client listed all tools and received the expected OAuth challenge | Kept real OAuth and database mutation verification as deployment work |

## Incident Log

No production incidents have been recorded because Banime has not been
deployed as a production service.

Development environment failures are recorded in the Experiment and Failure
Log rather than treated as application incidents.

## Verification Register

| Date | Scope | Evidence | Result |
| --- | --- | --- | --- |
| 2026-06-06 | Initial application build | `npm.cmd run build` | Passed; TypeScript and Vite production build completed |
| 2026-06-06 | Initial lint | `npm.cmd run lint` | Passed after provider/hook Fast Refresh separation |
| 2026-06-06 | Initial unit tests | `npm.cmd test` | 2 test files and 2 tests passed |
| 2026-06-06 | Local server | HTTP request to `http://127.0.0.1:5173` | Status 200 |
| 2026-06-06 | Jikan catalog | Live `/top/anime` request | Returned current airing anime data |
| 2026-06-06 | Banime build | `npm.cmd run build` | Passed; cloud dependency split into a lazy chunk |
| 2026-06-06 | Banime lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-06 | Banime tests | `npm.cmd test` | 3 test files and 3 tests passed |
| 2026-06-06 | News route | HTTP request to `http://127.0.0.1:5173/news` | Status 200 |
| 2026-06-06 | PWA manifest | Read `dist/manifest.webmanifest` | Banime name, standalone display, scope, orientation, categories, and icon present |
| 2026-06-06 | Jikan news flow | Live season, anime-news, and promo requests | Current title returned 10 articles; promo endpoint returned data |
| 2026-06-06 | Visual UI | In-app browser automation attempt | Not completed due host Windows sandbox failure |
| 2026-06-06 | Supabase end-to-end | No project credentials were configured | Not verified |
| 2026-06-06 | Theme, import, airing, and dedupe build | `npm.cmd run build` | Passed; PWA assets generated |
| 2026-06-06 | Theme, import, airing, and dedupe lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-06 | Expanded unit suite | `npm.cmd test` | 6 test files and 7 tests passed |
| 2026-06-06 | Updated routes | HTTP requests to `/`, `/settings`, and `/discover` | All returned status 200 |
| 2026-06-06 | Upstream duplicate reproduction | Live Jikan airing request with limit 18 | 18 rows, 17 unique MAL IDs; duplicate ID `62568` |
| 2026-06-06 | Flat UI and query build | `npm.cmd run build` | Passed; TypeScript, Vite, and PWA generation completed |
| 2026-06-06 | Flat UI and query lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-06 | Flat UI and query tests | `npm.cmd test` | 6 test files and 7 tests passed |
| 2026-06-06 | Banned visual pattern scan | Source search for gradients, blur, shadows, display font, and marketing terms | No matches in active application source |
| 2026-06-06 | Updated application routes | HTTP requests to `/`, `/discover`, `/library`, and `/news` | All returned status 200 |
| 2026-06-06 | Updated visual UI | In-app browser automation attempt | Not completed due host Windows sandbox failure |
| 2026-06-06 | Popular and News optimization build | `npm.cmd run build` | Passed; TypeScript, Vite, and PWA generation completed |
| 2026-06-06 | Popular and News optimization lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-06 | Expanded service tests | `npm.cmd test` | 7 test files and 9 tests passed |
| 2026-06-06 | Live Most Popular pagination | Four Jikan pages with 25 rows each | Returned 100 rows and 100 unique MAL IDs |
| 2026-06-06 | Optimized routes | HTTP requests to `/discover` and `/news` | Both returned status 200 |
| 2026-06-06 | Updated contrast and News UI | In-app browser automation attempt | Not completed due host Windows sandbox failure |
| 2026-06-10 | MCP TypeScript | `npm.cmd run mcp:check` | Passed with strict Node/MCP type checking |
| 2026-06-10 | MCP and PWA lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-10 | MCP protocol, repository, and recommendation tests | `npm.cmd test` | 10 test files and 15 tests passed |
| 2026-06-10 | Combined production build | `npm.cmd run build` | Browser and MCP TypeScript checks, Vite build, and PWA generation passed |
| 2026-06-10 | Local MCP HTTP service | Health and protected-resource metadata requests plus SDK Streamable HTTP client | Health returned `ok`, metadata matched the resource/auth server, and all eight tools were discovered |
| 2026-06-10 | OAuth consent route | HTTP request to `/oauth/consent` | Status 200 |
| 2026-06-10 | MCP consent and Settings visual UI | Two in-app browser attempts | Not completed because the browser webview did not attach |
| 2026-06-10 | Real ChatGPT OAuth connection | No public MCP deployment or Supabase OAuth server was configured | Not verified |
| 2026-06-10 | Dependency vulnerability audit | `NODE_OPTIONS=--use-system-ca npm.cmd audit --json` | Zero known vulnerabilities across 617 dependencies |
| 2026-06-10 | Current-tree secret scan | Credential-pattern scan excluding dependencies and build output | No credential-like values found outside documentation text |
| 2026-06-10 | Git-history secret scan | Pattern scan across all three commits | No credential-like values found |
| 2026-06-10 | Security and rate-limit tests | `npm.cmd test` | 13 test files and 26 tests passed |
| 2026-06-10 | Hardened production build | `npm.cmd run build` and `npm.cmd run mcp:build` | PWA/PWA service worker and 51.2 kB MCP bundle built successfully |
| 2026-06-10 | Bundled MCP HTTP security | Started `mcp-dist/index.js` and sent local requests | Health 200, invalid origin 403, oversized body 413, security headers and OAuth metadata correct |
| 2026-06-10 | Bundled rotating-token rate limit | Two requests with different fake bearer values under a one-request IP quota | First reached MCP validation; second returned 429 |
| 2026-06-10 | MCP container build | Docker daemon was not running on the development machine | Not verified; Dockerfile was type/build checked indirectly through its commands |
| 2026-06-20 | Security risk checklist mapping | Manual review of the 51 requested risks against source, schema, deployment config, and prior verification evidence | All 51 items classified as mitigated, partially mitigated, open, or not applicable in `history.md` |
| 2026-06-20 | Security checklist whitespace | `git diff --check` | Passed; Git reported only the existing LF-to-CRLF working-copy warning |
| 2026-06-20 | Unsafe DOM and code execution scan | `rg -n "dangerouslySetInnerHTML\|eval\(\|new Function\|innerHTML\|document\.write" src mcp` | No matches |
| 2026-06-20 | Focused secret-pattern scan | `rg -n` for Supabase service-role, cloud keys, private keys, and assignment-style password/secret/API-key/token values | No credential values found; the only match was the ordinary local `token` variable in `mcp/auth.ts` |
| 2026-06-20 | Regression tests after checklist documentation | `npm.cmd test` | 13 test files and 26 tests passed |
| 2026-06-20 | XML import/export and caching tests | `npm.cmd test` | 14 test files and 30 tests passed |
| 2026-06-20 | XML import/export and caching lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-20 | XML import/export and caching build | `npm.cmd run build` | Browser and MCP TypeScript checks, Vite build, and PWA generation passed; main JS 396.76 kB gzip 122.87 kB |
| 2026-06-20 | XML import/export and caching whitespace | `git diff --check` | Passed; Git reported only LF-to-CRLF working-copy warnings |
| 2026-06-20 | MAL XML import enrichment and JSON backup tests | `npm.cmd test` | 15 test files and 32 tests passed |
| 2026-06-20 | MAL XML import enrichment and JSON backup lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-20 | MAL XML import enrichment and JSON backup build | `npm.cmd run build` | Browser and MCP TypeScript checks, Vite build, and PWA generation passed; main JS 395.34 kB gzip 122.44 kB |
| 2026-06-20 | MAL XML import enrichment and JSON backup whitespace | `git diff --check` | Passed; Git reported only LF-to-CRLF working-copy warnings |
| 2026-06-20 | MAL import checkpoint tests | `npm.cmd test` | 15 test files and 34 tests passed |
| 2026-06-20 | MAL import checkpoint lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-20 | MAL import checkpoint build | `npm.cmd run build` | Browser and MCP TypeScript checks, Vite build, and PWA generation passed; main JS 395.68 kB gzip 122.53 kB |
| 2026-06-20 | MAL import checkpoint whitespace | `git diff --check` | Passed; Git reported only LF-to-CRLF working-copy warnings |
| 2026-06-20 | Watch provider links tests | `npm.cmd test` | 16 test files and 36 tests passed |
| 2026-06-20 | Watch provider links lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-20 | Watch provider links build | `npm.cmd run build` | Browser and MCP TypeScript checks, Vite build, and PWA generation passed; main JS 398.03 kB gzip 123.12 kB |
| 2026-06-20 | Watch provider links whitespace | `git diff --check` | Passed; Git reported only LF-to-CRLF working-copy warnings |
| 2026-06-20 | Anikoto default provider tests | `npm.cmd test` | 16 test files and 37 tests passed |
| 2026-06-20 | Anikoto default provider lint | `npm.cmd run lint` | Passed with no warnings |
| 2026-06-20 | Anikoto default provider build | `npm.cmd run build` | Browser and MCP TypeScript checks, Vite build, and PWA generation passed; main JS 398.22 kB gzip 123.20 kB |
| 2026-06-20 | Anikoto default provider whitespace | `git diff --check` | Passed; Git reported only LF-to-CRLF working-copy warnings |
| 2026-07-30 | Error message copy | `npm run lint && npm test && npm run build` | Blocked before execution because dependencies are incomplete and the package registry returned HTTP 403 |

## Definition of Done

A future change is complete only when all applicable checks are satisfied:

- The user-visible behavior and acceptance condition are clear.
- Domain and service boundaries remain coherent.
- Local-only operation still works unless intentionally removed.
- Cloud changes consider RLS, offline behavior, conflict resolution, and
  migration.
- Relevant unit, integration, or end-to-end tests pass.
- `npm run build`, `npm run lint`, and `npm test` pass.
- Mobile and desktop UI are checked when presentation changes.
- Accessibility impact is evaluated.
- PWA caching and deployment impact are evaluated.
- MCP tool schemas, auth metadata, destructive annotations, and deployment
  impact are evaluated when the integration changes.
- Security and privacy impact are evaluated.
- README and this history document remain accurate.
- Database migrations and rollback implications are documented.
- No secrets or personal test data are committed.

## History Log

### HIST-0001 - 2026-06-06 - Establish engineering history

- Status: Completed
- Goal: Create a durable engineering record before application work.
- Scope: Documentation governance and workspace baseline.
- Changes: Created the original `history.md` template, goals, Definition of
  Done, decision log, risk register, experiment log, and verification register.
- What worked: Read-only PowerShell inspection established the initial
  workspace state.
- What did not work: Standard Windows sandbox inspection failed with
  `spawn setup refresh`.
- Verification: Workspace and Git commands were executed and recorded.
- Follow-up: Define product requirements and select an implementation stack.
- References: `ADR-0001`, `EXP-0001`

### HIST-0002 - 2026-06-06 - Build the modular anime tracker

- Status: Completed
- Goal: Build a personal anime tracker using Jikan with a future mobile path.
- Scope: New React/TypeScript application, dashboard, discovery, library,
  details, persistence, responsive UI, and PWA.
- Changes:
  - Added Vite, React, TypeScript, React Router, React Query, Lucide, ESLint,
    Vitest, and Vite PWA.
  - Added domain models and Jikan DTO mapping.
  - Added request throttling and caching.
  - Added local tracker repository and tracker provider.
  - Added Home, Discover, Library, and Settings routes.
  - Added responsive desktop sidebar and mobile bottom navigation.
  - Added PWA manifest and service worker generation.
  - Added initial unit tests.
- Decisions: Use local-first storage, normalize Jikan at the service boundary,
  and use a layered module structure.
- What worked: Build, lint, tests, local HTTP, and live Jikan requests passed.
- What did not work:
  - npm required `npm.cmd` due PowerShell execution policy.
  - npm required the Windows system CA store.
  - Visual browser automation failed due the host sandbox.
- Security/privacy: Tracking remained on the device and no account was
  required.
- Risks: Local storage alone could not synchronize to a phone.
- References: `ADR-0002` through `ADR-0007`, `EXP-0003` through `EXP-0005`

### HIST-0003 - 2026-06-06 - Separate provider and hook boundaries

- Status: Completed
- Goal: Remove React Fast Refresh warnings and improve module ownership.
- Scope: Tracker and anime-panel context modules.
- Changes:
  - Separated context declarations from provider components.
  - Moved consumer access into dedicated hooks.
  - Updated imports across feature modules.
- Verification: Production build passed; ESLint passed without the original
  Fast Refresh warnings; tests passed.
- Tradeoff: More files are required, but ownership and refresh behavior are
  clearer.
- References: `ADR-0003`

### HIST-0004 - 2026-06-06 - Rebrand to Banime and add anime news

- Status: Completed
- Goal: Expand the tracker into a broader personal anime app.
- Scope: Branding, navigation, News route, news/promotional data, and styles.
- Changes:
  - Renamed product metadata and package to Banime.
  - Replaced the icon and visible brand.
  - Migrated the local-storage key while preserving legacy data.
  - Added Jikan anime-news DTOs and service.
  - Added popular promotional videos.
  - Added a responsive News page and navigation item.
- Decisions:
  - Keep all remote anime content behind Jikan.
  - Build the initial news feed from the first six current-season titles.
- Verification:
  - Live `/anime/{id}/news` response was inspected.
  - Live `/watch/promos/popular` response was inspected.
  - Local `/news` route returned HTTP 200.
- Risks:
  - News is not comprehensive.
  - Remote article freshness and coverage depend on Jikan/MyAnimeList.
- References: `ADR-0004`, `ADR-0005`, `ADR-0014`, `EXP-0007`

### HIST-0005 - 2026-06-06 - Add optional cross-device sync and phone setup

- Status: Completed but externally unverified
- Goal: Allow one personal library to be used on desktop and phone.
- Scope: Supabase client, auth, database repository, merge flow, settings UI,
  PWA installation UI, deployment configuration, and documentation.
- Changes:
  - Added optional Supabase email/password authentication.
  - Added Postgres schema and RLS policies.
  - Added cloud tracker repository.
  - Added merge-by-latest timestamp behavior.
  - Added sequential cloud mutation queue.
  - Added sync state and errors.
  - Added JSON export.
  - Added PWA install prompt handling and iOS instructions.
  - Added Vercel and Netlify SPA route fallbacks.
  - Added environment example.
  - Dynamically imported Supabase after bundle-size review.
- Decisions:
  - Local writes remain authoritative for immediate UX.
  - Cloud is optional and does not block local-only use.
  - Full tracker aggregates are stored as JSON.
  - PWA delivery precedes native mobile development.
- Verification:
  - Build, lint, and three unit tests passed.
  - Manifest contained Banime installation metadata.
  - Supabase code split into an on-demand chunk.
- Not verified:
  - Real sign-up and email confirmation.
  - Real RLS behavior.
  - Desktop-to-phone synchronization.
- Risks:
  - Deletion resurrection.
  - Device-clock conflict errors.
  - In-memory-only write queue.
  - No realtime refresh.
- References: `ADR-0008` through `ADR-0013`, `EXP-0006`

### HIST-0006 - 2026-06-06 - Consolidate development documentation

- Status: Completed
- Goal: Make `history.md` sufficient for future development planning,
  onboarding, architecture review, and risk tracking.
- Scope: Entire implemented application and known future work.
- Changes:
  - Replaced obsolete pre-implementation living sections.
  - Documented product scope, stack, architecture, routes, models, Jikan,
    persistence, Supabase, PWA, security, testing, deployment, limitations, and
    roadmap.
  - Preserved the original baseline as `HIST-0001`.
  - Added decisions and failures derived from implementation evidence.
  - Explicitly marked unverified cloud and browser behavior.
- Verification:
  - Cross-checked documentation against current source files, package
    configuration, SQL schema, README, tests, and build evidence.
  - Searched source inventory to ensure all primary modules are represented.
- Security/privacy: No credentials or personal account data were added.
- Follow-up: Keep this file updated with every meaningful development change.
- References: `GOAL-0001` through `GOAL-0007`

### HIST-0007 - 2026-06-06 - Add dark mode, imports, schedules, and update guarantees

- Status: Completed
- Goal: Improve personalization, backup recovery, airing visibility, update
  transparency, and feed correctness.
- Scope: Theme, Settings, tracker import, Jikan mapping, dashboard, anime
  cards, details, React Query refresh policy, service worker checks, tests, and
  documentation.
- Changes:
  - Replaced the orange-red product accent with blue across the UI and icon.
  - Added a persisted light/dark theme and flash-free HTML bootstrap.
  - Replaced the top-bar placeholder notification button with a theme toggle.
  - Added strict JSON backup parsing, a 5 MB file limit, merge import, result
    reporting, and optional cloud upsert.
  - Added Jikan broadcast fields to the normalized anime model.
  - Added timezone-aware calculation of the next weekly broadcast.
  - Added a dashboard schedule section and airing information on cards and
    anime details.
  - Deduplicated every Jikan anime list by MAL ID.
  - Added 15-minute polling for active seasonal/top feeds and 30-minute polling
    for News.
  - Enabled stale-query refresh when the browser regains focus.
  - Added startup and hourly deployed-code checks through service worker
    registration.
  - Added an update-cadence card and last-check timestamp in Settings.
- Decisions:
  - Treat broadcast times as schedule estimates, not guaranteed streaming
    release times.
  - Merge imports by anime ID and newest `updatedAt`.
  - Keep danger/error red distinct while changing the product accent to blue.
- What worked:
  - Live Jikan data reproduced the duplicate condition: 18 airing rows
    contained 17 unique IDs, with Dr. Stone ID `62568` repeated.
  - Service-layer deduplication removes the duplicate before feature rendering.
  - Timezone conversion produced the expected UTC time in a deterministic
    test.
- What did not work:
  - In-app visual browser verification again failed because the Windows browser
    runtime could not initialize its sandbox.
- Verification:
  - Production build passed.
  - ESLint passed.
  - Six test files and seven tests passed.
  - Home, Settings, and Discover routes returned HTTP 200.
  - Search found no stale orange hex values, old branding, or known encoding
    artifacts in active source files.
- Security/privacy:
  - Import parsing rejects malformed records before modifying storage.
  - Imported cloud data remains protected by existing Supabase RLS.
  - Theme and app-check timestamps remain device-local.
- Reliability:
  - Import has no rollback after a successful merge.
  - Hourly app checks require the application to remain open; browser and
    platform service-worker behavior still controls final activation timing.
- Follow-up:
  - Run visual light/dark and mobile checks when browser automation is
    available.
  - Add import preview/rollback.
  - Verify service-worker updating on a deployed HTTPS build.
- References: `ADR-0015` through `ADR-0019`, `GOAL-0008` through `GOAL-0010`

### HIST-0008 - 2026-06-06 - Simplify the UI and improve filtering

- Status: Completed
- Goal: Replace decorative template styling with a direct interface and make
  catalog and library retrieval easier to narrow.
- Scope: Shared shell, dashboard, Discover, Library, News, anime details,
  global styles, Supabase schema/repository, README, and engineering history.
- Changes:
  - Removed gradients, glass effects, card shadows, decorative hero elements,
    fake profile controls, and overlay treatments.
  - Standardized the product on flat surfaces, one blue accent, a darker page
    canvas, and the system `Segoe UI` font stack.
  - Rewrote headings and supporting text in plain task-focused English.
  - Kept dashboard cards tied to real tracker counts and replaced decorative
    news/promo presentation with actual article images and video links.
  - Added Discover filters for type, genre, minimum score, and sort order.
  - Added Library search across titles, studios, genres, and notes, plus
    status, type, genre, score, and sort controls.
  - Memoized derived filter values, normalized library search data, and final
    result sets.
  - Added normalized Supabase columns for common query fields.
  - Added user-scoped B-tree indexes and a trigram title-search index.
  - Made schema constraints and RLS policy setup safe to rerun.
- Decisions:
  - Keep local filtering after hydration for fast offline behavior in a
    personal library.
  - Keep the JSON aggregate as the source record while duplicating common
    query fields for database retrieval.
- Verification:
  - Production build and PWA generation passed.
  - ESLint passed.
  - Six test files and seven tests passed.
  - Source scans found no active gradients, backdrop blur, box shadows,
    alternate display font, or named marketing-copy terms.
- Not verified:
  - Visual browser automation was not completed in this change.
  - The additive Supabase migration was not run against a configured project.
- Security/privacy:
  - Existing RLS remains user-scoped.
  - No tracking data is sent to Jikan.
  - Search and filters operate on the already-loaded private library.
- Follow-up:
  - Run contrast, keyboard, desktop, and physical-phone checks.
  - Add server-side pagination if a library grows enough to make full
    hydration costly.
- References: `ADR-0020`, `ADR-0021`, `GOAL-0011`

### HIST-0009 - 2026-06-06 - Expand Popular and speed up News

- Status: Completed
- Goal: Improve dark-theme filter readability, return the top 100 popular
  anime, and reduce the time before News becomes usable.
- Scope: Theme tokens, Discover feed styling, Jikan client caching, popular
  pagination, News services/hooks/UI, Settings copy, tests, and documentation.
- Changes:
  - Added dedicated dark active-chip colors so the dark-theme near-white text
    token is no longer reused as a button background.
  - Replaced the saturated dark-theme blue with lighter, muted blue tokens and
    dark blue supporting surfaces.
  - Changed Most Popular to request four pages of 25, preserve Jikan order,
    deduplicate by MAL ID, and return at most 100 titles.
  - Increased the Most Popular freshness window to one hour.
  - Added expiring `sessionStorage` response caching alongside the in-memory
    Jikan cache.
  - Split News into independent per-title article queries and a promo query.
  - Reduced the current-season News fan-out from six titles to four and render
    completed title feeds progressively.
  - Increased News and promo freshness to two hours.
  - Added lazy image decoding and offscreen rendering containment for large
    catalog, article, and promo grids.
  - Added regression tests for popular pagination and single-request
    airing/upcoming behavior.
- Decisions:
  - Keep API cache data in `sessionStorage` so it survives reloads without
    competing with the durable personal library in `localStorage`.
  - Prioritize earlier useful rendering over waiting for a complete News
    aggregate.
- Verification:
  - Production build and PWA generation passed.
  - ESLint passed.
  - Seven test files and nine tests passed.
  - Live Jikan requests returned 100 rows and 100 unique IDs across popular
    pages 1 through 4.
  - Discover and News routes returned HTTP 200.
- Not verified:
  - Visual contrast and progressive rendering could not be checked in the
    in-app browser because the host Windows sandbox failed to initialize it.
- Risks:
  - News still covers only four current-season titles.
  - Session cache data ends with the browser-tab session.
  - A 100-card result still requires more DOM than a paginated or virtualized
    list, although offscreen containment reduces rendering work.
- References: `ADR-0022`, `GOAL-0012`

### HIST-0010 - 2026-06-10 - Add ChatGPT MCP integration

- Status: Implemented locally; deployment authorization remains unverified.
- Goal: Let ChatGPT search anime, pull current information and news, read or
  update the user's synced Banime list, and produce personalized
  recommendations.
- Scope: MCP service, Supabase OAuth consent, library repository, ranking,
  Settings, environment configuration, container deployment, tests, README,
  and engineering history.
- Architecture:
  - Added a separate stateless Streamable HTTP MCP service under `mcp/`.
  - Reused existing domain contracts and Jikan adapters.
  - Reused Supabase Auth and `tracked_anime` RLS instead of adding another
    identity or database system.
  - Added `/oauth/consent` to the PWA for Supabase OAuth approval and denial.
- Tools:
  - `search_anime`, `get_anime_details`, and `get_anime_news` are public,
    read-only Jikan tools.
  - `get_library` is an OAuth-protected read tool with indexed status/title
    filters.
  - `add_to_library`, `update_library_item`, and `remove_from_library` mutate
    the caller's rows through RLS.
  - `get_recommendation_candidates` ranks untracked current/popular anime from
    genre, studio, status, and user-score signals.
- Security:
  - Access tokens are verified with Supabase `getClaims`.
  - The issuer is required to match the configured Supabase Auth server.
  - Optional resource-audience enforcement is available through
    `MCP_EXPECTED_AUDIENCE`.
  - The server uses only the publishable key and caller token, never a
    service-role key.
  - Protected tools return `mcp/www_authenticate` metadata when authorization
    is absent or invalid.
  - Tool security schemes and read-only, destructive, idempotent, and
    open-world annotations are declared.
- Deployment:
  - Added `.env.mcp.example`, `Dockerfile.mcp`, `.dockerignore`, and
    `render.yaml`.
  - Added PWA `VITE_MCP_URL` configuration and a Settings status card.
  - Documented Supabase OAuth server setup and ChatGPT developer-mode
    connection.
- Verification:
  - MCP TypeScript check passed.
  - ESLint passed.
  - Ten test files and 15 tests passed.
  - An in-memory MCP client discovered all eight tools.
  - A Streamable HTTP SDK client also discovered all eight tools from the
    local `/mcp` endpoint.
  - Local health and OAuth protected-resource metadata were correct.
  - The `/oauth/consent` SPA route returned HTTP 200.
  - The protected library tool returned the expected OAuth challenge.
  - Combined browser/MCP production build and PWA generation passed.
- Not verified:
  - Real Supabase OAuth consent, token exchange, and audience hook.
  - Authenticated library operations against a live Supabase project.
  - Public HTTPS deployment and connection from a real ChatGPT account.
  - Browser visual checks of the consent and Settings screens.
- Follow-up:
  - Configure a disposable Supabase project and public preview URLs.
  - Run OAuth and two-user RLS integration tests.
  - Add production rate limits, structured audit logs, monitoring, and
    resource-specific token audiences.
- References: `ADR-0023` through `ADR-0026`, `RISK-0018` through `RISK-0021`,
  `GOAL-0013`

### HIST-0011 - 2026-06-10 - Security hardening and scaling controls

- Status: Completed locally; deployed penetration/load testing remains open.
- Goal: Audit Banime for credential exposure, injection, abuse, and scaling
  risks, then add enforceable controls at each public or persisted input
  boundary.
- Audit findings:
  - No committed credential-like values were found in the working tree or all
    three Git commits.
  - `npm audit` reported zero known dependency vulnerabilities.
  - Supabase queries were already parameterized and RLS-scoped; no raw SQL,
    shell execution, `eval`, or raw HTML rendering path was found.
  - The MCP edge lacked quotas, payload limits, allow lists, and concurrency
    bounds.
  - JSON imports and local storage trusted unbounded text and URL schemes.
  - Jikan per-second spacing did not enforce its official 60-request minute
    limit or coordinate multiple replicas.
- HTTP and abuse controls:
  - Added exact host validation and configurable exact-origin CORS.
  - Added per-IP request quotas, additional token-hash quotas, and a separate
    tool-call quota.
  - Ensured fake/rotated bearer values cannot bypass the IP quota.
  - Added bounded in-memory counters and optional Upstash distributed
    counters.
  - Added a shared 60-per-minute outbound Jikan budget.
  - Added JSON body, header, concurrency, request, header, and upstream limits.
  - Rejected unsupported methods, content types, compressed requests, invalid
    URLs, and oversized chunked or declared bodies.
- Input and injection controls:
  - Made all MCP Zod object schemas strict.
  - Added control-character, length, range, duplicate, and maximum-ID rules.
  - Escaped Postgres `ILIKE` wildcard metacharacters; Supabase continues to
    parameterize the request.
  - Replaced detailed backend errors with generic client errors.
  - Bounded and sanitized external Jikan text before returning or rendering.
  - Required credential-free HTTPS for imported and upstream external URLs.
  - Added bounded import records, arrays, text, progress, years, scores, and
    episode values.
  - Validated local storage on every read.
  - Validated OAuth authorization IDs, redirect protocols, logo URLs, and
    credential field lengths.
- Browser/deployment controls:
  - Added CSP, HSTS, frame denial, MIME sniffing protection, referrer policy,
    and permissions policy for Vercel and Netlify.
  - Moved theme initialization to a same-origin external script so CSP does
    not need `unsafe-inline`.
  - Converted the MCP image to a multi-stage production build running as the
    non-root Node user with development dependencies removed.
  - Added a container health check.
- Database and scale:
  - Added JSON object/100 KB size and normalized title/type length checks.
  - Added a direct `anime_title gin_trgm_ops` index matching `ILIKE`.
  - Added bounded offset pagination to MCP library reads.
  - Reused the Supabase verifier client per process.
  - Documented the stateless replica + Upstash + Supabase deployment model.
- Verification:
  - TypeScript, ESLint, PWA build, MCP bundle, and `git diff --check` passed.
  - Thirteen test files and 26 tests passed.
  - HTTP tests cover security headers, invalid origins, oversized requests,
    rate limiting, and rotating fake-token resistance.
- Residual risk:
  - No production WAF, centralized logs, metrics, alerting, DAST, or load test
    has been completed.
  - Real Supabase OAuth, audience hooks, and two-user RLS tests remain open.
  - New SQL constraints must be applied and may require cleanup of oversized
    existing rows.
- References: `ADR-0027` through `ADR-0030`, `RISK-0022` through `RISK-0026`

### HIST-0012 - 2026-06-20 - Map security checklist to Banime controls

- Status: Completed as documentation; open items remain in the risk register.
- Goal: Convert the requested 51-item security checklist into a Banime-specific
  development record that shows which risks are mitigated, partially mitigated,
  open, or not applicable.
- Findings:
  - Most code-level injection, XSS, SSRF, CORS, input validation, security
    header, and MCP abuse-control risks are already covered by the hardening
    completed in `HIST-0011`.
  - The largest remaining risks are deployment and operations work: real
    Supabase RLS verification, production OAuth/audience checks, provider-side
    Auth rate limits, log redaction, monitoring, backup/restore, source-map
    verification, and scheduled dependency review.
  - Payment, webhook, NoSQL, admin route, S3, Firebase, and custom password
    reset risks are not applicable until Banime adds those features.
- Documentation changes:
  - Added `Security Risk Checklist Review` under the Security and Privacy
    section.
  - Updated the document date and current-state timestamp to 2026-06-20.
  - Corrected the current quality-check evidence from 15 tests to 26 tests.
- Verification:
  - `git diff --check` passed with only Git's LF-to-CRLF working-copy
    warning for `history.md`.
  - Unsafe DOM/code-execution scan found no `dangerouslySetInnerHTML`, `eval`,
    `new Function`, `innerHTML`, or `document.write` use in `src` or `mcp`.
  - Focused secret-pattern scan found no credential values; the only match was
    the ordinary local `token` variable in `mcp/auth.ts`.
  - `npm.cmd test` passed with 13 test files and 26 tests.
- References: `HIST-0011`

### HIST-0013 - 2026-06-20 - Switch backups to XML and persist Top 100 cache

- Status: Completed locally, then partially superseded by `HIST-0014` for the
  XML backup/export scope. The Top 100 caching work remains current.
- Goal: Replace the visible JSON import/export workflow with XML, support
  MyAnimeList XML list imports, confirm imported MAL rows save to the tracker,
  and improve caching for slow-changing catalog lists.
- Import/export changes:
  - Added `src/domain/tracker/xml.ts` with Banime XML serialization,
    Banime XML parsing, MyAnimeList XML parsing, DTD/entity rejection, size
    enforcement, XML entity decoding, status mapping, score/progress mapping,
    and MAL date handling.
  - Updated Settings to export `banime-library-YYYY-MM-DD.xml`, accept XML
    files, and import either Banime XML backups or MyAnimeList XML exports.
  - Kept legacy Banime JSON import parsing in Settings and internal
    `localStorage` validation so existing users do not lose older data.
  - MyAnimeList imports save through the same `importItems` path as manual
    tracking: local `localStorage` first, then Supabase upsert when signed in.
  - Added poster placeholders for imported rows that do not have image URLs in
    the source XML.
- Caching changes:
  - Added explicit browser cache targets to the Jikan client.
  - Kept faster-changing lists in session storage.
  - Changed Top 100 popular anime to a 6-hour cache that persists in
    `localStorage`, with React Query stale time using the same service
    constant.
- Documentation changes:
  - Updated README feature, update cadence, and validation notes.
  - Updated current-state history, Jikan cache details, Settings behavior,
    ADRs, risks, verification register, and production build sizes.
- Verification:
  - `npm.cmd test` passed with 14 test files and 30 tests.
  - `npm.cmd run lint` passed with no warnings.
  - `npm.cmd run build` passed; generated main JS 396.76 kB, gzip 122.87 kB.
  - `git diff --check` passed with only LF-to-CRLF working-copy warnings.
- References: `ADR-0031`, `ADR-0032`, `GOAL-0009`, `GOAL-0012`

### HIST-0014 - 2026-06-20 - Correct XML scope and enrich MAL imports

- Status: Completed locally.
- Reason: The user clarified that XML is needed only because MyAnimeList
  exports lists as XML. Banime and Jikan should remain JSON-oriented where
  JSON is the native protocol.
- Changes:
  - Restored Banime export to JSON with the `banime-library-YYYY-MM-DD.json`
    filename.
  - Kept Banime JSON import support for app backups.
  - Narrowed `src/domain/tracker/xml.ts` to MyAnimeList XML parsing only.
  - Added Jikan enrichment for MAL XML imports before saving. Banime requests
    each MAL ID from Jikan and replaces the placeholder MAL snapshot with the
    normalized Jikan record, including poster URLs, when the lookup succeeds.
  - Preserved imported MAL rows when individual Jikan lookups fail, so one
    missing or failed title does not block the whole list import.
  - Added import progress copy that explains Jikan enrichment can take time.
- Verification:
  - `npm.cmd test` passed with 15 test files and 32 tests.
  - `npm.cmd run lint` passed with no warnings.
  - `npm.cmd run build` passed; generated main JS 395.34 kB, gzip 122.44 kB.
  - `git diff --check` passed with only LF-to-CRLF working-copy warnings.
- Supersedes: The user-facing Banime XML export/import part of `HIST-0013`
  and `ADR-0031`.
- References: `ADR-0033`, `GOAL-0009`

### HIST-0015 - 2026-06-20 - Checkpoint MAL imports before Jikan enrichment

- Status: Completed locally.
- Reason: The user asked whether killing the running instance immediately
  after starting an import would still preserve the imported list.
- Behavior before this change:
  - MyAnimeList XML parsing happened first, but Banime saved only after all
    Jikan enrichment calls completed.
  - Stopping the app during enrichment could lose the parsed base list if the
    browser page was also closed or reloaded before the final save.
- Changes:
  - Settings now saves the parsed MyAnimeList XML list immediately after
    validation.
  - Jikan enrichment runs after that checkpoint and saves enriched rows as a
    second import pass.
  - Added a controlled same-timestamp replacement option for import merges so
    enriched catalog snapshots can replace MAL placeholders without changing
    the user's tracking timestamps.
  - Normal cloud/local conflict resolution keeps its previous behavior unless
    that option is explicitly requested by the enrichment pass.
- Practical guarantee:
  - Once the Settings message says the MyAnimeList titles were saved locally,
    the base list will be available after relaunch in the same browser profile.
  - If the app is stopped before that checkpoint message appears, the file may
    need to be imported again.
  - Supabase sync is still asynchronous; local persistence is the durable first
    checkpoint.
- Verification:
  - `npm.cmd test` passed with 15 test files and 34 tests.
  - `npm.cmd run lint` passed with no warnings.
  - `npm.cmd run build` passed; generated main JS 395.68 kB, gzip 122.53 kB.
  - `git diff --check` passed with only LF-to-CRLF working-copy warnings.
- References: `GOAL-0009`, `HIST-0014`

### HIST-0016 - 2026-06-20 - Add configurable watch-search provider links

- Status: Completed locally.
- Goal: Let the user open an external watch-search or availability page from
  Banime without hardcoding one streaming website into the app.
- Boundary:
  - Banime does not host, embed, scrape, or validate episode streams.
  - The implementation uses provider search/availability URLs only.
  - Default providers are Anikoto, JustWatch, and Crunchyroll; Anikoto is the
    default selected provider.
- Changes:
  - Added `src/domain/watch/providers.ts` as the single provider registry and
    search URL builder.
  - Added `WatchProvider` context and `useWatchProvider` hook to persist the
    selected provider per browser.
  - Added a Settings card for choosing the active watch provider.
  - Added "Find on {provider}" links to library cards and anime details.
  - Added tests for provider fallback and URL encoding.
  - Added Anikoto as the default provider using
    `https://anikototv.to/filter?keyword={query}`.
  - Bumped the watch-provider preference key to `banime:watch-provider:v2`
    so existing local sessions default to Anikoto after this change.
- Provider rotation:
  - Update `WATCH_PROVIDERS` in `src/domain/watch/providers.ts`.
  - Keep providers to authorized search or availability destinations.
- Verification:
  - `npm.cmd test` passed with 16 test files and 37 tests.
  - `npm.cmd run lint` passed with no warnings.
  - `npm.cmd run build` passed; generated main JS 398.22 kB, gzip 123.20 kB.
  - `git diff --check` passed with only LF-to-CRLF working-copy warnings.
- References: `ADR-0034`, `GOAL-0014`, `RISK-0027`

### HIST-0017 - 2026-07-30 - Use a direct anime-data error message

- Status: Completed locally.
- Reason: The default error text used the vague phrase "taking a break" rather
  than stating what failed.
- Change: Replaced it with "Anime data could not be loaded." The existing
  connection guidance and Retry action remain available.
- Verification: `git diff --check` passed. Lint, tests, and the production build
  could not start because the checked-out dependencies are incomplete and the
  package registry returned HTTP 403 while restoring them.

### HIST-0018 - 2026-07-29 - Migrate the anime provider to Tenrai

- Status: Completed locally.
- Reason: Jikan announced that its public API will enter brownout mode on
  September 1, 2026 and be discontinued on October 1, 2026.
- Changes:
  - Replaced the Jikan service boundary with Tenrai v1 across the PWA and MCP
    server.
  - Renamed provider-specific clients, DTOs, mappers, enrichment functions,
    errors, request gates, caches, and rate-limit configuration.
  - Updated CSP allowlists, deployment files, user-facing copy, metadata, and
    current setup documentation.
  - Replaced the unavailable Jikan `/watch/promos/popular` call with trailers
    from Tenrai current-season records.
  - Preserved `MCP_JIKAN_RATE_LIMIT_REQUESTS` as a temporary fallback alias for
    existing MCP deployments; new configuration uses
    `MCP_TENRAI_RATE_LIMIT_REQUESTS`.
- Verification:
  - Tenrai season, top-anime, detail, and title-news endpoints returned `200`.
  - `npm.cmd run lint` passed.
  - `npm.cmd test -- --run` passed with 17 test files and 39 tests.
  - `npm.cmd run build` passed, including the MCP typecheck and PWA build.
  - The local Vite development server returned `200`.
  - `git diff --check` passed with only LF-to-CRLF working-copy warnings.
- Supersedes: `ADR-0004` and other current-state Jikan provider assumptions.

### HIST-0019 - 2026-07-30 - Audit and harden application security

- Status: Completed locally with production follow-up items.
- Changes:
  - Fixed JSON-RPC batch accounting so every MCP `tools/call` consumes one
    tool-rate-limit unit.
  - Added an HTTP regression test for batched tool calls.
  - Ignored local environment files while retaining tracked example files.
  - Updated the MCP SDK, React Router, ESLint, and Vite to current compatible
    releases and refreshed vulnerable transitive dependencies.
- Verification:
  - Repository-wide review covered 145 application and configuration files.
  - `npm.cmd run lint` passed.
  - `npm.cmd test` passed with 18 test files and 44 tests.
  - `npm.cmd run build` passed, including the MCP typecheck and PWA build.
  - No tracked credentials, production source maps, or unsafe DOM sinks were
    found.
- Follow-up:
  - Enable `MCP_EXPECTED_AUDIENCE` only after the Supabase access-token hook
    emits the same audience.
  - Verify provider-managed monitoring, backups, authentication limits, and
    live RLS configuration in the production consoles.

### HIST-0020 - 2026-07-30 - Add hosting-ready account boundary

- Status: Implemented locally; provider configuration and deployment pending.
- Changes:
  - Added email-or-username password login, account creation, email
    verification codes, password reset codes, Google OAuth with PKCE, and
    global sign-out.
  - Moved Supabase sessions behind same-origin Vercel Functions using
    `HttpOnly`, `SameSite=Lax`, secure production cookies.
  - Added private, case-insensitive usernames and an auth-user profile trigger.
  - Moved cloud-library operations behind authenticated API routes that derive
    `user_id` from the verified session and retain Supabase RLS enforcement.
  - Removed the obsolete browser-persisted Supabase client and OAuth consent
    route; MCP consent needs a cookie-aware server implementation before MCP
    OAuth is enabled.
  - Added hosted email templates and documented Gmail SMTP, Google OAuth,
    Supabase, Vercel, and Upstash setup.
- Verification:
  - `npm.cmd run lint` passed.
  - `npm.cmd test` passed with 20 test files and 50 tests.
  - `npm.cmd run build` passed, including app, MCP, and account API typechecks.
  - Account states were inspected at 1440x900 and 375x812 with no horizontal
    overflow and six stable mobile navigation slots.

## Release History

No formal production release has been recorded.

The current code identifies itself as version `0.1.0`, but this should be
treated as a development snapshot until:

- The working tree is reviewed and committed.
- A deployment target is selected.
- Supabase is configured and verified.
- Physical phone installation is tested.
- A release tag and rollback procedure are created.
