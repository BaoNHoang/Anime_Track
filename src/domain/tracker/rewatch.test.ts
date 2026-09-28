import { describe, expect, it } from "vitest";
import type { TrackedAnime } from "./types";
import { startRewatch } from "./rewatch";
import { parseLibraryImport } from "./import";
import { calculateTrackerStats } from "./stats";
import { availableReviewYears, createYearInReview } from "./yearInReview";
import { updateEpisodeHistory } from "./episodes";
import { undoEpisodeUpdate } from "./undoEpisode";

const completed: TrackedAnime = {
  anime: { id: 1, title: "Test", imageUrl: "", largeImageUrl: "", synopsis: "", status: "Finished Airing", type: "TV", episodes: 2, genres: [], studios: [], url: "" },
  status: "completed", progress: 2, notes: "Keep this", userScore: 9, customLists: ["Favorites"],
  episodeHistory: [{ episode: 1, watchedAt: "2025-12-01" }, { episode: 2, watchedAt: "2025-12-02" }],
  completedAt: "2025-12-02T12:00:00Z", addedAt: "2025-12-01T12:00:00Z", updatedAt: "2026-01-01T12:00:00Z"
};

describe("rewatch and episode undo", () => {
  it("archives a completion and keeps dates, ratings, notes, and list membership through a backup round trip", () => {
    const next = startRewatch(completed, "2026-01-02T12:00:00Z");
    expect(next).toMatchObject({ status: "watching", progress: 0, episodeHistory: [], notes: "Keep this", userScore: 9, customLists: ["Favorites"] });
    expect(next.completedAt).toBeUndefined();
    expect(next.previousWatches).toEqual([{ completedAt: completed.completedAt, progress: 2, episodeHistory: completed.episodeHistory }]);
    expect(parseLibraryImport(JSON.parse(JSON.stringify([next])))[0]).toEqual(next);
    expect(completed.progress).toBe(2);
    expect(completed.episodeHistory![0].watchedAt).toBe("2025-12-01");
  });

  it("supports multiple rewatches and retains lifetime and annual totals", () => {
    const rewatch = startRewatch(completed, "2026-01-02T12:00:00Z");
    const finished = { ...rewatch, ...updateEpisodeHistory({ ...rewatch, ...updateEpisodeHistory(rewatch, 1, true, "2026-01-03") }, 2, true, "2026-01-04"), completedAt: "2026-01-04T12:00:00Z" };
    const thirdWatch = startRewatch(finished);
    expect(thirdWatch.previousWatches).toHaveLength(2);
    expect(calculateTrackerStats([thirdWatch])).toMatchObject({ completed: 1, episodesWatched: 4 });
    expect(availableReviewYears([thirdWatch], 2026)).toEqual([2026, 2025]);
    expect(createYearInReview([thirdWatch], 2025)).toMatchObject({ completedTitles: 1, episodesWatched: 2 });
    expect(createYearInReview([thirdWatch], 2026)).toMatchObject({ completedTitles: 1, episodesWatched: 2 });
  });

  it("rejects an unfinished watch and malformed archived history", () => {
    expect(() => startRewatch({ ...completed, status: "watching" })).toThrow("Complete this watch");
    expect(() => parseLibraryImport([{ ...completed, previousWatches: [{ completedAt: "yesterday", progress: 2 }] }])).toThrow("invalid previous watches");
    expect(() => parseLibraryImport([{ ...completed, previousWatches: [{ completedAt: completed.completedAt, progress: 2, episodeHistory: [{ episode: 1 }] }] }])).toThrow("inconsistent previous watch progress");
    expect(() => startRewatch({ ...completed, previousWatches: Array.from({ length: 50 }, () => ({ completedAt: completed.updatedAt, progress: 2 })) })).toThrow("50 previous watches");
  });

  it("undoes a finale with its status and watch date without undoing a later note edit", () => {
    const before = { ...completed, status: "watching" as const, progress: 1, completedAt: undefined, episodeHistory: [{ episode: 1, watchedAt: "2025-12-01" }] };
    const after = { ...before, ...updateEpisodeHistory(before, 2, true, "2025-12-02"), completedAt: "2025-12-02T12:00:00Z" };
    const current = { ...after, notes: "A later note" };
    const undo = undoEpisodeUpdate(current, before, after);
    expect({ ...current, ...undo }).toMatchObject({ status: "watching", progress: 1, notes: "A later note", episodeHistory: before.episodeHistory });
    expect(undo?.completedAt).toBeUndefined();
    expect(undoEpisodeUpdate(startRewatch(after), before, after)).toBeUndefined();
    expect(undoEpisodeUpdate({ ...after, progress: 0 }, before, after)).toBeUndefined();
  });
});
