import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App";
import {
  APP_UPDATE_INTERVAL_MS,
  recordAppUpdateCheck
} from "./services/pwa/updateStatus";
import "./styles.css";

const updateServiceWorker = registerSW({
  immediate: true,
  onRegisteredSW: (_serviceWorkerUrl, registration) => {
    recordAppUpdateCheck();
    if (!registration) return;

    window.setInterval(() => {
      void registration.update().finally(() => recordAppUpdateCheck());
    }, APP_UPDATE_INTERVAL_MS);
  },
  onNeedRefresh: () => {
    void updateServiceWorker(true);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
