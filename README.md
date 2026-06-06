# Kitsu Log

A private, mobile-ready anime tracker powered by the Jikan v4 API.

## Features

- Browse currently airing, popular, and upcoming anime
- Debounced catalog search with request throttling and caching
- Track status, episode progress, and personal scores
- Local-first persistence with no account required
- Responsive navigation and installable PWA support
- Modular API, domain, storage, feature, and presentation layers

## Run locally

```bash
npm install
npm run dev
```

## Architecture

- `src/domain`: Framework-independent anime and tracker models
- `src/services/jikan`: Jikan DTOs, mapping, throttling, and API access
- `src/services/storage`: Replaceable local tracker repository
- `src/context`: Application state and feature coordination
- `src/hooks`: Query and utility hooks
- `src/features`: Page-level feature modules
- `src/components`: Shared presentation components

Jikan is a read-only API. Personal tracking data is stored in local storage.
The storage module is intentionally isolated so cloud sync or a mobile-native
database can replace it without changing the feature UI.
