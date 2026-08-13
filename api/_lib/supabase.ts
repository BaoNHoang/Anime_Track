import type { ServerResponse } from "node:http";
import {
  createClient,
  type Session,
  type SupabaseClient,
  type User
} from "@supabase/supabase-js";
import type { ApiRequest } from "./http.js";
import { ApiError } from "./http.js";
import {
  normalizeProfileFavorites,
  type ProfileFavorites
} from "../../src/domain/account/favorites.js";

const ACCESS_COOKIE = "banime_access";
export const REFRESH_COOKIE = "banime_refresh";
export const PKCE_COOKIE = "banime_pkce";

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

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new ApiError(503, "Account services are not configured.");
  return value;
}

function supabaseUrl() {
  return requiredEnv("SUPABASE_URL");
}

function publishableKey() {
  return requiredEnv("SUPABASE_PUBLISHABLE_KEY");
}

export function createPublicClient(options: {
  flowType?: "implicit" | "pkce";
  storage?: {
    getItem(key: string): string | null | Promise<string | null>;
    setItem(key: string, value: string): void | Promise<void>;
    removeItem(key: string): void | Promise<void>;
  };
} = {}) {
  return createClient(supabaseUrl(), publishableKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: Boolean(options.storage),
      flowType: options.flowType ?? "implicit",
      storage: options.storage
    }
  });
}

export function createAdminClient() {
  const secret =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new ApiError(
      503,
      "Username sign-in is not configured on the server."
    );
  }
  return createClient(supabaseUrl(), secret, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

function parseCookies(request: ApiRequest) {
  const result = new Map<string, string>();
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      result.set(name, decodeURIComponent(value));
    } catch {
      continue;
    }
  }
  return result;
}

export function readCookie(request: ApiRequest, name: string) {
  return parseCookies(request).get(name);
}

function cookie(
  name: string,
  value: string,
  options: { maxAge: number; httpOnly?: boolean }
) {
  const secure = process.env.VERCEL_ENV === "production" ||
    process.env.APP_URL?.startsWith("https://");
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${options.maxAge}`,
    "SameSite=Lax",
    options.httpOnly === false ? "" : "HttpOnly",
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");
}

function appendCookies(response: ServerResponse, values: string[]) {
  const current = response.getHeader("Set-Cookie");
  const existing = Array.isArray(current)
    ? current.map(String)
    : current
      ? [String(current)]
      : [];
  response.setHeader("Set-Cookie", [...existing, ...values]);
}

export function setSessionCookies(
  response: ServerResponse,
  session: Session
) {
  appendCookies(response, [
    cookie(ACCESS_COOKIE, session.access_token, {
      maxAge: Math.max(60, session.expires_in)
    }),
    cookie(REFRESH_COOKIE, session.refresh_token, {
      maxAge: 60 * 60 * 24 * 30
    })
  ]);
}

export function setPkceCookie(response: ServerResponse, verifier: string) {
  appendCookies(response, [
    cookie(PKCE_COOKIE, verifier, { maxAge: 10 * 60 })
  ]);
}

export function clearPkceCookie(response: ServerResponse) {
  appendCookies(response, [cookie(PKCE_COOKIE, "", { maxAge: 0 })]);
}

export function clearSessionCookies(response: ServerResponse) {
  appendCookies(response, [
    cookie(ACCESS_COOKIE, "", { maxAge: 0 }),
    cookie(REFRESH_COOKIE, "", { maxAge: 0 })
  ]);
}

export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl(), publishableKey(), {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

export async function accountUser(
  user: User,
  client: SupabaseClient
): Promise<AccountUser> {
  const { data } = await client
    .from("profiles")
    .select("username, avatar_id, score_step, favorites")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: media } = await client
    .from("profiles")
    .select("avatar_path, banner_id, banner_path")
    .eq("user_id", user.id)
    .maybeSingle();
  const signedUrl = async (path: unknown, expectedName: string) => {
    if (path !== `${user.id}/${expectedName}`) return undefined;
    const { data: signed } = await client.storage
      .from("profile-media")
      .createSignedUrl(path, 60 * 60);
    return signed?.signedUrl;
  };
  const [avatarUrl, bannerUrl] = await Promise.all([
    signedUrl(media?.avatar_path, "avatar.webp"),
    signedUrl(media?.banner_path, "banner.webp")
  ]);
  return {
    id: user.id,
    email: user.email ?? "",
    username:
      typeof data?.username === "string"
        ? data.username
        : `user_${user.id.replaceAll("-", "").slice(0, 12)}`,
    provider:
      typeof user.app_metadata.provider === "string"
        ? user.app_metadata.provider
        : "email",
    avatarId:
      typeof data?.avatar_id === "string" ? data.avatar_id : "male-01",
    avatarUrl,
    bannerId:
      typeof media?.banner_id === "string" ? media.banner_id : "banner-01",
    bannerUrl,
    scoreStep: data?.score_step === 1 ? 1 : 0.5,
    favorites: normalizeProfileFavorites(data?.favorites)
  };
}

export async function authenticateRequest(
  request: ApiRequest,
  response: ServerResponse
) {
  const cookies = parseCookies(request);
  let accessToken = cookies.get(ACCESS_COOKIE);
  const refreshToken = cookies.get(REFRESH_COOKIE);
  const client = createPublicClient();

  if (accessToken) {
    const { data, error } = await client.auth.getUser(accessToken);
    if (!error && data.user?.email_confirmed_at) {
      return {
        user: data.user,
        accessToken,
        client: createUserClient(accessToken)
      };
    }
  }

  if (refreshToken) {
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken
    });
    if (!error && data.session && data.user?.email_confirmed_at) {
      setSessionCookies(response, data.session);
      accessToken = data.session.access_token;
      return {
        user: data.user,
        accessToken,
        client: createUserClient(accessToken)
      };
    }
  }

  clearSessionCookies(response);
  throw new ApiError(401, "Authentication required.");
}
