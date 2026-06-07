import type {
  TrackedAnime,
  TrackingStatus
} from "../../domain/tracker/types";
import type { Anime } from "../../domain/anime/types";

const STORAGE_KEY = "banime:library:v1";
const LEGACY_STORAGE_KEY = "kitsu-log:library:v1";

function readLibrary(): TrackedAnime[] {
  try {
    const value =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (value && !window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
    return value ? (JSON.parse(value) as TrackedAnime[]) : [];
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
