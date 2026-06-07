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
});
