import type { Anime } from "../anime/types";

export const TRACKING_STATUSES = [
  "watching",
  "completed",
  "on_hold",
  "dropped",
  "plan_to_watch"
] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export interface TrackedAnime {
  anime: Anime;
  status: TrackingStatus;
  progress: number;
  userScore?: number;
  notes: string;
  addedAt: string;
  updatedAt: string;
}

export interface TrackerStats {
  total: number;
  watching: number;
  completed: number;
  episodesWatched: number;
  averageScore?: number;
}

export const STATUS_LABELS: Record<TrackingStatus, string> = {
  watching: "Watching",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
  plan_to_watch: "Plan to watch"
};
