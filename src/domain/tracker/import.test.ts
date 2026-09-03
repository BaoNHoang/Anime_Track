import { describe, expect, it } from "vitest";
import { LibraryImportError, parseLibraryImport } from "./import";

const item = {
  anime: {
    id: 1,
    title: "Test",
    imageUrl: "",
    largeImageUrl: "",
    synopsis: "",
    status: "Finished Airing",
    type: "TV",
    genres: [],
    studios: [],
    url: ""
  },
  status: "completed",
  progress: 12,
  notes: "",
  addedAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z"
};

describe("parseLibraryImport", () => {
  it("accepts the Banime export wrapper", () => {
    expect(parseLibraryImport({ app: "Banime", items: [item] })).toHaveLength(
      1
    );
  });

  it("rejects malformed tracker data", () => {
    expect(() =>
      parseLibraryImport({ items: [{ ...item, status: "invalid" }] })
    ).toThrow(LibraryImportError);
  });

  it("rejects unsafe URLs and control characters", () => {
    expect(() =>
      parseLibraryImport({
        items: [
          {
            ...item,
            anime: { ...item.anime, url: "javascript:alert(1)" }
          }
        ]
      })
    ).toThrow("valid HTTPS URL");

    expect(() =>
      parseLibraryImport({
        items: [{ ...item, notes: "hidden\u0000text" }]
      })
    ).toThrow(LibraryImportError);
  });

  it("rejects oversized imports", () => {
    expect(() =>
      parseLibraryImport({
        items: Array.from({ length: 5001 }, () => item)
      })
    ).toThrow("cannot contain more than 5000 items");
  });

  it("validates and preserves episode history", () => {
    const [parsed] = parseLibraryImport({
      items: [{
        ...item,
        progress: 2,
        episodeHistory: [
          { episode: 1, watchedAt: "2026-08-27" },
          { episode: 3 }
        ]
      }]
    });
    expect(parsed.progress).toBe(2);
    expect(parsed.episodeHistory).toEqual([
      { episode: 1, watchedAt: "2026-08-27" },
      { episode: 3 }
    ]);

    expect(() =>
      parseLibraryImport({
        items: [{ ...item, episodeHistory: [{ episode: 1, watchedAt: "soon" }] }]
      })
    ).toThrow("invalid episode history");
  });

  it("validates and preserves release notification preferences", () => {
    const [parsed] = parseLibraryImport({
      items: [{ ...item, releaseNotificationMode: "finale_only" }]
    });
    expect(parsed.releaseNotificationMode).toBe("finale_only");

    expect(() => parseLibraryImport({
      items: [{ ...item, releaseNotificationMode: "sometimes" }]
    })).toThrow("invalid release notification preference");
  });
});
