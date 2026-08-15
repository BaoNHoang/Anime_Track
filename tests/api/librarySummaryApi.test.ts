import { describe, expect, it, vi } from "vitest";
import type { ApiRequest } from "../../api/_lib/http";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn()
}));

vi.mock("../../api/_lib/supabase.js", () => ({
  authenticateRequest: mocks.authenticateRequest
}));

import summaryHandler from "../../api/library/summary";

function response() {
  const headers = new Map<string, string | string[]>();
  let statusCode = 200;
  let body = "";
  return {
    get statusCode() {
      return statusCode;
    },
    set statusCode(value: number) {
      statusCode = value;
    },
    get body() {
      return body;
    },
    getHeader: (name: string) => headers.get(name),
    setHeader: (name: string, value: string | string[]) =>
      headers.set(name, value),
    end: (value?: string) => {
      body = value ?? "";
    }
  };
}

describe("library profile summary API", () => {
  it("returns compact stats, recent activity, genres, and tracked airing items", async () => {
    const trackedItem = {
      anime: {
        id: 42,
        title: "Summary Test",
        genres: ["Action"],
        status: "Currently Airing"
      },
      status: "watching",
      progress: 3,
      updatedAt: "2026-08-15T12:00:00.000Z"
    };
    let itemQuery = 0;
    const select = vi.fn((columns: string) => {
      if (columns.startsWith("tracking_status")) {
        return {
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    tracking_status: "watching",
                    user_score: 8,
                    progress: 3,
                    duration: "24 min",
                    genres: ["Action", "Drama"]
                  }
                ],
                error: null
              })
            })
          })
        };
      }

      itemQuery += 1;
      if (itemQuery === 1) {
        return {
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ item: trackedItem }],
                  error: null
                })
              })
            })
          })
        };
      }
      return {
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ item: trackedItem }],
                  error: null
                })
              })
            })
          })
        })
      };
    });
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "user-a" },
      client: { from: vi.fn().mockReturnValue({ select }) }
    });
    const result = response();

    await summaryHandler(
      { method: "GET", headers: {} } as ApiRequest,
      result as never
    );

    const body = JSON.parse(result.body);
    expect(result.statusCode).toBe(200);
    expect(body.summary.stats).toMatchObject({
      total: 1,
      watching: 1,
      episodesWatched: 3,
      averageScore: 8
    });
    expect(body.summary.favoriteGenres).toEqual([
      { genre: "Action", count: 1 },
      { genre: "Drama", count: 1 }
    ]);
    expect(body.summary.recentItems).toEqual([trackedItem]);
    expect(body.summary.airingItems).toEqual([trackedItem]);
  });
});
