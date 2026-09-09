export type PushCapability = "unsupported" | "denied" | "available" | "enabled";

function base64UrlToBytes(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function request<T>(method: "GET" | "PUT" | "DELETE", body?: unknown, expectedUserId?: string): Promise<T> {
  const response = await fetch("/api/push", {
    method,
    credentials: "same-origin",
    signal: AbortSignal.timeout(15_000),
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(expectedUserId ? { "X-Banime-User": expectedUserId } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const value = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(value.error ?? "Push notifications could not be updated.");
  return value;
}

export async function getPushCapability(): Promise<PushCapability> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription() ? "enabled" : "available";
}

export async function enablePushNotifications(expectedUserId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("This browser does not support push notifications.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const { publicKey } = await request<{ publicKey: string }>("GET");
  if (!publicKey) throw new Error("Push notifications are not configured yet.");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(publicKey)
  });
  const json = subscription.toJSON();
  await request("PUT", {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: json.keys
  }, expectedUserId);
}

export async function disablePushNotifications(expectedUserId: string) {
  if (!("serviceWorker" in navigator)) return;
  const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
  if (!subscription) return;
  await request("DELETE", { endpoint: subscription.endpoint }, expectedUserId);
  await subscription.unsubscribe();
}
