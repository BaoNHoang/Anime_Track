import {
  normalizeReleaseNotificationState,
  type ReleaseNotification,
  type ReleaseNotificationState
} from "../../domain/notifications/releaseNotifications";

async function notificationRequest(
  options: {
    method?: "GET" | "PUT" | "DELETE";
    body?: unknown;
    expectedUserId?: string;
    notificationId?: string;
  } = {}
): Promise<ReleaseNotificationState> {
  const query = options.notificationId
    ? `?id=${encodeURIComponent(options.notificationId)}`
    : "";
  let response: Response;
  try {
    response = await fetch(`/api/notifications${query}`, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers: {
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.expectedUserId
          ? { "X-Banime-User": options.expectedUserId }
          : {})
      },
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body)
    });
  } catch {
    throw new Error("Notifications could not be reached. Try again shortly.");
  }

  const responseText = await response.text();
  let value: unknown;
  try {
    value = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("Notifications returned an invalid response.");
  }
  if (!response.ok) {
    const message =
      value && typeof value === "object" && "error" in value &&
      typeof value.error === "string"
        ? value.error
        : "Notifications could not be synchronized.";
    throw new Error(message);
  }
  return normalizeReleaseNotificationState(value);
}

export const notificationCloudRepository = {
  get: () => notificationRequest(),

  sync(
    lastCheckedAt: string,
    notifications: ReleaseNotification[],
    expectedUserId: string
  ) {
    return notificationRequest({
      method: "PUT",
      expectedUserId,
      body: { lastCheckedAt, notifications }
    });
  },

  remove(notificationId: string, expectedUserId: string) {
    return notificationRequest({
      method: "DELETE",
      expectedUserId,
      notificationId
    });
  },

  clear(expectedUserId: string) {
    return notificationRequest({
      method: "DELETE",
      expectedUserId
    });
  }
};
