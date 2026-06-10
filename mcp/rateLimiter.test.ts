import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimiter";
import { createTestConfig } from "./testConfig";

describe("Banime rate limiter", () => {
  it("applies independent request, tool, and Jikan budgets", async () => {
    const limiter = createRateLimiter(
      createTestConfig({
        rateLimit: {
          requests: 1,
          toolCalls: 1,
          jikanRequests: 1,
          windowSeconds: 60
        }
      })
    );

    expect((await limiter.checkRequest("ip:test")).success).toBe(true);
    expect((await limiter.checkRequest("ip:test")).success).toBe(false);
    expect((await limiter.checkToolCall("ip:test")).success).toBe(true);
    expect((await limiter.checkToolCall("ip:test")).success).toBe(false);
    expect((await limiter.checkJikanRequest()).success).toBe(true);
    expect((await limiter.checkJikanRequest()).success).toBe(false);
  });
});
