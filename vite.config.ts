import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\.tenrai\.org\/v1\//,
          handler: "NetworkFirst",
          options: {
            cacheName: "banime-catalog-v1",
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 120, maxAgeSeconds: 7 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [200] }
          }
        }]
      },
      manifest: {
        name: "Banime",
        short_name: "Banime",
        description:
          "A private, mobile-ready anime tracker and news hub powered by Tenrai.",
        theme_color: "#11101a",
        background_color: "#11101a",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait-primary",
        categories: ["entertainment", "lifestyle"],
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
