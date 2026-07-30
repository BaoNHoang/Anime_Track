import dotenv from "dotenv";

dotenv.config({
  path: [".env.mcp.local", ".env.local", ".env"],
  quiet: true
});

export interface McpConfig {
  port: number;
  publicUrl: string;
  protectedResourceMetadataUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  authorizationServer: string;
  expectedAudience?: string;
  allowedOrigins: string[];
  allowedHosts: string[];
  trustProxy: boolean;
  maxBodyBytes: number;
  maxHeaderBytes: number;
  maxConcurrentRequests: number;
  requestTimeoutMs: number;
  headersTimeoutMs: number;
  upstreamTimeoutMs: number;
  rateLimit: {
    requests: number;
    toolCalls: number;
    tenraiRequests: number;
    windowSeconds: number;
    upstashUrl?: string;
    upstashToken?: string;
  };
}

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function removeTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function readInteger(
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
  aliases: string[] = []
) {
  const raw = readEnv(name, ...aliases);
  const value = raw === undefined ? defaultValue : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`
    );
  }
  return value;
}

function readBoolean(name: string, defaultValue: boolean) {
  const raw = readEnv(name);
  if (raw === undefined) return defaultValue;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function readList(name: string) {
  return (readEnv(name) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseServiceUrl(
  name: string,
  value: string,
  requireMcpPath = false
) {
  const url = new URL(value);
  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new Error(`${name} must use HTTPS outside local development.`);
  }
  if (url.username || url.password) {
    throw new Error(`${name} must not contain embedded credentials.`);
  }
  if (requireMcpPath && url.pathname !== "/mcp") {
    throw new Error(`${name} must end with the exact path /mcp.`);
  }
  return url;
}

export function loadMcpConfig(): McpConfig {
  const port = readInteger("PORT", 8787, 1, 65535, ["MCP_PORT"]);
  const supabaseUrl = readEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const supabaseKey = readEnv(
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY"
  );

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY before starting the MCP server."
    );
  }

  const normalizedSupabaseUrl = removeTrailingSlash(supabaseUrl);
  const publicUrl = removeTrailingSlash(
    readEnv("MCP_PUBLIC_URL") ?? `http://localhost:${port}/mcp`
  );
  const publicUrlObject = parseServiceUrl(
    "MCP_PUBLIC_URL",
    publicUrl,
    true
  );
  parseServiceUrl("SUPABASE_URL", normalizedSupabaseUrl);
  const metadataPath =
    publicUrlObject.pathname === "/"
      ? "/.well-known/oauth-protected-resource"
      : `/.well-known/oauth-protected-resource${publicUrlObject.pathname}`;

  const upstashUrl = readEnv("UPSTASH_REDIS_REST_URL");
  const upstashToken = readEnv("UPSTASH_REDIS_REST_TOKEN");
  if (Boolean(upstashUrl) !== Boolean(upstashToken)) {
    throw new Error(
      "Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or neither."
    );
  }

  const allowedOrigins = [
    publicUrlObject.origin,
    ...readList("MCP_ALLOWED_ORIGINS")
  ];
  if (allowedOrigins.includes("*")) {
    throw new Error("MCP_ALLOWED_ORIGINS cannot contain a wildcard.");
  }
  for (const origin of allowedOrigins) {
    const parsedOrigin = parseServiceUrl("MCP_ALLOWED_ORIGINS", origin);
    if (parsedOrigin.origin !== origin) {
      throw new Error(
        "MCP_ALLOWED_ORIGINS values must be origins without paths."
      );
    }
  }

  const requestTimeoutMs = readInteger(
    "MCP_REQUEST_TIMEOUT_MS",
    30_000,
    1000,
    120_000
  );
  const headersTimeoutMs = readInteger(
    "MCP_HEADERS_TIMEOUT_MS",
    10_000,
    1000,
    60_000
  );
  if (headersTimeoutMs > requestTimeoutMs) {
    throw new Error(
      "MCP_HEADERS_TIMEOUT_MS cannot exceed MCP_REQUEST_TIMEOUT_MS."
    );
  }

  const allowedHosts = [
    publicUrlObject.host,
    ...readList("MCP_ALLOWED_HOSTS")
  ].map((host) => host.toLowerCase());
  if (
    allowedHosts.some(
      (host) =>
        !/^[a-z0-9.[\]:-]+$/.test(host) ||
        host.includes("/") ||
        host.length > 255
    )
  ) {
    throw new Error("MCP_ALLOWED_HOSTS contains an invalid host value.");
  }

  return {
    port,
    publicUrl,
    protectedResourceMetadataUrl: new URL(
      metadataPath,
      publicUrlObject.origin
    ).toString(),
    supabaseUrl: normalizedSupabaseUrl,
    supabaseKey,
    authorizationServer: `${normalizedSupabaseUrl}/auth/v1`,
    expectedAudience: readEnv("MCP_EXPECTED_AUDIENCE"),
    allowedOrigins: [...new Set(allowedOrigins)],
    allowedHosts: [...new Set(allowedHosts)],
    trustProxy: readBoolean("MCP_TRUST_PROXY", false),
    maxBodyBytes: readInteger(
      "MCP_MAX_BODY_BYTES",
      64 * 1024,
      1024,
      1024 * 1024
    ),
    maxHeaderBytes: readInteger(
      "MCP_MAX_HEADER_BYTES",
      16 * 1024,
      4096,
      64 * 1024
    ),
    maxConcurrentRequests: readInteger(
      "MCP_MAX_CONCURRENT_REQUESTS",
      50,
      1,
      1000
    ),
    requestTimeoutMs,
    headersTimeoutMs,
    upstreamTimeoutMs: readInteger(
      "MCP_UPSTREAM_TIMEOUT_MS",
      15_000,
      1000,
      60_000
    ),
    rateLimit: {
      requests: readInteger("MCP_RATE_LIMIT_REQUESTS", 120, 1, 100_000),
      toolCalls: readInteger(
        "MCP_RATE_LIMIT_TOOL_CALLS",
        40,
        1,
        100_000
      ),
      tenraiRequests: readInteger(
        "MCP_TENRAI_RATE_LIMIT_REQUESTS",
        120,
        1,
        120
      ),
      windowSeconds: readInteger(
        "MCP_RATE_LIMIT_WINDOW_SECONDS",
        60,
        1,
        3600
      ),
      upstashUrl,
      upstashToken
    }
  };
}
