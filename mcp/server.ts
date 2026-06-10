import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { extractBearerToken } from "./auth";
import type { McpConfig } from "./config";
import { createBanimeMcpServer } from "./tools";

function setCorsHeaders(response: ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id"
  );
  response.setHeader(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, WWW-Authenticate"
  );
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

function sendJson(
  response: ServerResponse,
  status: number,
  data: Record<string, unknown>
) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(data));
}

function pathFor(request: IncomingMessage) {
  return new URL(request.url ?? "/", "http://localhost").pathname;
}

export function getProtectedResourceMetadata(config: McpConfig) {
  return {
    resource: config.publicUrl,
    resource_name: "Banime",
    authorization_servers: [config.authorizationServer],
    scopes_supported: ["openid", "email"],
    bearer_methods_supported: ["header"]
  };
}

export function createBanimeHttpServer(config: McpConfig) {
  return createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const path = pathFor(request);
    if (
      path === "/.well-known/oauth-protected-resource" ||
      path === "/.well-known/oauth-protected-resource/mcp"
    ) {
      sendJson(response, 200, getProtectedResourceMetadata(config));
      return;
    }

    if (path === "/" || path === "/health") {
      sendJson(response, 200, {
        service: "banime-mcp",
        status: "ok",
        endpoint: config.publicUrl
      });
      return;
    }

    if (path !== "/mcp") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    const accessToken = extractBearerToken(request.headers.authorization);
    const mcpServer = createBanimeMcpServer(config, accessToken);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(request, response);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "MCP request failed." });
      } else if (!response.writableEnded) {
        response.end();
      }
    } finally {
      await mcpServer.close().catch(() => undefined);
    }
  });
}
