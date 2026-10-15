import { afterEach, describe, expect, it, vi } from "vitest";
import { mapHistory } from "./mapHistory";
import type { Anime } from "../../domain/anime/types";

afterEach(() => vi.unstubAllGlobals());

describe("recent map trail", () => {
  it("keeps eight recent titles scoped to the current account", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
    for (let id = 1; id <= 10; id += 1) mapHistory.add("a", { id, title: `Anime ${id}` } as Anime);
    expect(mapHistory.read("a").map((entry) => entry.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
    expect(mapHistory.read("b")).toEqual([]);
    mapHistory.add("a", { id: 7, title: "Anime 7" } as Anime);
    expect(mapHistory.read("a")[0].id).toBe(7);
    mapHistory.clear("a");
    expect(mapHistory.read("a")).toEqual([]);
  });
});
