export interface AccountUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  provider: string;
}

interface ApiResult {
  error?: string;
  message?: string;
  user?: AccountUser | null;
}

async function request(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult> {
  try {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers:
        options.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body)
    });
    const data = (await response.json()) as ApiResult;
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
  updateUsername: (username: string) =>
    request("/api/auth/username", {
      method: "POST",
      body: { username }
    }),
  signOut: () => request("/api/auth/logout", { method: "POST" })
};
