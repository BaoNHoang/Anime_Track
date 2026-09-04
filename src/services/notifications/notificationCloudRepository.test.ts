import { afterEach, describe, expect, it, vi } from "vitest";
import { notificationCloudRepository } from "./notificationCloudRepository";

describe("notification cloud repository", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("synchronizes messages through the owner-bound API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [],
      seenSeasonIds: []
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }));
    vi.stubGlobal("fetch", fetchMock);

    await notificationCloudRepository.sync(
      "2026-08-30T12:01:00.000Z",
      [],
      [],
      [],
      "user-a"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications",
      expect.objectContaining({
        method: "PUT",
        credentials: "same-origin",
        headers: expect.objectContaining({ "X-Banime-User": "user-a" })
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      seenSeasonIds: [],
      removedNotificationIds: []
    });
  });

  it("encodes the message ID when clearing one notification", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ notifications: [], seenSeasonIds: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));
    vi.stubGlobal("fetch", fetchMock);

    await notificationCloudRepository.remove(
      "42:2026-08-30T12:00:00.000Z",
      "user-a"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications?id=42%3A2026-08-30T12%3A00%3A00.000Z",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
