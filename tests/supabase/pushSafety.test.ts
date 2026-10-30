import { describe, expect, it } from "vitest";
import {
  boundedReleaseWindow,
  isStorableEpisode,
  isTrustedPushEndpoint,
  remainingPushAttempts,
  MAX_PUSH_ATTEMPTS_PER_RUN,
  MAX_PUSH_ATTEMPTS_PER_USER,
  MAX_USERS_PER_RUN,
  PUSH_PROVIDER_FILTER
} from "../../supabase/functions/_shared/pushSafety";

describe("push delivery safety", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/device-token",
    "https://updates.push.services.mozilla.com/wpush/v1/device-token",
    "https://web.push.apple.com/3/device/device-token",
    "https://db3.notify.windows.com/w/?token=device-token"
  ])("accepts a browser push service endpoint: %s", (endpoint) => {
    expect(isTrustedPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    "https://127.0.0.1/push",
    "https://example.com/push",
    "https://fcm.googleapis.com.evil.example/push",
    "https://fcm.googleapis.com@evil.example/push",
    "https://user:pass@fcm.googleapis.com/push",
    "https://fcm.googleapis.com:8443/push",
    "https://fcm.googleapis.com\\@evil.example/push",
    "http://fcm.googleapis.com/fcm/send/device-token",
    "https://fcm.googleapis.com/push#fragment",
    " https://fcm.googleapis.com/fcm/send/device-token"
  ])("rejects an unsafe or ambiguous endpoint: %s", (endpoint) => {
    expect(isTrustedPushEndpoint(endpoint)).toBe(false);
  });

  it("processes old cursors in daily windows without losing an outage backlog", () => {
    const now = new Date("2026-10-17T12:00:00.000Z");
    const first = boundedReleaseWindow("2026-10-15T12:00:00.000Z", now);
    expect(first.start.toISOString()).toBe("2026-10-15T12:00:00.000Z");
    expect(first.end.toISOString()).toBe("2026-10-16T12:00:00.000Z");
    expect(boundedReleaseWindow(first.end.toISOString(), now).end.toISOString()).toBe(now.toISOString());
    expect(boundedReleaseWindow("invalid", now).start.toISOString()).toBe("2026-10-16T12:00:00.000Z");
    expect(boundedReleaseWindow("2026-10-17T11:00:00.000Z", now).end.toISOString()).toBe(now.toISOString());
  });

  it("filters provider-shaped rows in the database and validates their final hosts", () => {
    expect(PUSH_PROVIDER_FILTER).toContain("endpoint.like.https://fcm.googleapis.com/%");
    expect(PUSH_PROVIDER_FILTER).toContain("endpoint.like.https://%.push.apple.com/%");
    expect(isTrustedPushEndpoint("https://evil.example/path.push.apple.com/token")).toBe(false);
  });

  it("keeps invalid notification metadata out of a batch of valid releases", () => {
    const episode = { animeId: 1, id: "1:release:2026-10-17T00:00:00.000Z", title: "A show", imageUrl: "", trackingStatus: "watching" };
    expect(isStorableEpisode(episode)).toBe(true);
    expect(isStorableEpisode({ ...episode, title: "x".repeat(501) })).toBe(false);
    expect(isStorableEpisode({ ...episode, imageUrl: "x".repeat(2_049) })).toBe(false);
    expect(isStorableEpisode({ ...episode, trackingStatus: "invalid" })).toBe(false);
  });

  it("caps push attempts per release, account, and invocation", () => {
    expect(MAX_PUSH_ATTEMPTS_PER_RUN).toBe(MAX_USERS_PER_RUN * MAX_PUSH_ATTEMPTS_PER_USER);
    expect(remainingPushAttempts(0, 0)).toBe(5);
    expect(remainingPushAttempts(MAX_PUSH_ATTEMPTS_PER_RUN - 2, 0)).toBe(2);
    expect(remainingPushAttempts(0, 9)).toBe(1);
    expect(remainingPushAttempts(MAX_PUSH_ATTEMPTS_PER_RUN, 0)).toBe(0);
    expect(remainingPushAttempts(0, 10)).toBe(0);
  });
});
