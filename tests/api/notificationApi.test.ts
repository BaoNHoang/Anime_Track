import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest } from "../../api/_lib/http";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));

vi.mock("../../api/_lib/supabase.js", () => ({
  authenticateRequest: mocks.authenticateRequest
}));

import notificationHandler from "../../api/notifications/index";

function response() {
  const headers = new Map<string, string | string[]>();
  let statusCode = 200;
  let body = "";
  return {
    get statusCode() { return statusCode; },
    set statusCode(value: number) { statusCode = value; },
    get body() { return body; },
    getHeader: (name: string) => headers.get(name),
    setHeader: (name: string, value: string | string[]) => headers.set(name, value),
    end: (value?: string) => { body = value ?? ""; }
  };
}

function client() {
  const notificationLimit = vi.fn().mockResolvedValue({
    data: [{
      notification_id: "42:episode:6",
      notification_type: "episode",
      anime_id: 42,
      title: "Release Test",
      image_url: "",
      released_at: "2026-08-30T12:00:00.000Z",
      tracking_status: "watching",
      episode_number: 6,
      source_anime_id: null,
      source_title: null,
      premiere_at: null
    }],
    error: null
  });
  const notificationOrder = vi.fn().mockReturnValue({ limit: notificationLimit });
  const notificationEq = vi.fn().mockReturnValue({ order: notificationOrder });
  const cursorMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      last_checked_at: "2026-08-30T12:01:00.000Z",
      seen_season_ids: [84]
    },
    error: null
  });
  const cursorEq = vi.fn().mockReturnValue({ maybeSingle: cursorMaybeSingle });
  const notificationUpsert = vi.fn().mockResolvedValue({ error: null });
  const notificationDeleteIn = vi.fn().mockResolvedValue({ error: null });
  const notificationDeleteEq = vi.fn().mockReturnValue({ in: notificationDeleteIn });
  const cursorUpsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => table === "release_notifications"
    ? {
        select: vi.fn().mockReturnValue({ eq: notificationEq }),
        upsert: notificationUpsert,
        delete: vi.fn().mockReturnValue({ eq: notificationDeleteEq })
      }
    : {
        select: vi.fn().mockReturnValue({ eq: cursorEq }),
        upsert: cursorUpsert
      });
  return {
    from,
    notificationEq,
    notificationUpsert,
    notificationDeleteIn,
    cursorUpsert
  };
}

describe("private notification API", () => {
  beforeEach(() => mocks.authenticateRequest.mockReset());

  it("loads only the authenticated user's inbox", async () => {
    const database = client();
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "user-a" },
      client: database
    });
    const result = response();

    await notificationHandler(
      { method: "GET", headers: {} } as ApiRequest,
      result as never
    );

    expect(database.notificationEq).toHaveBeenCalledWith("user_id", "user-a");
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).notifications[0]).toMatchObject({ animeId: 42 });
  });

  it("writes messages and the cursor for the authenticated user", async () => {
    const database = client();
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "user-a" },
      client: database
    });
    const result = response();

    await notificationHandler({
      method: "PUT",
      headers: {
        origin: "http://localhost:5173",
        "content-type": "application/json",
        "x-banime-user": "user-a"
      },
      body: {
        lastCheckedAt: "2026-08-30T12:01:00.000Z",
        seenSeasonIds: [84],
        removedNotificationIds: [],
        notifications: [{
          id: "42:episode:6",
          kind: "episode",
          animeId: 42,
          title: "Release Test",
          imageUrl: "",
          releasedAt: "2026-08-30T12:00:00.000Z",
          trackingStatus: "watching",
          episodeNumber: 6
        }]
      }
    } as unknown as ApiRequest, result as never);

    expect(database.notificationUpsert).toHaveBeenCalledWith(
      [expect.objectContaining({ user_id: "user-a", anime_id: 42 })],
      { onConflict: "user_id,notification_id" }
    );
    expect(database.cursorUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-a" }),
      { onConflict: "user_id" }
    );
    expect(result.statusCode).toBe(200);
  });

  it("deletes cloud messages omitted from the synchronized inbox", async () => {
    const database = client();
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "user-a" },
      client: database
    });
    const result = response();

    await notificationHandler({
      method: "PUT",
      headers: {
        origin: "http://localhost:5173",
        "content-type": "application/json",
        "x-banime-user": "user-a"
      },
      body: {
        lastCheckedAt: "2026-08-30T12:01:00.000Z",
        notifications: [],
        seenSeasonIds: [84],
        removedNotificationIds: ["42:episode:6"]
      }
    } as unknown as ApiRequest, result as never);

    expect(database.notificationDeleteIn).toHaveBeenCalledWith(
      "notification_id",
      ["42:episode:6"]
    );
    expect(result.statusCode).toBe(200);
  });
});
