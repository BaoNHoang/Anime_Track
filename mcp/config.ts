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

export function loadMcpConfig(): McpConfig {
  const port = Number(readEnv("PORT", "MCP_PORT") ?? "8787");
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
  const publicUrlObject = new URL(publicUrl);
  const metadataPath =
    publicUrlObject.pathname === "/"
      ? "/.well-known/oauth-protected-resource"
      : `/.well-known/oauth-protected-resource${publicUrlObject.pathname}`;

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
    expectedAudience: readEnv("MCP_EXPECTED_AUDIENCE")
  };
}
