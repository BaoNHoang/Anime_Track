# Product

<!-- impeccable:product-schema 1 -->

This file defines Banime's audience, product purpose, scope, constraints, and
principles. User-facing features and setup belong in `README.md`; visual rules
belong in `DESIGN.md`; implemented architecture, caching, security evidence,
risks, and chronology belong in `docs/engineering-history.md`.

## Platform

web

## Users

People who follow anime and want one private place to discover current titles,
track their progress, and return to their library. This audience is inferred
from the existing product copy and implemented workflows.

## Product Purpose

Banime combines anime discovery, news, personal watch tracking, and optional
cross-device syncing in a mobile-ready web application.

## Positioning

Banime keeps personal tracking local-first while pairing it with a current
public anime catalog and optional Supabase sync.

## Operating Context

Users browse seasonal, upcoming, historical, studio, and family collections;
search the catalog; maintain an ordered set of profile favorites; update
episode progress; and occasionally import a MyAnimeList XML export.

## Capabilities and Constraints

- React and TypeScript PWA using ordinary CSS and a Banime-owned SVG icon set.
- Tenrai provides read-only catalog and news data.
- Profile favorites are bounded local data with optional authenticated sync.
- Existing light and dark themes must remain available.
- The user requested a modern, simple redesign with transitioning background
  images, without visual clutter or heavyweight runtime dependencies.

## Brand Commitments

Banime is a private anime tracker with a straightforward, calm voice. The
existing Banime name and functional routes remain unchanged.

## Evidence on Hand

Current routes, components, and live anime data are present in the repository.
No proprietary brand photography or commissioned illustration assets are
available.

## Product Principles

- Make repeated tracking actions fast and easy to scan.
- Let anime artwork create atmosphere without obscuring controls or content.
- Keep the interface useful with unreliable catalog data and offline shell
  access.
- Preserve clear theme choice and comfortable use across screen sizes.

## Accessibility & Inclusion

Keep contrast and keyboard behavior intact in both themes. Background motion
must honor `prefers-reduced-motion`.
