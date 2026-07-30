import { createHash } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from "node:http";
import { isIP } from "node:net";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  configureTenraiRequestGate,
  TenraiApiError
} from "../src/services/tenrai/client";
import { extractBearerToken } from "./auth";
import type { McpConfig } from "./config";
import {
  createRateLimiter,
  type RateLimitResult
} from "./rateLimiter";
import { createBanimeMcpServer } from "./tools";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function setSecurityHeaders(response: ServerResponse, secure: boolean) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'");
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  if (secure) {
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
}

function applyCors(
  request: IncomingMessage,
  response: ServerResponse,
  config: McpConfig
) {
  const origin = request.headers.origin;
  if (!origin) return;
  if (!config.allowedOrigins.includes(origin)) {
    throw new HttpError(403, "Origin is not allowed.");
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id"
  );
  response.setHeader(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After, WWW-Authenticate"
  );
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );
  response.setHeader("Access-Control-Max-Age", "600");
}

function sendJson(
  response: ServerResponse,
  status: number,
  data: Record<string, unknown>
) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(data));
}

function pathFor(request: IncomingMessage) {
  try {
    return new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    throw new HttpError(400, "Invalid request URL.");
  }
}

function effectiveHost(request: IncomingMessage, config: McpConfig) {
  const forwardedHost = config.trustProxy
    ? request.headers["x-forwarded-host"]
    : undefined;
  const value = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost?.split(",", 1)[0] ?? request.headers.host;
  return value?.trim().toLowerCase();
}

function validateHost(request: IncomingMessage, config: McpConfig) {
  const host = effectiveHost(request, config);
  const remoteAddress = request.socket.remoteAddress ?? "";
  const loopbackRequest =
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1";
  const loopbackHost =
    host === `127.0.0.1:${config.port}` ||
    host === `localhost:${config.port}`;
  if (loopbackRequest && loopbackHost) return;
  if (!host || !config.allowedHosts.includes(host)) {
    throw new HttpError(421, "Host is not allowed.");
  }
}

function clientIp(request: IncomingMessage, config: McpConfig) {
  if (config.trustProxy) {
    const forwarded = request.headers["x-forwarded-for"];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(",", 1)[0]
      ?.trim();
    if (first && isIP(first)) return first;
  }

  const remoteAddress = request.socket.remoteAddress ?? "unknown";
  return remoteAddress.startsWith("::ffff:")
    ? remoteAddress.slice(7)
    : remoteAddress;
}

function rateLimitIdentifiers(
  request: IncomingMessage,
  config: McpConfig,
  accessToken?: string
) {
  const identifiers = [`ip:${clientIp(request, config)}`];
  if (accessToken) {
    const tokenHash = createHash("sha256")
      .update(accessToken)
      .digest("hex")
      .slice(0, 24);
    identifiers.push(`token:${tokenHash}`);
  }
  return identifiers;
}

async function checkRateLimits(
  identifiers: string[],
  check: (identifier: string) => Promise<RateLimitResult>
) {
  let tightest: RateLimitResult | undefined;
  for (const identifier of identifiers) {
    const result = await check(identifier);
    if (!result.success) return result;
    if (!tightest || result.remaining < tightest.remaining) {
      tightest = result;
    }
  }
  if (!tightest) throw new Error("No rate-limit identifier was available.");
  return tightest;
}

function setRateLimitHeaders(
  response: ServerResponse,
  result: RateLimitResult
) {
  response.setHeader("RateLimit-Limit", String(result.limit));
  response.setHeader("RateLimit-Remaining", String(result.remaining));
  response.setHeader("RateLimit-Reset", String(Math.ceil(result.reset / 1000)));
}

function rejectRateLimit(
  response: ServerResponse,
  result: RateLimitResult
) {
  setRateLimitHeaders(response, result);
  response.setHeader(
    "Retry-After",
    String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)))
  );
  sendJson(response, 429, { error: "Rate limit exceeded." });
}

function isToolCall(body: unknown) {
  return (
    typeof body === "object" &&
    body !== null &&
    "method" in body &&
    body.method === "tools/call"
  );
}

function validatePostHeaders(
  request: IncomingMessage,
  config: McpConfig
) {
  const contentType = request.headers["content-type"];
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json.");
  }
  const contentEncoding = request.headers["content-encoding"];
  if (contentEncoding && contentEncoding.toLowerCase() !== "identity") {
    throw new HttpError(415, "Compressed request bodies are not accepted.");
  }
  const contentLength = request.headers["content-length"];
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > config.maxBodyBytes
    ) {
      throw new HttpError(413, "Request body is too large.");
    }
  }
}

async function readJsonBody(
  request: IncomingMessage,
  maxBodyBytes: number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    request.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBodyBytes) {
        chunks.length = 0;
        if (!settled) {
          settled = true;
          reject(new HttpError(413, "Request body is too large."));
        }
        return;
      }
      if (!settled) chunks.push(chunk);
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Request body must contain valid JSON."));
      }
    });
    request.on("error", () => {
      if (settled) return;
      settled = true;
      reject(new HttpError(400, "Could not read request body."));
    });
  });
}

function safeLog(error: unknown) {
  if (error instanceof Error) {
    console.error("MCP request failed", {
      name: error.name,
      message: error.message
    });
    return;
  }
  console.error("MCP request failed");
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
  const rateLimiter = createRateLimiter(config);
  configureTenraiRequestGate(async () => {
    try {
      const result = await rateLimiter.checkTenraiRequest();
      if (!result.success) {
        throw new TenraiApiError(
          "Tenrai's shared request budget is temporarily exhausted. Try again shortly.",
          429
        );
      }
    } catch (error) {
      if (error instanceof TenraiApiError) throw error;
      safeLog(error);
      throw new TenraiApiError(
        "The shared Tenrai rate limiter is temporarily unavailable.",
        503
      );
    }
  });
  const secure = new URL(config.publicUrl).protocol === "https:";
  let activeRequests = 0;

  const server = createServer(
    {
      maxHeaderSize: config.maxHeaderBytes,
      requestTimeout: config.requestTimeoutMs,
      headersTimeout: config.headersTimeoutMs
    },
    async (request, response) => {
      setSecurityHeaders(response, secure);

      try {
        validateHost(request, config);
        applyCors(request, response, config);

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
          if (request.method !== "GET") {
            throw new HttpError(405, "Method not allowed.");
          }
          sendJson(response, 200, getProtectedResourceMetadata(config));
          return;
        }

        if (path === "/" || path === "/health") {
          if (request.method !== "GET") {
            throw new HttpError(405, "Method not allowed.");
          }
          sendJson(response, 200, {
            service: "banime-mcp",
            status: "ok",
            rate_limit_store: rateLimiter.store
          });
          return;
        }

        if (path !== "/mcp") {
          throw new HttpError(404, "Not found.");
        }
        if (!["GET", "POST", "DELETE"].includes(request.method ?? "")) {
          throw new HttpError(405, "Method not allowed.");
        }

        if (activeRequests >= config.maxConcurrentRequests) {
          response.setHeader("Retry-After", "1");
          sendJson(response, 503, {
            error: "The service is temporarily at capacity."
          });
          return;
        }
        activeRequests += 1;

        try {
          const accessToken = extractBearerToken(
            request.headers.authorization
          );
          const identifiers = rateLimitIdentifiers(
            request,
            config,
            accessToken
          );
          let requestLimit: RateLimitResult;
          try {
            requestLimit = await checkRateLimits(
              identifiers,
              rateLimiter.checkRequest
            );
          } catch (error) {
            safeLog(error);
            throw new HttpError(
              503,
              "Rate limit service is temporarily unavailable."
            );
          }
          setRateLimitHeaders(response, requestLimit);
          if (!requestLimit.success) {
            rejectRateLimit(response, requestLimit);
            return;
          }

          let parsedBody: unknown;
          if (request.method === "POST") {
            validatePostHeaders(request, config);
            parsedBody = await readJsonBody(request, config.maxBodyBytes);
            if (isToolCall(parsedBody)) {
              let toolLimit: RateLimitResult;
              try {
                toolLimit = await checkRateLimits(
                  identifiers,
                  rateLimiter.checkToolCall
                );
              } catch (error) {
                safeLog(error);
                throw new HttpError(
                  503,
                  "Rate limit service is temporarily unavailable."
                );
              }
              setRateLimitHeaders(response, toolLimit);
              if (!toolLimit.success) {
                rejectRateLimit(response, toolLimit);
                return;
              }
            }
          }

          const mcpServer = createBanimeMcpServer(config, accessToken);
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true
          });

          try {
            await mcpServer.connect(transport);
            await transport.handleRequest(request, response, parsedBody);
          } finally {
            await mcpServer.close().catch(() => undefined);
          }
        } finally {
          activeRequests -= 1;
        }
      } catch (error) {
        if (error instanceof HttpError) {
          if (!response.headersSent) {
            if (error.status === 405) {
              response.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
            }
            sendJson(response, error.status, { error: error.message });
          } else if (!response.writableEnded) {
            response.end();
          }
          return;
        }

        safeLog(error);
        if (!response.headersSent) {
          sendJson(response, 500, { error: "MCP request failed." });
        } else if (!response.writableEnded) {
          response.end();
        }
      }
    }
  );

  server.maxHeadersCount = 64;
  server.keepAliveTimeout = 5000;
  return server;
}
