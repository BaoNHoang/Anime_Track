/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<unknown> };

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === "https://api.tenrai.org" && url.pathname.startsWith("/v1/"),
  new NetworkFirst({
    cacheName: "banime-catalog-v1",
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 7 * 24 * 60 * 60 })]
  })
);

self.addEventListener("push", (event) => {
  const payload = event.data?.json() as { title?: unknown; body?: unknown; url?: unknown; tag?: unknown } | undefined;
  const title = typeof payload?.title === "string" ? payload.title : "Banime release update";
  const body = typeof payload?.body === "string" ? payload.body : "A title in your library has a new release.";
  const url = typeof payload?.url === "string" && payload.url.startsWith("/") ? payload.url : "/notifications";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: typeof payload?.tag === "string" ? payload.tag : "banime-release",
    data: { url }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = typeof event.notification.data?.url === "string" ? event.notification.data.url : "/notifications";
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => "focus" in client) as WindowClient | undefined;
    if (existing) {
      await existing.focus();
      existing.navigate(url);
      return;
    }
    await self.clients.openWindow(url);
  })());
});
