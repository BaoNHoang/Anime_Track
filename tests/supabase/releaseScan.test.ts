import { describe, expect, it } from "vitest";
import {
  loadCompleteUserRows,
  nextSeasonBatch,
  nextTrackedUserId
} from "../../supabase/functions/_shared/releaseScan";

describe("release scan scheduling", () => {
  it("rotates by worker position, regardless of user-editable release dates", async () => {
    const users = ["a", "b", "c"];
    const findAfter = async (after: string | null) => users.find((user) => after === null || user > after);
    expect(await nextTrackedUserId(null, findAfter)).toBe("a");
    expect(await nextTrackedUserId("a", findAfter)).toBe("b");
    expect(await nextTrackedUserId("c", findAfter)).toBe("a");
  });

  it("loads all of a user's rows across stable keyset pages", async () => {
    const source = Array.from({ length: 2_501 }, (_, index) => ({ anime_id: index + 1 }));
    const rows = await loadCompleteUserRows(
      async (after, limit) => source.filter((row) => row.anime_id > after).slice(0, limit),
      1_000
    );
    expect(rows).toHaveLength(2_501);
    expect(rows.at(-1)?.anime_id).toBe(2_501);
  });

  it("reaches another account even after 10,000 earlier tracked rows", async () => {
    const libraries = new Map([
      ["a", Array.from({ length: 5_000 }, (_, index) => ({ anime_id: index + 1 }))],
      ["b", Array.from({ length: 5_000 }, (_, index) => ({ anime_id: index + 1 }))],
      ["c", [{ anime_id: 1 }]]
    ]);
    const userIds = [...libraries.keys()];
    const findAfter = async (after: string | null) =>
      userIds.find((userId) => after === null || userId > after);
    const scanned: string[] = [];
    let afterUserId: string | null = null;
    for (let run = 0; run < 3; run += 1) {
      const userId = await nextTrackedUserId(afterUserId, findAfter);
      expect(userId).toBeDefined();
      const rows = await loadCompleteUserRows(
        async (after, limit) => libraries.get(userId!)!.filter((row) => row.anime_id > after).slice(0, limit)
      );
      expect(rows).toHaveLength(libraries.get(userId!)!.length);
      scanned.push(userId!);
      afterUserId = userId!;
    }
    expect(scanned).toEqual(["a", "b", "c"]);
  });

  it("rejects an oversized legacy library instead of advancing a partial scan", async () => {
    const source = Array.from({ length: 6 }, (_, index) => ({ anime_id: index + 1 }));
    await expect(loadCompleteUserRows(
      async (after, limit) => source.filter((row) => row.anime_id > after).slice(0, limit),
      2,
      5
    )).rejects.toThrow("exceeds the safe scan limit");
  });

  it("rejects a page that repeats an earlier key", async () => {
    await expect(loadCompleteUserRows(
      async () => [{ anime_id: 1 }],
      1,
      2
    )).rejects.toThrow("did not advance in key order");
  });

  it("checks every sequel source across sparse account visits", () => {
    const sources = Array.from({ length: 4_998 }, (_, index) => index + 1);
    let offset = 0;
    const scanned = new Set<number>();
    // The account may be visited every other scheduled run. Its own position
    // must advance by three per visit, independent of that wall-clock cadence.
    for (let visit = 0; visit < sources.length / 3; visit += 1) {
      const selection = nextSeasonBatch(sources, offset);
      selection.batch.forEach((id) => scanned.add(id));
      offset = selection.nextOffset;
    }
    expect(scanned.size).toBe(sources.length);
    expect(offset).toBe(0);
  });
});
