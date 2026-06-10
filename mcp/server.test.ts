import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createBanimeHttpServer } from "./server";
import { createTestConfig } from "./testConfig";

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

async function startServer(
  overrides: Parameters<typeof createTestConfig>[0] = {}
) {
  const config = createTestConfig({
    publicUrl: "http://127.0.0.1:8787/mcp",
    protectedResourceMetadataUrl:
      "http://127.0.0.1:8787/.well-known/oauth-protected-resource/mcp",
    allowedOrigins: ["http://127.0.0.1:8787"],
    allowedHosts: [],
    ...overrides
  });
  const server = createBanimeHttpServer(config);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  const host = `127.0.0.1:${address.port}`;
  config.allowedHosts.push(host);
  const baseUrl = `http://${host}`;

  closeCallbacks.push(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );

  return { baseUrl };
}

describe("Banime MCP HTTP security", () => {
  it("sets security headers and reports its rate-limit store", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'"
    );
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      rate_limit_store: "memory"
    });
  });

  it("rejects browser origins outside the allow list", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://attacker.example" }
    });

    expect(response.status).toBe(403);
  });

  it("rejects oversized JSON before MCP parsing", async () => {
    const { baseUrl } = await startServer({ maxBodyBytes: 32 });
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100) })
    });

    expect(response.status).toBe(413);
  });

  it("rate limits repeated requests by client identity", async () => {
    const { baseUrl } = await startServer({
      rateLimit: { requests: 1, toolCalls: 1, windowSeconds: 60 }
    });
    const request = (token: string) =>
      fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: "{}"
      });

    await request("fake-token-one");
    const response = await request("fake-token-two");

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).not.toBeNull();
    expect(response.headers.get("ratelimit-remaining")).toBe("0");
  });
});
