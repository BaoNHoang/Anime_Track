# Visual Design

Banime is designed as a personal media archive: artwork identifies the
content, while the interface around it stays quiet, precise, and fast to scan.

## Foundation

- Use graphite navigation, cool neutral surfaces, and coral only for primary
  actions and active states.
- Use green, blue, and gold only for meaningful status categories.
- Keep corners at 8px or less and rely on borders before shadows.
- Use Aptos or Segoe UI Variable as a single workhorse interface family.

## Layout

- Desktop uses a 220px fixed navigation rail and a 1420px content maximum.
- Mobile replaces the rail with a five-item bottom navigation.
- The dashboard begins with live seasonal artwork, followed by one compact
  library summary and a two-column work area.
- Catalog pages use poster grids; library and settings use denser rows.

## Components

- Buttons, inputs, selects, tabs, and icon controls use 7px corners and a
  shared 40px default control height.
- Cards are reserved for individual anime, news, and tracking records.
- Settings are grouped into one divided surface instead of separate floating
  cards.
- Metadata is small but never used as decorative uppercase copy.

## Themes

Light mode uses a cool gray canvas with white content surfaces. Dark mode uses
deep charcoal surfaces with lighter borders rather than simple inversion.
Both themes preserve semantic accent colors and readable contrast.

## Motion

Seasonal background artwork crossfades every 12 seconds and stops when reduced
motion is requested. Other transitions are limited to short state feedback,
panel movement, and image hover response.
