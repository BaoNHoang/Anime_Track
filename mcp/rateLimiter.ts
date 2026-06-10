import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { McpConfig } from "./config";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface BanimeRateLimiter {
  checkRequest(identifier: string): Promise<RateLimitResult>;
  checkToolCall(identifier: string): Promise<RateLimitResult>;
  checkJikanRequest(): Promise<RateLimitResult>;
  store: "memory" | "upstash";
}

interface MemoryBucket {
  count: number;
  reset: number;
}

class MemoryRateLimiter {
  private readonly buckets = new Map<string, MemoryBucket>();
  private operations = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly prefix: string
  ) {}

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${this.prefix}:${identifier}`;
    const current = this.buckets.get(key);
    const bucket =
      !current || current.reset <= now
        ? { count: 0, reset: now + this.windowMs }
        : current;

    bucket.count += 1;
    if (!current && this.buckets.size >= 20_000) {
      const oldestKey = this.buckets.keys().next().value as
        | string
        | undefined;
      if (oldestKey) this.buckets.delete(oldestKey);
    }
    this.buckets.set(key, bucket);
    this.operations += 1;

    if (this.operations % 500 === 0 || this.buckets.size > 20_000) {
      for (const [bucketKey, value] of this.buckets) {
        if (value.reset <= now) this.buckets.delete(bucketKey);
      }
    }

    return {
      success: bucket.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      reset: bucket.reset
    };
  }
}

export function createRateLimiter(config: McpConfig): BanimeRateLimiter {
  const windowMs = config.rateLimit.windowSeconds * 1000;
  const { upstashUrl, upstashToken } = config.rateLimit;

  if (upstashUrl && upstashToken) {
    const redis = new Redis({ url: upstashUrl, token: upstashToken });
    const duration = `${config.rateLimit.windowSeconds} s` as const;
    const requestLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.rateLimit.requests,
        duration
      ),
      prefix: "banime:mcp:request"
    });
    const toolLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.rateLimit.toolCalls,
        duration
      ),
      prefix: "banime:mcp:tool"
    });
    const jikanLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.rateLimit.jikanRequests,
        "60 s"
      ),
      prefix: "banime:mcp:jikan"
    });

    return {
      store: "upstash",
      checkRequest: (identifier) => requestLimiter.limit(identifier),
      checkToolCall: (identifier) => toolLimiter.limit(identifier),
      checkJikanRequest: () => jikanLimiter.limit("global")
    };
  }

  const requestLimiter = new MemoryRateLimiter(
    config.rateLimit.requests,
    windowMs,
    "request"
  );
  const toolLimiter = new MemoryRateLimiter(
    config.rateLimit.toolCalls,
    windowMs,
    "tool"
  );
  const jikanLimiter = new MemoryRateLimiter(
    config.rateLimit.jikanRequests,
    60_000,
    "jikan"
  );

  return {
    store: "memory",
    checkRequest: (identifier) => requestLimiter.check(identifier),
    checkToolCall: (identifier) => toolLimiter.check(identifier),
    checkJikanRequest: () => jikanLimiter.check("global")
  };
}
