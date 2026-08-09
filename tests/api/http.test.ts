import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApiError,
  appUrl,
  enforceAuthRateLimit,
  readJson,
  requireMethod,
  requireSameOrigin,
  sendError,
  type ApiRequest
} from "../../api/_lib/http";

const originalAppUrl = process.env.APP_URL;
const originalVercelEnv = process.env.VERCEL_ENV;
const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
  if (originalUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
  if (originalUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
});

function request(
  headers: Record<string, string | undefined> = {},
  body?: unknown
) {
  return { headers, body } as ApiRequest;
}

function response() {
  const headers = new Map<string, string | string[]>();
  let body = "";
  return {
    headers,
    get body() {
      return body;
    },
    setHeader: (name: string, value: string | string[]) => headers.set(name, value),
    end: (value?: string) => {
      body = value ?? "";
    }
  };
}

describe("HTTP API boundary", () => {
  it("rejects malformed, oversized, and non-JSON request bodies", async () => {
    await expect(readJson(request())).rejects.toThrow(
      "Content-Type must be application/json."
    );
    await expect(
      readJson(request({ "content-type": "application/json" }, "{"))
    ).rejects.toThrow("Request body must contain valid JSON.");
    await expect(
      readJson(
        request(
          { "content-type": "application/json", "content-length": "99" },
          "{}"
        ),
        10
      )
    ).rejects.toThrow("Request body is too large.");
  });

  it("enforces byte limits while reading streamed JSON", async () => {
    const streamed = Object.assign(Readable.from(["{\"value\":\"", "too long\"}"]), {
      headers: { "content-type": "application/json" }
    }) as ApiRequest;
    await expect(readJson(streamed, 8)).rejects.toThrow(
      "Request body is too large."
    );
  });

  it("enforces byte limits on pre-parsed JSON bodies", async () => {
    await expect(
      readJson(
        request({ "content-type": "application/json" }, { value: "too long" }),
        8
      )
    ).rejects.toThrow("Request body is too large.");
  });

  it("allows only configured same-origin state changes", () => {
    process.env.APP_URL = "https://banime.example";
    process.env.VERCEL_ENV = "production";
    expect(() =>
      requireSameOrigin(request({ origin: "https://banime.example" }))
    ).not.toThrow();
    expect(() => requireSameOrigin(request())).toThrow("Request origin is required.");
    expect(() =>
      requireSameOrigin(request({ origin: "http://localhost:5173" }))
    ).toThrow("Request origin is not allowed.");
  });

  it("does not disclose unexpected error details to clients", () => {
    const result = response();
    sendError(result as never, new Error("database password leaked"));
    expect(result.body).toBe('{"error":"The request could not be completed."}');
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns intentional API errors without converting them to server errors", () => {
    const result = response();
    sendError(result as never, new ApiError(403, "Request origin is not allowed."));
    expect(result.body).toBe('{"error":"Request origin is not allowed."}');
  });

  it("rejects unsupported HTTP methods", () => {
    expect(() => requireMethod(request(), "POST")).toThrow("Method not allowed.");
  });

  it("requires APP_URL for production redirects", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.APP_URL;
    expect(() => appUrl(request({ host: "attacker.example" }))).toThrow(
      "APP_URL is not configured."
    );
  });

  it("throttles repeated account actions", async () => {
    const rateLimitedRequest = request({ "x-forwarded-for": "203.0.113.99" });
    await expect(
      enforceAuthRateLimit(rateLimitedRequest, "test-login-rate-limit", {
        limit: 1,
        windowSeconds: 60,
        subject: "person@example.com"
      })
    ).resolves.toBeUndefined();
    await expect(
      enforceAuthRateLimit(rateLimitedRequest, "test-login-rate-limit", {
        limit: 1,
        windowSeconds: 60,
        subject: "person@example.com"
      })
    ).rejects.toThrow("Too many attempts. Try again later.");
  });

  it("limits account subjects and source addresses independently", async () => {
    await enforceAuthRateLimit(
      request({ "x-forwarded-for": "203.0.113.10" }),
      "independent-subject-limit",
      { limit: 1, ipLimit: 10, windowSeconds: 60, subject: "target@example.com" }
    );
    await expect(
      enforceAuthRateLimit(
        request({ "x-forwarded-for": "203.0.113.11" }),
        "independent-subject-limit",
        { limit: 1, ipLimit: 10, windowSeconds: 60, subject: "target@example.com" }
      )
    ).rejects.toThrow("Too many attempts");

    await enforceAuthRateLimit(
      request({ "x-forwarded-for": "203.0.113.12" }),
      "independent-ip-limit",
      { limit: 10, ipLimit: 1, windowSeconds: 60, subject: "first@example.com" }
    );
    await expect(
      enforceAuthRateLimit(
        request({ "x-forwarded-for": "203.0.113.12" }),
        "independent-ip-limit",
        { limit: 10, ipLimit: 1, windowSeconds: 60, subject: "second@example.com" }
      )
    ).rejects.toThrow("Too many attempts");
  });

  it("fails closed in production without distributed rate limiting", async () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    await expect(
      enforceAuthRateLimit(request(), "production-limit", {
        limit: 1,
        windowSeconds: 60
      })
    ).rejects.toThrow("Rate limiting is temporarily unavailable");
  });
});
