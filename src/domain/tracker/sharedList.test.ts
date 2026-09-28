import { describe, expect, it } from "vitest";
import { parseSharedList, serializeSharedList } from "./sharedList";
import type { Anime } from "../anime/types";

const anime: Anime = { id: 1, title: "葬送のフリーレン", imageUrl: "https://cdn.myanimelist.net/images/anime/test.jpg", largeImageUrl: "", synopsis: "", status: "Finished Airing", type: "TV", genres: [], studios: [], url: "" };
const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("shared custom lists", () => {
  it("round trips Unicode names and titles while excluding personal tracking data", () => {
    const title = { ...anime, notes: "private", userScore: 9, episodeHistory: [{ episode: 1 }] };
    const encoded = serializeSharedList("My favorites ✨", [title]);
    const parsed = parseSharedList(`#${encoded}`);
    expect(parsed).toEqual({ version: 1, name: "My favorites ✨", titles: [{ id: anime.id, title: anime.title, imageUrl: anime.imageUrl }] });
    expect(JSON.stringify(parsed)).not.toContain("private");
    expect(JSON.stringify(parsed)).not.toContain("userScore");
    expect(JSON.stringify(parsed)).not.toContain("episodeHistory");
  });

  it("rejects malformed, oversized, and unsafe links before displaying a list", () => {
    expect(parseSharedList("#broken$$")).toBeUndefined();
    expect(parseSharedList("a".repeat(16001))).toBeUndefined();
    const title = { id: 1, title: "Test", imageUrl: "javascript:alert(1)" };
    expect(parseSharedList(encode({ version: 1, name: "Test", titles: [title] }))).toBeUndefined();
    expect(parseSharedList(encode({ version: 1, name: "Test", titles: [{ ...title, imageUrl: "https://phishing.example/pixel" }] }))).toBeUndefined();
    expect(parseSharedList(encode({ version: 1, name: "Test", titles: [{ ...title, id: -1, imageUrl: "" }] }))).toBeUndefined();
  });

  it("rejects empty lists, duplicate identifiers, and too many titles instead of silently truncating", () => {
    expect(() => serializeSharedList("Empty", [])).toThrow("1–100 titles");
    expect(() => serializeSharedList("Duplicates", [anime, anime])).toThrow("1–100 titles");
    expect(() => serializeSharedList("Large", Array.from({ length: 101 }, (_, index) => ({ ...anime, id: index + 1 })))).toThrow("1–100 titles");
  });
});
