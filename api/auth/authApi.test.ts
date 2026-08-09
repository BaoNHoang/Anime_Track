import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest } from "../_lib/http";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createPublicClient: vi.fn()
}));

vi.mock("../_lib/supabase.js", () => ({
  PKCE_COOKIE: "pkce",
  REFRESH_COOKIE: "refresh",
  accountUser: vi.fn(),
  authenticateRequest: vi.fn(),
  clearPkceCookie: vi.fn(),
  clearSessionCookies: vi.fn(),
  createAdminClient: mocks.createAdminClient,
  createPublicClient: mocks.createPublicClient,
  createUserClient: vi.fn(),
  readCookie: vi.fn(),
  setPkceCookie: vi.fn(),
  setSessionCookies: vi.fn()
}));

import authHandler from "./[action]";

function response() {
  let statusCode = 200;
  let body = "";
  return {
    get statusCode() {
      return statusCode;
    },
    set statusCode(value: number) {
      statusCode = value;
    },
    get body() {
      return body;
    },
    setHeader: vi.fn(),
    end: (value?: string) => {
      body = value ?? "";
    }
  };
}

function signupRequest(ip: string) {
  return {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      host: "localhost:5173",
      "content-type": "application/json",
      "x-forwarded-for": ip
    },
    query: { action: "signup" },
    body: {
      email: "person@example.com",
      username: "person_name",
      password: "StrongPassword123"
    }
  } as unknown as ApiRequest;
}

describe("signup privacy", () => {
  beforeEach(() => {
    mocks.createAdminClient.mockReset();
    mocks.createPublicClient.mockReset();
  });

  it("does not reveal whether the username or email already exists", async () => {
    const messages: string[] = [];

    mocks.createAdminClient.mockReturnValueOnce({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { user_id: "existing" } }) })
        })
      })
    });
    let result = response();
    await authHandler(signupRequest("203.0.113.21"), result as never);
    expect(result.statusCode).toBe(200);
    messages.push(JSON.parse(result.body).message);

    mocks.createAdminClient.mockReturnValueOnce({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) })
      })
    });
    mocks.createPublicClient.mockReturnValueOnce({
      auth: { signUp: async () => ({ data: { user: { identities: [] } }, error: null }) }
    });
    result = response();
    await authHandler(signupRequest("203.0.113.22"), result as never);
    expect(result.statusCode).toBe(200);
    messages.push(JSON.parse(result.body).message);

    mocks.createAdminClient.mockReturnValueOnce({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) })
      })
    });
    mocks.createPublicClient.mockReturnValueOnce({
      auth: {
        signUp: async () => ({
          data: { user: { identities: [{ id: "new" }] }, session: null },
          error: null
        })
      }
    });
    result = response();
    await authHandler(signupRequest("203.0.113.23"), result as never);
    expect(result.statusCode).toBe(200);
    messages.push(JSON.parse(result.body).message);

    expect(new Set(messages).size).toBe(1);
  });
});
