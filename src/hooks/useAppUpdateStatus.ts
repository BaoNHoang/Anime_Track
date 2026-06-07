import { useEffect, useState } from "react";
import {
  APP_UPDATE_EVENT,
  APP_UPDATE_INTERVAL_MS,
  getLastAppUpdateCheck
} from "../services/pwa/updateStatus";

export function useAppUpdateStatus() {
  const [lastChecked, setLastChecked] = useState(getLastAppUpdateCheck);

  useEffect(() => {
    const onChecked = (event: Event) => {
      setLastChecked((event as CustomEvent<string>).detail);
    };
    window.addEventListener(APP_UPDATE_EVENT, onChecked);
    return () => window.removeEventListener(APP_UPDATE_EVENT, onChecked);
  }, []);

  return {
    lastChecked,
    intervalMinutes: APP_UPDATE_INTERVAL_MS / (60 * 1000)
  };
}
