import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import type { McpConfig } from "./config";
import { createBanimeMcpServer } from "./tools";

const config: McpConfig = {
  port: 8787,
  publicUrl: "https://mcp.example.com/mcp",
  protectedResourceMetadataUrl:
    "https://mcp.example.com/.well-known/oauth-protected-resource/mcp",
  supabaseUrl: "https://example.supabase.co",
  supabaseKey: "test-key",
  authorizationServer: "https://example.supabase.co/auth/v1"
};

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

async function connectClient() {
  const server = createBanimeMcpServer(config);
  const client = new Client({ name: "banime-test", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  closeCallbacks.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}

describe("Banime MCP tools", () => {
  it("advertises the complete modular tool surface", async () => {
    const client = await connectClient();
    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name).sort()).toEqual([
      "add_to_library",
      "get_anime_details",
      "get_anime_news",
      "get_library",
      "get_recommendation_candidates",
      "remove_from_library",
      "search_anime",
      "update_library_item"
    ]);
  });

  it("returns an OAuth challenge for protected tools", async () => {
    const client = await connectClient();
    const result = await client.callTool({
      name: "get_library",
      arguments: { limit: 10 }
    });

    expect(result.isError).toBe(true);
    expect(result._meta?.["mcp/www_authenticate"]).toContain(
      config.protectedResourceMetadataUrl
    );
  });
});
