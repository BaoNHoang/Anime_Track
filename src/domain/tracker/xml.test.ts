import { describe, expect, it } from "vitest";
import { LibraryImportError } from "./import";
import { parseMyAnimeListXml } from "./xml";

describe("MyAnimeList XML import", () => {
  it("imports MyAnimeList XML exports", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<myanimelist>
  <anime>
    <series_animedb_id>5114</series_animedb_id>
    <series_title>Fullmetal Alchemist: Brotherhood</series_title>
    <series_type>TV</series_type>
    <series_episodes>64</series_episodes>
    <my_watched_episodes>40</my_watched_episodes>
    <my_start_date>2026-01-02</my_start_date>
    <my_finish_date>0000-00-00</my_finish_date>
    <my_score>9</my_score>
    <my_status>Watching</my_status>
    <my_comments>Good so far.</my_comments>
    <my_tags>favorite</my_tags>
    <my_last_updated>1780000000</my_last_updated>
  </anime>
</myanimelist>`;

    const [parsed] = parseMyAnimeListXml(xml);

    expect(parsed).toMatchObject({
      status: "watching",
      progress: 40,
      userScore: 9,
      notes: "Good so far.\n\nTags: favorite",
      anime: {
        id: 5114,
        title: "Fullmetal Alchemist: Brotherhood",
        type: "TV",
        episodes: 64,
        imageUrl: "",
        url: "https://myanimelist.net/anime/5114"
      }
    });
  });

  it("keeps MAL progress when total episodes are unknown", () => {
    const [parsed] = parseMyAnimeListXml(`<myanimelist>
  <anime>
    <series_animedb_id>21</series_animedb_id>
    <series_title>One Piece</series_title>
    <series_type>TV</series_type>
    <series_episodes>0</series_episodes>
    <my_watched_episodes>1100</my_watched_episodes>
    <my_score>0</my_score>
    <my_status>Watching</my_status>
  </anime>
</myanimelist>`);

    expect(parsed.progress).toBe(1100);
    expect(parsed.anime.episodes).toBeUndefined();
    expect(parsed.userScore).toBeUndefined();
  });

  it("rejects XML entity declarations", () => {
    expect(() =>
      parseMyAnimeListXml(`<?xml version="1.0"?><!DOCTYPE data [
        <!ENTITY secret SYSTEM "file:///etc/passwd">
      ]><myanimelist />`)
    ).toThrow(LibraryImportError);
  });

  it("rejects non-MyAnimeList XML", () => {
    expect(() => parseMyAnimeListXml("<banime-library />")).toThrow(
      "MyAnimeList XML export"
    );
  });
});
