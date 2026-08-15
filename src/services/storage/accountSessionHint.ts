const STORAGE_KEY = "banime:account-session-hint:v1";

export const accountSessionHint = {
  get(): boolean {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "authenticated";
    } catch {
      return false;
    }
  },

  save(authenticated: boolean) {
    try {
      if (authenticated) {
        window.localStorage.setItem(STORAGE_KEY, "authenticated");
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // This hint only prevents layout movement; it never grants access.
    }
  }
};
