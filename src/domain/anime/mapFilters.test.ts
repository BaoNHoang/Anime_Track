import { describe, expect, it } from "vitest";
import { filterMapCatalog } from "./mapFilters";
import type { Anime } from "./types";
import type { TrackedAnime } from "../tracker/types";

const anime = (id: number) => ({ id } as Anime);
const tracked = (id: number, progress: number, status: TrackedAnime["status"]): TrackedAnime =>
  ({ anime: anime(id), progress, status } as TrackedAnime);

describe("map catalog filters", () => {
  const catalog = [anime(1), anime(2), anime(3)];
  const library = [tracked(1, 3, "watching"), tracked(2, 0, "plan_to_watch")];

  it("excludes every library entry in not-in-library mode", () => {
    expect(filterMapCatalog(catalog, library, "untracked").map((item) => item.id)).toEqual([3]);
  });

  it("keeps planned but unwatched titles in unwatched mode", () => {
    expect(filterMapCatalog(catalog, library, "unwatched").map((item) => item.id)).toEqual([2, 3]);
  });
});
