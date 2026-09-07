import type { ProfileFavorites } from "../../domain/account/favorites";

export interface AccountUser {
  id: string;
  email: string;
  username: string;
  provider: string;
  avatarId: string;
  avatarUrl?: string;
  bannerId: string;
  bannerUrl?: string;
  scoreStep: 0.5 | 1;
  favorites: ProfileFavorites;
}

export interface PasskeyMetadata {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

interface ApiResult {
  error?: string;
  message?: string;
  user?: AccountUser | null;
  challengeId?: string;
  options?: Record<string, unknown>;
  passkey?: PasskeyMetadata;
  passkeys?: PasskeyMetadata[];
}

async function request(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult> {
  try {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      signal: AbortSignal.timeout(15000),
      headers:
        options.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body)
    });
    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (!contentType?.startsWith("application/json")) {
      return {
        error: import.meta.env.DEV
          ? "The account API is not running. Use vercel dev for local account testing."
          : "Account services returned an invalid response."
      };
    }
    const value = (await response.json()) as unknown;
    const data =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as ApiResult)
        : {};
    if (!response.ok) {
      return { error: data.error ?? "The request could not be completed." };
    }
    return data;
  } catch {
    return { error: "Account services could not be reached." };
  }
}

export const accountApi = {
  session: () => request("/api/auth/session"),
  signIn: (identifier: string, password: string) =>
    request("/api/auth/login", {
      method: "POST",
      body: { identifier, password }
    }),
  signUp: (email: string, username: string, password: string) =>
    request("/api/auth/signup", {
      method: "POST",
      body: { email, username, password }
    }),
  verifyEmail: (email: string, code: string) =>
    request("/api/auth/verify-email", {
      method: "POST",
      body: { email, code }
    }),
  resendVerification: (email: string) =>
    request("/api/auth/resend-verification", {
      method: "POST",
      body: { email }
    }),
  requestPasswordReset: (email: string) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      body: { email }
    }),
  resetPassword: (email: string, code: string, password: string) =>
    request("/api/auth/reset-password", {
      method: "POST",
      body: { email, code, password }
    }),
  startPasskeySignIn: () =>
    request("/api/auth/passkey-auth-start", { method: "POST" }),
  verifyPasskeySignIn: (challengeId: string, credential: unknown) =>
    request("/api/auth/passkey-auth-verify", {
      method: "POST",
      body: { challengeId, credential }
    }),
  startPasskeyRegistration: () =>
    request("/api/auth/passkey-register-start", { method: "POST" }),
  verifyPasskeyRegistration: (challengeId: string, credential: unknown) =>
    request("/api/auth/passkey-register-verify", {
      method: "POST",
      body: { challengeId, credential }
    }),
  listPasskeys: () => request("/api/auth/passkeys"),
  deletePasskey: (passkeyId: string) =>
    request("/api/auth/passkey-delete", {
      method: "POST",
      body: { passkeyId }
    }),
  signOutOtherSessions: () =>
    request("/api/auth/sessions-others", { method: "POST" }),
  updateUsername: (username: string) =>
    request("/api/auth/username", {
      method: "POST",
      body: { username }
    }),
  updateAvatar: (avatarId: string) =>
    request("/api/auth/avatar", {
      method: "POST",
      body: { avatarId }
    }),
  updateBanner: (bannerId: string) =>
    request("/api/auth/banner", {
      method: "POST",
      body: { bannerId }
    }),
  uploadProfileMedia: (kind: "avatar" | "banner", dataUrl: string) =>
    request("/api/auth/profile-media", {
      method: "POST",
      body: { kind, dataUrl }
    }),
  updateScoreStep: (scoreStep: 0.5 | 1) =>
    request("/api/auth/preferences", {
      method: "POST",
      body: { scoreStep }
    }),
  updateFavorites: (favorites: ProfileFavorites) =>
    request("/api/auth/favorites", {
      method: "POST",
      body: { favorites }
    }),
  deleteAccount: (confirmation: string) =>
    request("/api/auth/delete-account", {
      method: "POST",
      body: { confirmation }
    }),
  signOut: () => request("/api/auth/logout", { method: "POST" })
};
