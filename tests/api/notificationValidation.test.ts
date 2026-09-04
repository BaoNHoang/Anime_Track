import { describe, expect, it } from "vitest";
import {
  notificationId,
  notificationSync
} from "../../api/_lib/notificationValidation";

const notification = {
  id: "42:episode:6",
  kind: "episode",
  animeId: 42,
  title: "Release Test",
  imageUrl: "https://cdn.example/release.webp",
  releasedAt: "2026-08-30T12:00:00.000Z",
  trackingStatus: "watching",
  episodeNumber: 6
};

describe("notification API validation", () => {
  it("accepts a bounded release sync payload", () => {
    expect(notificationSync({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [notification],
      seenSeasonIds: [84]
    })).toEqual({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [notification],
      seenSeasonIds: [84],
      removedNotificationIds: []
    });
  });

  it("rejects malformed identifiers and untrusted image protocols", () => {
    expect(() => notificationId("../../other-user")).toThrow();
    expect(() => notificationSync({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [{ ...notification, imageUrl: "javascript:alert(1)" }],
      seenSeasonIds: []
    })).toThrow("Notification image is invalid");
  });

  it("rejects an episode ID that does not match its anime and episode", () => {
    expect(() => notificationSync({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [{ ...notification, id: "42:episode:7" }],
      seenSeasonIds: []
    })).toThrow("Episode notification ID does not match");
  });

  it("accepts legacy clients without enabling exact inbox deletion", () => {
    const legacy = {
      ...notification,
      id: "42:2026-08-30T12:00:00.000Z",
      kind: undefined,
      episodeNumber: undefined
    };
    expect(notificationSync({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [legacy]
    })).toMatchObject({
      seenSeasonIds: [],
      removedNotificationIds: []
    });
  });
});
