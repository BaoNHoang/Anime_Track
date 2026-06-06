import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { Anime } from "../domain/anime/types";
import { calculateTrackerStats } from "../domain/tracker/stats";
import type {
  TrackedAnime,
  TrackingStatus
} from "../domain/tracker/types";
import { trackerRepository } from "../services/storage/trackerRepository";

interface TrackerContextValue {
  items: TrackedAnime[];
  stats: ReturnType<typeof calculateTrackerStats>;
  getTracked: (animeId: number) => TrackedAnime | undefined;
  addAnime: (anime: Anime, status?: TrackingStatus) => void;
  updateAnime: (
    animeId: number,
    updates: Partial<
      Pick<TrackedAnime, "status" | "progress" | "userScore" | "notes">
    >
  ) => void;
  removeAnime: (animeId: number) => void;
}

const TrackerContext = createContext<TrackerContextValue | undefined>(
  undefined
);

export function TrackerProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState(() => trackerRepository.getAll());

  const commit = useCallback((update: (current: TrackedAnime[]) => TrackedAnime[]) => {
    setItems((current) => {
      const next = update(current);
      trackerRepository.save(next);
      return next;
    });
  }, []);

  const addAnime = useCallback(
    (anime: Anime, status: TrackingStatus = "plan_to_watch") => {
      commit((current) => {
        if (current.some((item) => item.anime.id === anime.id)) {
          return current;
        }
        return [trackerRepository.create(anime, status), ...current];
      });
    },
    [commit]
  );

  const updateAnime = useCallback(
    (
      animeId: number,
      updates: Partial<
        Pick<TrackedAnime, "status" | "progress" | "userScore" | "notes">
      >
    ) => {
      commit((current) =>
        current.map((item) => {
          if (item.anime.id !== animeId) return item;
          const progress = Math.max(
            0,
            Math.min(
              updates.progress ?? item.progress,
              item.anime.episodes ?? Number.MAX_SAFE_INTEGER
            )
          );
          return {
            ...item,
            ...updates,
            progress,
            updatedAt: new Date().toISOString()
          };
        })
      );
    },
    [commit]
  );

  const removeAnime = useCallback(
    (animeId: number) => {
      commit((current) =>
        current.filter((item) => item.anime.id !== animeId)
      );
    },
    [commit]
  );

  const value = useMemo<TrackerContextValue>(
    () => ({
      items,
      stats: calculateTrackerStats(items),
      getTracked: (animeId) =>
        items.find((item) => item.anime.id === animeId),
      addAnime,
      updateAnime,
      removeAnime
    }),
    [addAnime, items, removeAnime, updateAnime]
  );

  return (
    <TrackerContext.Provider value={value}>
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const context = useContext(TrackerContext);
  if (!context) {
    throw new Error("useTracker must be used inside TrackerProvider");
  }
  return context;
}
