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

- Desktop uses a 76px icon rail that expands to 220px on hover or keyboard
  focus, plus a 1420px content maximum. Pointer clicks do not pin the rail
  open; the active route remains a complete centered icon tile when collapsed.
- Mobile replaces the rail with a five-item bottom navigation.
- The dashboard leads with a compact tracking summary and completion rail.
  Below it, personal activity uses two columns beside a narrow chronological
  airing list, followed by a separate premiere board for upcoming titles.
- Catalog pages use poster grids. The library uses dense poster-only tiles;
  clicking a cover opens the detail drawer for status, progress, and score
  editing.
- News uses equal-weight responsive cards; no article receives a viewport-sized
  featured treatment.
- Discovery and search use server-backed pagination. Each visited page remains
  cached locally, and the current page stays visible while another loads.

## Components

- Buttons, inputs, selects, tabs, and icon controls use 7px corners and a
  shared 40px default control height.
- Cards are reserved for individual anime, news, and tracking records.
- Settings are grouped into one divided surface instead of separate floating
  cards.
- Metadata is small but never used as decorative uppercase copy.
- The anime detail drawer overlays the page without changing the background
  layout width or interrupting its scroll position.

## Themes

Light mode uses a cool gray canvas with white content surfaces. Dark mode uses
deep charcoal surfaces with lighter borders rather than simple inversion.
Both themes preserve semantic accent colors and readable contrast.

## Motion

Seasonal background artwork crossfades every 12 seconds. The broadcast
indicator pulses, cards lift with a slight cel-like tilt, and the navigation
rail unfolds. Poster cards do not add a redundant
"View details" overlay because the image itself is already the detail control.
All motion stops when reduced motion is requested.
