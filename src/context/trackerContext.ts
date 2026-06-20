import { createContext } from "react";
import type { Anime } from "../domain/anime/types";
import { calculateTrackerStats } from "../domain/tracker/stats";
import type {
  TrackedAnime,
  TrackingStatus
} from "../domain/tracker/types";

export interface TrackerContextValue {
  items: TrackedAnime[];
  stats: ReturnType<typeof calculateTrackerStats>;
  syncStatus: "local" | "syncing" | "synced" | "error";
  syncError?: string;
  getTracked: (animeId: number) => TrackedAnime | undefined;
  addAnime: (anime: Anime, status?: TrackingStatus) => void;
  updateAnime: (
    animeId: number,
    updates: Partial<
      Pick<TrackedAnime, "status" | "progress" | "userScore" | "notes">
    >
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
