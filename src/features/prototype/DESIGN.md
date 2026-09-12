# Banime Next design

This review-only prototype uses an Operate-mode workspace inspired by familiar MyAnimeList and AniList browsing and list conventions. Posters carry identity; blue controls and restrained surfaces support repeated tracking actions.

Light: canvas #f2f5fa, surface #ffffff, text #21334b, secondary #60718a, action #285fba. Dark: canvas #111c2b, surface #1a293c, text #e4ecf7, secondary #a4b6ce, accent #97beff. System Segoe UI typography supports dense lists, with 14px body and 25–36px page headings.

Desktop uses a fixed sidebar and search header. Below 800px navigation becomes a five-item bottom bar. Cover grids move from six to four, three and two columns. Today pairs a seasonal spotlight with a weekly target and an episode queue. Library offers poster and table views; planner groups estimated broadcasts by local date; insights uses ordinary bars and a dated journal.

Corners range from 7–12px. Native controls, visible focus, a labeled native dialog, inline notices, loading/error/empty states and reduced-motion behavior are required. Small poster zooms are the only authored motion.

Prototype state stays in separate localStorage. Preserve that disclosure and the original-app link. Independent code review completed; screenshot, contrast and keyboard verification remain unverified because no browser connection was available.
