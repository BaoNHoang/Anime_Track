# Product

<!-- impeccable:product-schema 1 -->

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

Users browse seasonal and popular anime, search the catalog, update episode
progress, and occasionally import a MyAnimeList XML export. The interface is
used repeatedly for short scanning and update tasks on desktop and mobile.

## Capabilities and Constraints

- React and TypeScript PWA using ordinary CSS and Lucide icons.
- Tenrai provides read-only catalog and news data.
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
