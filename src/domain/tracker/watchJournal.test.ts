import { describe, expect, it } from "vitest";
import type { TrackedAnime } from "./types";
import { createWatchJournal } from "./watchJournal";

const anime: TrackedAnime["anime"] = {
  id: 1, title: "Test anime", imageUrl: "", largeImageUrl: "", synopsis: "",
  status: "Finished Airing", type: "TV", genres: [], studios: [], url: ""
};

const item: TrackedAnime = {
  anime, status: "watching", progress: 1, notes: "", addedAt: "2025-01-01",
  updatedAt: "2026-10-19T15:00:00Z",
  previousWatches: [{
    progress: 2, completedAt: "2025-10-19T12:00:00Z",
    episodeHistory: [{ episode: 1, watchedAt: "2025-10-17" }, { episode: 2, watchedAt: "2025-10-19" }]
  }],
  episodeHistory: [{ episode: 1, watchedAt: "2026-10-18" }]
};

describe("createWatchJournal", () => {
  it("includes dated episodes and original completion from archived watches", () => {
    expect(createWatchJournal([item]).map(({ kind, episode, rewatch, day }) => ({ kind, episode, rewatch, day })))
      .toEqual([
        { kind: "episode", episode: 1, rewatch: 1, day: "2026-10-18" },
        { kind: "completion", episode: undefined, rewatch: 0, day: "2025-10-19" },
        { kind: "episode", episode: 2, rewatch: 0, day: "2025-10-19" },
        { kind: "episode", episode: 1, rewatch: 0, day: "2025-10-17" }
      ]);
  });

  it("does not invent events from an edit timestamp or undated progress", () => {
    expect(createWatchJournal([{ ...item, previousWatches: [], episodeHistory: [{ episode: 1 }] }])).toEqual([]);
  });

  it("keeps only the newest eight dated events", () => {
    const many = { ...item, previousWatches: [], episodeHistory: Array.from({ length: 12 }, (_, index) => ({ episode: index + 1, watchedAt: `2026-10-${String(index + 1).padStart(2, "0")}` })) };
    const events = createWatchJournal([many]);
    expect(events).toHaveLength(8);
    expect(events[0].episode).toBe(12);
    expect(events.at(-1)?.episode).toBe(5);
  });
});
