import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const memoryLimits = new Map<string, { count: number; reset: number }>();
let redis: Redis | undefined;
const distributedLimiters = new Map<string, Ratelimit>();

export function sendJson(
  response: ServerResponse,
  status: number,
  value: Record<string, unknown>
) {
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(value));
}

export function sendError(response: ServerResponse, error: unknown) {
  if (error instanceof ApiError) {
    sendJson(response, error.status, { error: error.message });
    return;
  }
  console.error("Account API request failed", {
    name: error instanceof Error ? error.name : "UnknownError"
  });
  sendJson(response, 500, { error: "The request could not be completed." });
}

export function requireMethod(
  request: ApiRequest,
  allowed: string | string[]
) {
  const methods = Array.isArray(allowed) ? allowed : [allowed];
  if (!request.method || !methods.includes(request.method)) {
    throw new ApiError(405, "Method not allowed.");
  }
}

export async function readJson(
  request: ApiRequest,
  maxBytes = 64 * 1024
): Promise<unknown> {
  const contentType = request.headers["content-type"];
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "Content-Type must be application/json.");
  }
  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > maxBytes
  ) {
    throw new ApiError(413, "Request body is too large.");
  }
  if (request.body !== undefined) {
    if (typeof request.body === "string") {
      if (Buffer.byteLength(request.body) > maxBytes) {
        throw new ApiError(413, "Request body is too large.");
      }
      try {
        return JSON.parse(request.body) as unknown;
      } catch {
        throw new ApiError(400, "Request body must contain valid JSON.");
      }
    }
    return request.body;
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      throw new ApiError(413, "Request body is too large.");
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ApiError(400, "Request body must contain valid JSON.");
  }
}

function configuredOrigin() {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) return undefined;
  try {
    return new URL(appUrl).origin;
  } catch {
    throw new ApiError(500, "APP_URL is invalid.");
  }
}

export function requireSameOrigin(request: ApiRequest) {
  const origin = request.headers.origin;
  if (!origin) {
    throw new ApiError(403, "Request origin is required.");
  }
  const expected = configuredOrigin();
  if (expected && origin === expected) return;
  if (
    process.env.VERCEL_ENV !== "production" &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  ) {
    return;
  }
  throw new ApiError(403, "Request origin is not allowed.");
}

export function appUrl(request: ApiRequest) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_ENV === "production") {
    throw new ApiError(500, "APP_URL is not configured.");
  }
  const host = request.headers.host;
  if (!host) throw new ApiError(400, "Request host is missing.");
  return `http://${host}`;
}

function clientIp(request: ApiRequest) {
  const forwarded = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",", 1)[0]?.trim() || request.socket.remoteAddress || "unknown";
}

function rateLimitKey(
  request: ApiRequest,
  action: string,
  subject?: string
) {
  const subjectHash = subject
    ? createHash("sha256").update(subject).digest("hex").slice(0, 20)
    : "none";
  return `${action}:${clientIp(request)}:${subjectHash}`;
}

export async function enforceAuthRateLimit(
  request: ApiRequest,
  action: string,
  options: { limit: number; windowSeconds: number; subject?: string }
) {
  const key = rateLimitKey(request, action, options.subject);
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    redis ??= new Redis({ url: upstashUrl, token: upstashToken });
    const limiterKey = `${action}:${options.limit}:${options.windowSeconds}`;
    let limiter = distributedLimiters.get(limiterKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          options.limit,
          `${options.windowSeconds} s`
        ),
        prefix: `banime:account:${action}`
      });
      distributedLimiters.set(limiterKey, limiter);
    }
    const result = await limiter.limit(key);
    if (!result.success) {
      throw new ApiError(429, "Too many attempts. Try again later.");
    }
    return;
  }

  const now = Date.now();
  const current = memoryLimits.get(key);
  const bucket =
    !current || current.reset <= now
      ? { count: 0, reset: now + options.windowSeconds * 1000 }
      : current;
  bucket.count += 1;
  memoryLimits.set(key, bucket);
  if (bucket.count > options.limit) {
    throw new ApiError(429, "Too many attempts. Try again later.");
  }
  if (memoryLimits.size > 10_000) {
    for (const [entry, value] of memoryLimits) {
      if (value.reset <= now) memoryLimits.delete(entry);
    }
  }
}

export function routeParameter(request: ApiRequest, name: string) {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}
