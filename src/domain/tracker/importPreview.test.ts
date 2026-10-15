import { describe, expect, it } from "vitest";
import { previewLibraryImport } from "./importPreview";
import type { TrackedAnime } from "./types";

const entry = (id: number, updatedAt: string) => ({
  anime: { id, title: `Anime ${id}` }, updatedAt
} as TrackedAnime);

describe("library import preview", () => {
  it("reports new, newer, and unchanged entries before applying an import", () => {
    const preview = previewLibraryImport(
      [entry(1, "2026-10-01"), entry(2, "2026-10-03")],
      [entry(1, "2026-10-02"), entry(2, "2026-10-02"), entry(3, "2026-10-01")]
    );
    expect(preview).toEqual({
      added: 1, updated: 1, unchanged: 1, total: 3,
      examples: ["Anime 1", "Anime 3"]
    });
  });
});
