# Banime

Banime is a private, mobile-ready anime tracker, discovery app, and news hub.
Anime data comes from the Jikan v4 API. Tracking is local-first and can
optionally sync across devices through Supabase.

## Features

- Browse currently airing, upcoming, and the top 100 most popular anime
- Search the Jikan catalog and filter by type, genre, score, and sort order
- Read news associated with current anime and browse popular trailers
- See the next scheduled weekly broadcast in your local time
- Track status, episode progress, notes, and personal scores
- Search and filter your library by status, type, genre, score, and progress
- Use a persisted light or dark theme with a blue accent palette
- Keep tracking locally with no account or backend required
- Optionally sync the same library between desktop and phone
- Install as a Progressive Web App from a phone home screen
- Import or export validated Banime JSON library backups
- Connect ChatGPT through MCP to search anime, read or update the synced
  library, pull news, and request recommendations

## Update cadence

- Deployed app code is checked at startup and every 60 minutes while Banime is
  open. The generated service worker installs updates automatically.
- Current-season and airing feeds refresh every 15 minutes while visible.
- News headlines and trailers refresh every 2 hours while visible.
- Fresh Jikan responses are cached for the current browser tab and survive
  page reloads until their endpoint-specific expiry time.
- Returning to a stale browser tab triggers a refresh.
- Search results are cached for 10 minutes and anime details for 30 minutes.

Jikan broadcast times are weekly schedule estimates. They may differ from the
time an episode becomes available on a streaming platform.

## Run locally

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
npm run lint
npm test
```

## Cross-device database sync

Banime uses Supabase Auth and Postgres for optional sync. Local storage remains
the primary offline copy. When a user signs in, Banime merges local and cloud
records and keeps the newest version of each title.

The database stores the complete tracker record as JSON and also maintains
query columns for status, title, type, score, progress, and added/updated time.
The schema adds user-scoped B-tree indexes and a trigram title-search index.
The current personal-library UI hydrates the user's rows once, then performs
memoized filtering locally so it stays responsive and works offline.

1. Create a Supabase project at <https://supabase.com>.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local`.
4. Add the project URL and publishable key:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

5. Restart the development server.
6. Open Settings in Banime and create your personal sync account.
7. Sign into that same account on your phone.

The SQL file is designed to be rerun. It backfills query columns for existing
rows, adds missing constraints and indexes, and recreates the same RLS
policies.

The publishable key is intended for browser use. Do not put a Supabase secret
or service-role key in any `VITE_` environment variable. Row-level security in
the provided schema limits each signed-in user to their own records.

## Connect ChatGPT with MCP

Banime includes a separate Streamable HTTP MCP server under `mcp/`. Public
Jikan tools can search anime, load details, and pull title news. Library tools
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

1. Deploy the Banime PWA over HTTPS and keep its Supabase browser variables.
2. Deploy `Dockerfile.mcp` as a separate public web service. `render.yaml` is
   included as one option.
3. Set `MCP_PUBLIC_URL` to the complete public `/mcp` URL.
4. In Supabase Auth, enable the OAuth 2.1 server.
5. Set the OAuth authorization path to the deployed Banime PWA URL ending in
   `/oauth/consent`.
6. Enable dynamic client registration, or register the ChatGPT OAuth client
   manually.
7. Add `VITE_MCP_URL` to the PWA deployment and rebuild it.
8. In ChatGPT, open **Settings > Apps & Connectors > Advanced settings**,
   enable developer mode, create an app, and enter the public MCP URL.
9. Connect the app and approve access on Banime's consent page.

For production, use a Supabase access-token hook to issue a resource-specific
audience and set the same value in `MCP_EXPECTED_AUDIENCE`. Until that is
configured, leave `MCP_EXPECTED_AUDIENCE` unset. RLS still limits every token
to its own user's rows.

Official setup references:

- [OpenAI Apps SDK MCP server guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Connect an MCP server to ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)
- [OpenAI Apps SDK authentication](https://developers.openai.com/apps-sdk/build/auth)
- [Supabase MCP OAuth authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)

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

- `src/domain`: Framework-independent anime, news, and tracker models
- `src/services/jikan`: Jikan DTOs, mapping, throttling, news, and API access
- `src/services/storage`: Local browser repository and legacy data migration
- `src/services/supabase`: Auth client loading and cloud tracker repository
- `src/context`: Authentication, tracker state, and feature coordination
- `src/hooks`: Query, install, authentication, and utility hooks
- `src/features`: Dashboard, discovery, news, library, details, and settings
- `src/components`: Shared presentation components
- `mcp`: Streamable HTTP server, OAuth token validation, tool registration,
  Supabase library repository, and recommendation ranking

Jikan is read-only. Personal tracking data is never sent to Jikan or
MyAnimeList.
