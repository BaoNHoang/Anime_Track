import { expect, it } from "vitest";
import { watchCalendar } from "./calendar";
import type { TrackedAnime } from "../tracker/types";
const item: TrackedAnime = {
  anime: { id: 1, title: "Example", status: "Currently Airing", type: "TV", imageUrl: "",
    largeImageUrl: "", synopsis: "", genres: [], studios: [], url: "",
    startDate: "2026-09-10T00:00:00Z",
    broadcast: { day: "Thursdays", time: "22:00", timezone: "Asia/Tokyo" } },
  status: "watching", progress: 0, notes: "", addedAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z"
};
it("shows timezone-correct broadcasts after premiere and excludes dropped titles", () => {
  const events = watchCalendar([item, { ...item, status: "dropped" }],
    new Date("2026-09-01T00:00:00Z"), new Date("2026-09-20T00:00:00Z"));
  expect(events.map((event) => event.at.toISOString())).toEqual(["2026-09-10T13:00:00.000Z", "2026-09-17T13:00:00.000Z"]);
});
