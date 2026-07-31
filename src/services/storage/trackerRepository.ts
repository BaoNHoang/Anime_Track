import type {
  TrackedAnime,
  TrackingStatus
} from "../../domain/tracker/types";
import type { Anime } from "../../domain/anime/types";
import { parseLibraryImport } from "../../domain/tracker/import";

const STORAGE_KEY = "banime:library:v1";
const LEGACY_STORAGE_KEY = "kitsu-log:library:v1";

function readLibrary(): TrackedAnime[] {
  try {
    const value =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!value) return [];
    const parsed = parseLibraryImport(JSON.parse(value) as unknown);
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return [];
  }
}

function writeLibrary(items: TrackedAnime[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const trackerRepository = {
  getAll(): TrackedAnime[] {
    return readLibrary();
  },

  save(items: TrackedAnime[]) {
    writeLibrary(items);
  },

  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  },

  create(anime: Anime, status: TrackingStatus): TrackedAnime {
    const timestamp = new Date().toISOString();
    return {
      anime,
      status,
      progress: 0,
      notes: "",
      addedAt: timestamp,
      updatedAt: timestamp
    };
  }
};
