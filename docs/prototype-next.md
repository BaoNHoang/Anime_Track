# Banime Next prototype

Branch: `prototype/banime-next`. Review-only; do not merge or promote automatically.

The preview root opens a new self-contained workspace. `/?classic=1` opens the original app. Existing routes remain available.

## Review flows

- Today: seasonal spotlight, continue watching, sample-library onboarding, adjustable weekly episode target.
- Discover: current season, popular and upcoming feeds, debounced catalog search, genre filtering, add to list.
- Library: cover/table views, status filters, sorting, inline status updates, episode logging, editable rating and notes, export.
- Planner: seven-day schedule in the device timezone and a random pick from the backlog.
- Insights: library totals, genre distribution and dated episode journal.
- Light/dark themes, mobile navigation and native keyboard-accessible detail dialog.

## Isolation and limitations

All prototype writes use `banime:prototype:next:v1` in localStorage. The prototype never mounts cloud auth or tracker providers and never writes to production account APIs. Original-app links do open the normal account-enabled app. The sample library uses real seasonal titles with explicitly synthetic progress, only after clicking Try sample library.

Catalog browsing is live Tenrai data and depends on upstream availability. Results currently cover one page per query. Weekly broadcasts are estimates, not confirmed streaming releases. Prototype notes and progress do not sync across devices; export is a prototype backup, not the production import format. Session history measures episode actions logged here, not historical watching time.

## Preview deployment

Push this branch to trigger the project's existing Vercel Git integration. In Vercel Deployments, filter by `prototype/banime-next` and open the latest ready preview. Do not change the production branch or promote the deployment during review.

## Inspiration

MyAnimeList's list and seasonal-catalog workflows and AniList's visual library browsing informed the prototype. No AniList API integration or copied branding is included.
