import { describe, expect, it } from "vitest";
import { exportLibraryCsv, parseLibraryCsv } from "./csv";
import type { TrackedAnime } from "./types";
const item: TrackedAnime = {
  anime: { id: 1, title: '=Test, "quoted"', imageUrl: "", largeImageUrl: "", synopsis: "",
    status: "Currently Airing", type: "TV", genres: [], studios: [], url: "" },
  status: "watching", progress: 1, episodeHistory: [{ episode: 3, watchedAt: "2026-09-01" }],
  customLists: ["Weekend"], notes: "Line one\nLine two",
  addedAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z"
};
describe("CSV backup", () => {
  it("round trips lists, watch history, quotes and newlines while escaping formula cells", () => {
    const text = exportLibraryCsv([item]);
    expect(text).toContain("'=Test");
    expect(parseLibraryCsv(text)[0]).toMatchObject(item);
  });
  it("rejects malformed CSV and invalid records", () => {
    expect(() => parseLibraryCsv('"record_json')).toThrow();
    expect(() => parseLibraryCsv("record_json\n{}")).toThrow();
  });
});
