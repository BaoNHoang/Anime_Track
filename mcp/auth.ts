import {
  createClient,
  type SupabaseClient
} from "@supabase/supabase-js";
import type { McpConfig } from "./config";

export interface AuthenticatedUser {
  userId: string;
  client: SupabaseClient;
}

let verifier:
  | {
      supabaseUrl: string;
      supabaseKey: string;
      timeoutMs: number;
      client: SupabaseClient;
    }
  | undefined;

function timeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;
    return fetch(input, { ...init, signal });
  };
}

export function extractBearerToken(
  authorizationHeader: string | undefined
) {
  if (!authorizationHeader) return undefined;
  const match = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i.exec(
    authorizationHeader
  );
  const token = match?.[1];
  return token && token.length <= 8192 ? token : undefined;
}

function includesAudience(
  audience: unknown,
  expectedAudience: string
) {
  if (typeof audience === "string") return audience === expectedAudience;
  return (
    Array.isArray(audience) &&
    audience.some((item) => item === expectedAudience)
  );
}

export async function authenticateToken(
  config: McpConfig,
  token: string
): Promise<AuthenticatedUser | undefined> {
  if (
    !verifier ||
    verifier.supabaseUrl !== config.supabaseUrl ||
    verifier.supabaseKey !== config.supabaseKey ||
    verifier.timeoutMs !== config.upstreamTimeoutMs
  ) {
    verifier = {
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      timeoutMs: config.upstreamTimeoutMs,
      client: createClient(config.supabaseUrl, config.supabaseKey, {
        global: { fetch: timeoutFetch(config.upstreamTimeoutMs) },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    };
  }
  const authClient = verifier.client;
  const { data, error } = await authClient.auth.getClaims(token);
  const claims = data?.claims;

  if (error || !claims || typeof claims.sub !== "string") {
    return undefined;
  }
  if (claims.iss !== config.authorizationServer) {
    return undefined;
  }
  if (claims.role !== "authenticated") {
    return undefined;
  }
  if (
    config.expectedAudience &&
    !includesAudience(claims.aud, config.expectedAudience)
  ) {
    return undefined;
  }

  return {
    userId: claims.sub,
    client: createClient(config.supabaseUrl, config.supabaseKey, {
      accessToken: async () => token,
      global: { fetch: timeoutFetch(config.upstreamTimeoutMs) },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  };
}
