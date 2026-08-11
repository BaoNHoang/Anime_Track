import { describe, expect, it } from "vitest";
import {
  escapePostgresLikePattern,
  hasUnsafeControlCharacters,
  safeExternalUrl,
  safeAnimeImageUrl,
  safeMyAnimeListAnimeUrl,
  safeMyAnimeListNewsUrl,
  safeTrailerUrl,
  truncateExternalText
} from "./validation";

describe("security validation", () => {
  it("only accepts credential-free HTTPS external URLs", () => {
    expect(safeExternalUrl("https://example.com/anime")).toBe(
      "https://example.com/anime"
    );
    expect(safeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(
      safeExternalUrl("https://user:password@example.com")
    ).toBeUndefined();
  });

  it("allows only trusted hosts for catalog links and media", () => {
    expect(safeMyAnimeListAnimeUrl("https://myanimelist.net/anime/1")).toBeTruthy();
    expect(safeMyAnimeListAnimeUrl("https://phishing.example/anime/1")).toBeUndefined();
    expect(safeMyAnimeListAnimeUrl("https://myanimelist.net/redirect")).toBeUndefined();
    expect(safeMyAnimeListNewsUrl("https://myanimelist.net/news/42")).toBeTruthy();
    expect(safeAnimeImageUrl("https://cdn.myanimelist.net/images/a.jpg")).toBeTruthy();
    expect(safeAnimeImageUrl("https://tracker.example/pixel.gif")).toBeUndefined();
    expect(safeTrailerUrl("https://www.youtube.com/watch?v=abc")).toBeTruthy();
    expect(safeTrailerUrl("https://video.example/watch/abc")).toBeUndefined();
  });

  it("detects or removes unsafe control and direction characters", () => {
    expect(hasUnsafeControlCharacters("safe text")).toBe(false);
    expect(hasUnsafeControlCharacters("unsafe\u0000text")).toBe(true);
    expect(truncateExternalText("a\u202Eb", 10)).toBe("ab");
    expect(truncateExternalText("123456789", 8)).toBe("12345...");
  });

  it("escapes wildcard characters used by ILIKE", () => {
    expect(escapePostgresLikePattern("100%_match\\test")).toBe(
      "100\\%\\_match\\\\test"
    );
  });
});
