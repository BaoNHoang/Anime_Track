import {
  createClient,
  type SupabaseClient
} from "@supabase/supabase-js";
import type { McpConfig } from "./config";

export interface AuthenticatedUser {
  userId: string;
  client: SupabaseClient;
}

export function extractBearerToken(
  authorizationHeader: string | undefined
) {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
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
  const authClient = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  const { data, error } = await authClient.auth.getClaims(token);
  const claims = data?.claims;

  if (error || !claims || typeof claims.sub !== "string") {
    return undefined;
  }
  if (claims.iss !== config.authorizationServer) {
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
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  };
}
