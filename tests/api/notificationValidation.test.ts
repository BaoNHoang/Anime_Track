import { describe, expect, it } from "vitest";
import {
  notificationId,
  notificationSync
} from "../../api/_lib/notificationValidation";

const notification = {
  id: "42:2026-08-30T12:00:00.000Z",
  animeId: 42,
  title: "Release Test",
  imageUrl: "https://cdn.example/release.webp",
  releasedAt: "2026-08-30T12:00:00.000Z",
  trackingStatus: "watching"
};

describe("notification API validation", () => {
  it("accepts a bounded release sync payload", () => {
    expect(notificationSync({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [notification]
    })).toEqual({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [notification]
    });
  });

  it("rejects malformed identifiers and untrusted image protocols", () => {
    expect(() => notificationId("../../other-user")).toThrow();
    expect(() => notificationSync({
      lastCheckedAt: "2026-08-30T12:01:00.000Z",
      notifications: [{ ...notification, imageUrl: "javascript:alert(1)" }]
    })).toThrow("Notification image is invalid");
  });
});
