import { createContext } from "react";
import type { Anime } from "../../domain/anime/types";
import type { ProfileSummary } from "../../domain/tracker/profileSummary";
import type {
  TrackedAnime,
  TrackingStatus
} from "../../domain/tracker/types";

export interface TrackerContextValue {
  items: TrackedAnime[];
  canManage: boolean;
  isReady: boolean;
  profileSummary?: ProfileSummary;
  syncStatus: "local" | "syncing" | "synced" | "error";
  syncError?: string;
  getTracked: (animeId: number) => TrackedAnime | undefined;
  addAnime: (anime: Anime, status?: TrackingStatus) => void;
  updateAnime: (
    animeId: number,
    updates: Partial<
      Pick<TrackedAnime, "status" | "progress" | "episodeHistory" | "userScore" | "notes">
    >
  ) => void;
  setEpisodeWatched: (
    animeId: number,
    episode: number,
    watched: boolean,
    watchedAt?: string
  ) => void;
  removeAnime: (animeId: number) => void;
  importItems: (
    items: TrackedAnime[],
    options?: { replaceOnEqualUpdatedAt?: boolean }
  ) => {
    added: number;
    updated: number;
    total: number;
  };
}

export const TrackerContext = createContext<TrackerContextValue | undefined>(
  undefined
);
