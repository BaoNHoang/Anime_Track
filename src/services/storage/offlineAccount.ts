import type { AccountUser } from "../account/accountApi";
const KEY = "banime:offline-account:v1";

// Display/cache identity only. Server cookies still authorize every API request.
export const offlineAccount = {
  get(): AccountUser | undefined {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as AccountUser | null;
      return value && typeof value.id === "string" && value.favorites ? value : undefined;
    } catch { return undefined; }
  },
  save(user?: AccountUser) {
    try {
      if (user) localStorage.setItem(KEY, JSON.stringify(user));
      else localStorage.removeItem(KEY);
    } catch { /* Account access does not depend on local storage. */ }
  }
};
