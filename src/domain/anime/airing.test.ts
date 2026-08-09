import { describe, expect, it } from "vitest";
import type { Anime } from "./types";
import { formatPremiereDate, getNextAiringAt } from "./airing";

const anime: Anime = {
  id: 62568,
  title: "Dr. Stone: Science Future Part 3",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Currently Airing",
  type: "TV",
  broadcast: {
    day: "Thursdays",
    time: "22:00",
    timezone: "Asia/Tokyo"
  },
  genres: [],
  studios: [],
  url: ""
};

describe("getNextAiringAt", () => {
  it("converts the next weekly broadcast to UTC", () => {
    const now = new Date("2026-06-06T16:00:00.000Z");

    expect(getNextAiringAt(anime, now)?.toISOString()).toBe(
      "2026-06-11T13:00:00.000Z"
    );
  });
});

describe("formatPremiereDate", () => {
  it("falls back to the announced season when no exact date exists", () => {
    expect(
      formatPremiereDate({
        ...anime,
        status: "Not yet aired",
        broadcast: undefined,
        season: "fall",
        year: 2027
      })
    ).toBe("Fall 2027");
  });

  it("labels an unannounced premiere date clearly", () => {
    expect(
      formatPremiereDate({
        ...anime,
        status: "Not yet aired",
        broadcast: undefined
      })
    ).toBe("Date TBA");
  });
});
