import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import type { TrackedAnime } from "../tracker/types";
import {
  findReleasedAnime,
  normalizeReleaseNotificationState,
  mergeReleaseNotifications,
  type ReleaseNotification
} from "./releaseNotifications";

const anime: Anime = {
  id: 42,
  title: "Release Test",
  imageUrl: "/release-test.webp",
  largeImageUrl: "/release-test-large.webp",
  synopsis: "",
  status: "Currently Airing",
  type: "TV",
  broadcast: {
    day: "Thursdays",
    time: "22:00",
    timezone: "Asia/Tokyo"
  },
  genres: [],
  studios: [],
  url: ""
};

function tracked(status: TrackedAnime["status"] = "watching"): TrackedAnime {
  return {
    anime,
    status,
    progress: 3,
    notes: "",
    addedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  };
}

describe("findReleasedAnime", () => {
  it("creates an alert when a tracked broadcast passed since the last check", () => {
    const notifications = findReleasedAnime(
      [tracked()],
      "2026-06-11T12:55:00.000Z",
      new Date("2026-06-11T13:05:00.000Z")
    );

    expect(notifications).toEqual([
      expect.objectContaining({
        animeId: 42,
        releasedAt: "2026-06-11T13:00:00.000Z",
        trackingStatus: "watching"
      })
    ]);
  });

  it("uses the first check as a baseline instead of creating old alerts", () => {
    expect(findReleasedAnime([tracked()], undefined)).toEqual([]);
  });

  it("ignores titles that are no longer being followed", () => {
    expect(
      findReleasedAnime(
        [tracked("completed")],
        "2026-06-11T12:55:00.000Z",
        new Date("2026-06-11T13:05:00.000Z")
      )
    ).toEqual([]);
  });
});

describe("mergeReleaseNotifications", () => {
  it("keeps only the newest unread release for each anime", () => {
    const older: ReleaseNotification = {
      id: "42:older",
      animeId: 42,
      title: "Release Test",
      imageUrl: "",
      releasedAt: "2026-06-04T13:00:00.000Z",
      trackingStatus: "watching"
    };
    const newer = {
      ...older,
      id: "42:newer",
      releasedAt: "2026-06-11T13:00:00.000Z"
    };

    expect(mergeReleaseNotifications([older], [newer])).toEqual([newer]);
  });
});

describe("normalizeReleaseNotificationState", () => {
  it("keeps only valid bounded cloud messages", () => {
    const notification: ReleaseNotification = {
      id: "42:2026-06-11T13:00:00.000Z",
      animeId: 42,
      title: "Release Test",
      imageUrl: "",
      releasedAt: "2026-06-11T13:00:00.000Z",
      trackingStatus: "watching"
    };

    expect(normalizeReleaseNotificationState({
      lastCheckedAt: "2026-06-11T13:05:00.000Z",
      notifications: [notification, { id: 4 }]
    })).toEqual({
      lastCheckedAt: "2026-06-11T13:05:00.000Z",
      notifications: [notification]
    });
  });
});
