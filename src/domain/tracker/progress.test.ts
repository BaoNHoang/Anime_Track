import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import { resolveTrackingProgress } from "./progress";
import type { TrackedAnime } from "./types";

const anime: Anime = {
  id: 1,
  title: "Test Anime",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Finished Airing",
  type: "TV",
  episodes: 12,
  genres: [],
  studios: [],
  url: ""
};

function tracked(
  progress: number,
  episodes: number | undefined
): TrackedAnime {
  return {
    anime: { ...anime, episodes },
    status: "watching",
    progress,
    notes: "",
    addedAt: "",
    updatedAt: ""
  };
}

describe("resolveTrackingProgress", () => {
  it("fills known episodes when a title is completed", () => {
    expect(
      resolveTrackingProgress(tracked(5, 12), { status: "completed" })
    ).toBe(12);
  });

  it("keeps progress when a completed title has no episode total", () => {
    expect(
      resolveTrackingProgress(tracked(5, undefined), {
        status: "completed"
      })
    ).toBe(5);
  });

  it("clamps manual progress to the known episode total", () => {
    expect(resolveTrackingProgress(tracked(5, 12), { progress: 20 })).toBe(
      12
    );
  });
});
