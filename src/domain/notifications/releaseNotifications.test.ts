import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import type { TrackedAnime } from "../tracker/types";
import {
  findReleasedAnime,
  normalizeReleaseNotificationState,
  mergeReleaseNotifications,
  pruneReleaseNotifications,
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
        kind: "episode",
        episodeNumber: 4,
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

  it("suppresses original-broadcast alerts for dubbed-only preferences", () => {
    expect(
      findReleasedAnime(
        [{ ...tracked(), releaseNotificationMode: "dubbed_only" }],
        "2026-06-11T12:55:00.000Z",
        new Date("2026-06-11T13:05:00.000Z")
      )
    ).toEqual([]);
  });

  it("allows dubbed-only alerts when the schedule is marked as dubbed", () => {
    const notifications = findReleasedAnime(
      [{
        ...tracked(),
        anime: {
          ...anime,
          broadcast: { ...anime.broadcast, label: "English dubbed Thursdays" }
        },
        releaseNotificationMode: "dubbed_only"
      }],
      "2026-06-11T12:55:00.000Z",
      new Date("2026-06-11T13:05:00.000Z")
    );
    expect(notifications).toHaveLength(1);
  });

  it("notifies finale-only followers when the scheduled finale airs", () => {
    const finaleAnime = {
      ...anime,
      episodes: 2,
      startDate: "2026-06-04T13:00:00.000Z"
    };
    const notifications = findReleasedAnime(
      [{
        ...tracked(),
        anime: finaleAnime,
        progress: 1,
        releaseNotificationMode: "finale_only"
      }],
      "2026-06-11T12:55:00.000Z",
      new Date("2026-06-11T13:05:00.000Z")
    );

    expect(notifications).toEqual([
      expect.objectContaining({ episodeNumber: 2 })
    ]);
  });

  it("creates one numbered alert for every episode released while away", () => {
    const scheduled = {
      ...anime,
      episodes: 12,
      startDate: "2026-05-14T13:00:00.000Z"
    };
    const notifications = findReleasedAnime(
      [{ ...tracked(), anime: scheduled, progress: 5 }],
      "2026-06-11T13:05:00.000Z",
      new Date("2026-06-25T13:05:00.000Z")
    );

    expect(notifications.map((notification) => notification.episodeNumber))
      .toEqual([6, 7]);
  });
});

describe("mergeReleaseNotifications", () => {
  it("keeps separate unread releases for the same anime", () => {
    const older: ReleaseNotification = {
      id: "42:episode:6",
      kind: "episode",
      animeId: 42,
      title: "Release Test",
      imageUrl: "",
      releasedAt: "2026-06-04T13:00:00.000Z",
      trackingStatus: "watching",
      episodeNumber: 6
    };
    const newer = {
      ...older,
      id: "42:episode:7",
      releasedAt: "2026-06-11T13:00:00.000Z",
      episodeNumber: 7
    };

    expect(mergeReleaseNotifications([older], [newer])).toEqual([newer, older]);
  });
});

describe("pruneReleaseNotifications", () => {
  it("removes episode alerts once progress reaches that episode", () => {
    const notification = (episodeNumber: number): ReleaseNotification => ({
      id: `42:episode:${episodeNumber}`,
      kind: "episode",
      animeId: 42,
      title: "Release Test",
      imageUrl: "",
      releasedAt: "2026-06-11T13:00:00.000Z",
      trackingStatus: "watching",
      episodeNumber
    });

    expect(pruneReleaseNotifications(
      [notification(6), notification(7)],
      [{ ...tracked(), progress: 7 }]
    )).toEqual([]);
  });
});

describe("normalizeReleaseNotificationState", () => {
  it("keeps only valid bounded cloud messages", () => {
    const notification: ReleaseNotification = {
      id: "42:episode:4",
      kind: "episode",
      animeId: 42,
      title: "Release Test",
      imageUrl: "",
      releasedAt: "2026-06-11T13:00:00.000Z",
      trackingStatus: "watching",
      episodeNumber: 4
    };

    expect(normalizeReleaseNotificationState({
      lastCheckedAt: "2026-06-11T13:05:00.000Z",
      notifications: [notification, { id: 4 }],
      seenSeasonIds: [55, 55, -1]
    })).toEqual({
      lastCheckedAt: "2026-06-11T13:05:00.000Z",
      notifications: [notification],
      seenSeasonIds: [55]
    });
  });
});
