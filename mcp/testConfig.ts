import type { McpConfig } from "./config";

type TestConfigOverrides = Partial<Omit<McpConfig, "rateLimit">> & {
  rateLimit?: Partial<McpConfig["rateLimit"]>;
};

export function createTestConfig(
  overrides: TestConfigOverrides = {}
): McpConfig {
  const rateLimit = {
    requests: 120,
    toolCalls: 40,
    jikanRequests: 60,
    windowSeconds: 60,
    ...overrides.rateLimit
  };

  return {
    port: 8787,
    publicUrl: "https://mcp.example.com/mcp",
    protectedResourceMetadataUrl:
      "https://mcp.example.com/.well-known/oauth-protected-resource/mcp",
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "test-key",
    authorizationServer: "https://example.supabase.co/auth/v1",
    allowedOrigins: ["https://mcp.example.com"],
    allowedHosts: ["mcp.example.com"],
    trustProxy: false,
    maxBodyBytes: 64 * 1024,
    maxHeaderBytes: 16 * 1024,
    maxConcurrentRequests: 50,
    requestTimeoutMs: 30_000,
    headersTimeoutMs: 10_000,
    upstreamTimeoutMs: 15_000,
    ...overrides,
    rateLimit
  };
}
