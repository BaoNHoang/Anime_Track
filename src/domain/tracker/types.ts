import type { Anime } from "../anime/types.js";

export const TRACKING_STATUSES = [
  "watching",
  "completed",
  "on_hold",
  "dropped",
  "plan_to_watch"
] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export const RELEASE_NOTIFICATION_MODES = [
  "every_episode",
  "finale_only",
  "dubbed_only"
] as const;

export type ReleaseNotificationMode =
  (typeof RELEASE_NOTIFICATION_MODES)[number];

export const RELEASE_NOTIFICATION_LABELS: Record<
  ReleaseNotificationMode,
  string
> = {
  every_episode: "Every episode",
  finale_only: "Finale only",
  dubbed_only: "Dubbed releases only"
};

export interface EpisodeWatch {
  episode: number;
  watchedAt?: string;
}

export interface TrackedAnime {
  anime: Anime;
  status: TrackingStatus;
  progress: number;
  episodeHistory?: EpisodeWatch[];
  releaseNotificationMode?: ReleaseNotificationMode;
  userScore?: number;
  notes: string;
  customLists?: string[];
  addedAt: string;
  updatedAt: string;
}

export interface TrackerStats {
  total: number;
  watching: number;
  completed: number;
  episodesWatched: number;
  daysWatched: number;
  averageScore?: number;
}

export const STATUS_LABELS: Record<TrackingStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
  plan_to_watch: "Plan to watch"
};
