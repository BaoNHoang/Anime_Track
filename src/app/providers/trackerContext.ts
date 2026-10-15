import { createContext } from "react";
import type { Anime } from "../../domain/anime/types";
import type { ProfileSummary } from "../../domain/tracker/profileSummary";
import type { ImportPreview } from "../../domain/tracker/importPreview";
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
  refreshLibrary: () => Promise<boolean>;
  getTracked: (animeId: number) => TrackedAnime | undefined;
  addAnime: (anime: Anime, status?: TrackingStatus) => void;
  updateAnime: (
    animeId: number,
    updates: Partial<
      Pick<TrackedAnime, "status" | "progress" | "episodeHistory" | "releaseNotificationMode" | "userScore" | "notes" | "customLists">
    >
  ) => boolean;
  setEpisodeWatched: (
    animeId: number,
    episode: number,
    watched: boolean,
    watchedAt?: string
  ) => void;
  startRewatch: (animeId: number) => void;
  episodeUndo?: { token: number; message: string };
  undoEpisode: () => void;
  dismissEpisodeUndo: () => void;
  removeAnime: (animeId: number) => void;
  importItems: (
    items: TrackedAnime[],
    options?: { replaceOnEqualUpdatedAt?: boolean; continueUndoToken?: number }
  ) => ImportPreview & { applied: boolean; undoToken?: number };
  undoImport: (token: number) => boolean;
}

export const TrackerContext = createContext<TrackerContextValue | undefined>(
  undefined
);
