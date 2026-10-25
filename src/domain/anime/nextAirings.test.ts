import { describe, expect, it } from "vitest";
import type { Anime } from "./types.js";
import { selectNextAirings } from "./nextAirings.js";

function airing(id: number, day: string): Anime {
  return {
    id, title: `Anime ${id}`, imageUrl: "", largeImageUrl: "", synopsis: "",
    status: "Currently Airing", type: "TV", genres: [], studios: [], url: "",
    broadcast: { day, time: "12:00", timezone: "UTC" }
  };
}

describe("selectNextAirings", () => {
  const items = [
    airing(1, "Mondays"), airing(2, "Tuesdays"), airing(3, "Wednesdays"),
    airing(4, "Thursdays"), airing(5, "Fridays"), airing(6, "Saturdays")
  ];

  it("shows only the next five broadcasts in time order", () => {
    expect(selectNextAirings(items, new Date("2026-10-26T11:00:00Z"))
      .map((entry) => entry.anime.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("moves a show behind later broadcasts once its slot has passed", () => {
    expect(selectNextAirings(items, new Date("2026-10-26T12:01:00Z"))
      .map((entry) => entry.anime.id)).toEqual([2, 3, 4, 5, 6]);
  });
});
