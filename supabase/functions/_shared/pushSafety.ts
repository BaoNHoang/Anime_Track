export const MAX_PUSH_SUBSCRIPTIONS_PER_RELEASE = 5;
export const MAX_PUSH_ATTEMPTS_PER_USER = 10;
export const MAX_PUSH_ATTEMPTS_PER_RUN = 40;
export const MAX_PUSH_CONCURRENCY = 4;
export const PUSH_SEND_TIMEOUT_MS = 5_000;

const MAX_RELEASE_WINDOW_MS = 24 * 60 * 60 * 1_000;

// Narrow the database query before applying the strict URL parser at the sink.
// These are static PostgREST filters, never interpolated from a subscription.
export const PUSH_PROVIDER_FILTER = [
  "endpoint.like.https://fcm.googleapis.com/%",
  "endpoint.like.https://updates.push.services.mozilla.com/%",
  "endpoint.like.https://%.push.apple.com/%",
  "endpoint.like.https://%.notify.windows.com/%"
].join(",");

export function isTrustedPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048 ||
      value !== value.trim() || /[\\\u0000-\u001f\u007f]/.test(value)) return false;

  try {
    const url = new URL(value);
    if (url.href !== value || url.protocol !== "https:" || url.username ||
        url.password || url.port || url.hash) return false;

    const host = url.hostname;
    return host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

export function boundedReleaseWindow(lastCheckedAt: string, now: Date): { start: Date; end: Date } {
  const checkedAt = new Date(lastCheckedAt).getTime();
  const start = Number.isFinite(checkedAt)
    ? Math.min(checkedAt, now.getTime())
    : now.getTime() - MAX_RELEASE_WINDOW_MS;
  return {
    start: new Date(start),
    end: new Date(Math.min(now.getTime(), start + MAX_RELEASE_WINDOW_MS))
  };
}

export function isStorableEpisode(value: {
  animeId: number; id: string; title: string; imageUrl: string; trackingStatus: string
}): boolean {
  return Number.isInteger(value.animeId) && value.animeId > 0 && value.animeId <= 10_000_000 &&
    value.id.length > 0 && value.id.length <= 80 &&
    value.title.length > 0 && value.title.length <= 500 && value.imageUrl.length <= 2_048 &&
    ["watching", "plan_to_watch", "completed", "on_hold"].includes(value.trackingStatus);
}

export function remainingPushAttempts(runAttempts: number, userAttempts: number): number {
  return Math.max(0, Math.min(
    MAX_PUSH_SUBSCRIPTIONS_PER_RELEASE,
    MAX_PUSH_ATTEMPTS_PER_USER - userAttempts,
    MAX_PUSH_ATTEMPTS_PER_RUN - runAttempts
  ));
}
