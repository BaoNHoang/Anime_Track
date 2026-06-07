export const APP_UPDATE_INTERVAL_MS = 60 * 60 * 1000;
export const APP_UPDATE_EVENT = "banime:app-update-checked";
const APP_UPDATE_KEY = "banime:last-app-update-check";

export function recordAppUpdateCheck(date = new Date()) {
  const value = date.toISOString();
  window.localStorage.setItem(APP_UPDATE_KEY, value);
  window.dispatchEvent(new CustomEvent(APP_UPDATE_EVENT, { detail: value }));
}

export function getLastAppUpdateCheck() {
  return window.localStorage.getItem(APP_UPDATE_KEY) ?? undefined;
}
