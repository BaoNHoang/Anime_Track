import { describe, expect, it } from "vitest";
import type { ReleaseNotification } from "../notifications/releaseNotifications";
import type { TrackedAnime } from "./types";
import { currentSeasonEpisodes } from "./currentSeasonEpisodes";

const now = new Date("2026-10-23T12:00:00Z");

function tracked(id: number, status: TrackedAnime["status"], season = "fall"): TrackedAnime {
  return {
    anime: {
      id, title: `Anime ${id}`, imageUrl: "", largeImageUrl: "", synopsis: "",
      status: "Currently Airing", type: "TV", genres: [], studios: [], url: "",
      season, year: 2026
    },
    status, progress: 1, notes: "", addedAt: "2026-10-01", updatedAt: "2026-10-22"
  };
}

function release(animeId: number, releasedAt = "2026-10-22T12:00:00Z"): ReleaseNotification {
  return {
    id: `${animeId}:${releasedAt}`, kind: "episode", animeId, title: `Anime ${animeId}`,
    imageUrl: "", releasedAt, trackingStatus: "watching", episodeNumber: 3
  };
}

describe("currentSeasonEpisodes", () => {
  it("keeps only released episodes for current-season titles being watched", () => {
    expect(currentSeasonEpisodes(
      [release(1), release(2), release(3), release(4, "2026-10-24T12:00:00Z"),
        { ...release(1), id: "season", kind: "season" }],
      [tracked(1, "watching"), tracked(2, "plan_to_watch"),
        tracked(3, "watching", "summer"), tracked(4, "watching")],
      now
    ).map((episode) => episode.animeId)).toEqual([1]);
  });

  it("uses a premiere date when season metadata is missing", () => {
    const item = tracked(5, "watching");
    item.anime.season = undefined;
    item.anime.year = undefined;
    item.anime.startDate = "2026-10-05T00:00:00Z";
    expect(currentSeasonEpisodes([release(5)], [item], now)).toHaveLength(1);
  });
});
