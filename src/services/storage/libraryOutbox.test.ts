import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { TrackedAnime } from "../../domain/tracker/types";
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), remove: vi.fn() }));
vi.mock("../supabase/trackerCloudRepository", () => ({ trackerCloudRepository: mocks }));
import { libraryOutbox } from "./libraryOutbox";
const item: TrackedAnime = {
  anime: { id: 1, title: "Example", imageUrl: "", largeImageUrl: "", synopsis: "", status: "Currently Airing",
    type: "TV", genres: [], studios: [], url: "" },
  status: "watching", progress: 1, notes: "", addedAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z"
};
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  });
  vi.stubGlobal("navigator", { onLine: true });
  mocks.upsert.mockReset(); mocks.remove.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
it("keeps account edits and deletions isolated and restores them over server data", () => {
  libraryOutbox.record("a", [], [item]);
  expect(libraryOutbox.overlay("b", [])).toEqual([]);
  expect(libraryOutbox.overlay("a", [])[0]).toMatchObject(item);
  libraryOutbox.record("a", [item], []);
  expect(libraryOutbox.overlay("a", [item])).toEqual([]);
});
it("retains failed writes and retries only for the matching account", async () => {
  libraryOutbox.record("a", [], [item]);
  mocks.upsert.mockRejectedValueOnce(new Error("Offline"));
  await expect(libraryOutbox.flush("a", () => true)).rejects.toThrow("Offline");
  expect(libraryOutbox.overlay("a", [])).toHaveLength(1);
  await expect(libraryOutbox.flush("a", () => false)).rejects.toThrow();
  expect(mocks.upsert).toHaveBeenCalledTimes(1);
  mocks.upsert.mockResolvedValue(undefined);
  await libraryOutbox.flush("a", () => true);
  expect(libraryOutbox.overlay("a", [])).toEqual([]);
});
