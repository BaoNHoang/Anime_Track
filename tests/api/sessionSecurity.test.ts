import type { IncomingHttpHeaders } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { requireSameOrigin, type ApiRequest } from "../../api/_lib/http";
import { setSessionCookies } from "../../api/_lib/supabase";

const originalAppUrl = process.env.APP_URL;
const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
});

function requestWithOrigin(origin: string) {
  return {
    headers: { origin } as IncomingHttpHeaders
  } as ApiRequest;
}

describe("account session boundary", () => {
  it("rejects state-changing requests from another origin", () => {
    process.env.APP_URL = "https://banime.example";
    expect(() =>
      requireSameOrigin(requestWithOrigin("https://banime.example"))
    ).not.toThrow();
    expect(() =>
      requireSameOrigin(requestWithOrigin("https://attacker.example"))
    ).toThrow("Request origin is not allowed.");
  });

  it("sets HttpOnly, SameSite, secure production cookies", () => {
    process.env.APP_URL = "https://banime.example";
    process.env.VERCEL_ENV = "production";
    const headers = new Map<string, string | string[] | number>();
    const response = {
      getHeader: (name: string) => headers.get(name),
      setHeader: (
        name: string,
        value: string | string[] | number
      ) => headers.set(name, value)
    };
    setSessionCookies(
      response as never,
      {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600
      } as Session
    );

    const cookies = headers.get("Set-Cookie");
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies).toHaveLength(2);
    for (const value of cookies as string[]) {
      expect(value).toContain("HttpOnly");
      expect(value).toContain("SameSite=Lax");
      expect(value).toContain("Secure");
      expect(value).toContain("Path=/");
    }
  });
});
