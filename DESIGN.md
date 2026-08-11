# Visual Design

Banime is designed as an anime broadcast room: artwork and motion make the
catalog feel alive, while the controls stay compact and fast to scan.

## Foundation

- Use ink navigation, cool neutral surfaces, candy-coral actions, broadcast
  green, sky blue, and warm yellow only where status meaning requires them.
- Use green, blue, and gold only for meaningful status categories.
- Keep corners at 8px or less and rely on borders before shadows.
- Use Yu Gothic UI or Meiryo UI for headings, with Aptos or Segoe UI Variable
  for controls and body copy.

## Layout

- Desktop uses a full-width broadcast header with the Banime mark, primary
  destinations, catalog search, shuffle control, and profile access. Account,
  settings, theme, and sign-out stay in the profile menu instead of competing
  with primary navigation.
- Mobile reduces the header to the mark, search, and profile access, with a
  five-item bottom navigation for the primary destinations.
- Home starts directly with current-season anime, then uses compact shelves for
  upcoming titles and top anime from earlier decades. Profile owns the tracking
  summary, activity, airing schedule, genre distribution, and ordered favorites.
- Catalog pages use poster grids. The library uses dense poster-only tiles;
  clicking a cover opens the detail drawer for status, progress, and score
  editing.
- News uses equal-weight responsive cards; no article receives a viewport-sized
  featured treatment.
- Discovery and search use server-backed pagination plus presets for upcoming,
  classics, Studio Ghibli, family, movies, and most-favorited anime. Each
  visited page remains cached locally while another loads.

## Components

- Banime uses a first-party SVG icon set with rounded-square geometry and a
  consistent 1.8px stroke. The angular folded-page `B` is the product mark.
- Buttons, inputs, selects, tabs, and icon controls use 7px corners and a
  shared 40px default control height.
- Cards are reserved for individual anime, news, and tracking records.
- Settings are grouped into one divided surface instead of separate floating
  cards.
- Metadata is small but never used as decorative uppercase copy.
- The anime detail drawer overlays the page without changing the background
  layout width or interrupting its scroll position.
- Favorite anime, studios, directors, and characters use one profile editor.
  Drag ordering always has equivalent move-up and move-down controls.

## Themes

Light mode uses a cool gray canvas with white content surfaces. Dark mode uses
deep charcoal surfaces with lighter borders rather than simple inversion.
Both themes preserve semantic accent colors and readable contrast.

## Motion

Seasonal background artwork crossfades every 12 seconds. Cards lift with a
slight cel-like tilt. Poster cards do not add a redundant
"View details" overlay because the image itself is already the detail control.
All motion stops when reduced motion is requested.
