import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest } from "../../api/_lib/http";

const mocks = vi.hoisted(() => ({
  accountUser: vi.fn(),
  authenticateRequest: vi.fn(),
  upload: vi.fn()
}));

vi.mock("../../api/_lib/supabase.js", () => ({
  PKCE_COOKIE: "pkce",
  REFRESH_COOKIE: "refresh",
  accountUser: mocks.accountUser,
  authenticateRequest: mocks.authenticateRequest,
  clearPkceCookie: vi.fn(),
  clearSessionCookies: vi.fn(),
  createAdminClient: vi.fn(),
  createPublicClient: vi.fn(),
  createUserClient: vi.fn(),
  readCookie: vi.fn(),
  setPkceCookie: vi.fn(),
  setSessionCookies: vi.fn()
}));

import authHandler from "../../api/auth/[action]";

function response() {
  let statusCode = 200;
  let body = "";
  return {
    get statusCode() { return statusCode; },
    set statusCode(value: number) { statusCode = value; },
    get body() { return body; },
    setHeader: vi.fn(),
    end: (value?: string) => { body = value ?? ""; }
  };
}

function request(dataUrl: string, origin = "http://localhost:5173") {
  return {
    method: "POST",
    headers: {
      origin,
      host: "localhost:5173",
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.91"
    },
    query: { action: "profile-media" },
    body: { kind: "avatar", dataUrl }
  } as unknown as ApiRequest;
}

describe("profile media API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const profileUpdate = {
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
    };
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "11111111-1111-1111-1111-111111111111" },
      client: {
        storage: { from: () => ({ upload: mocks.upload }) },
        from: () => profileUpdate
      }
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.accountUser.mockResolvedValue({ id: "user" });
  });

  it("stores only a sanitized WebP at the authenticated fixed path", async () => {
    const source = await sharp({
      create: {
        width: 700,
        height: 900,
        channels: 3,
        background: "#ef5f6b"
      }
    }).png().toBuffer();
    const dataUrl = `data:image/png;base64,${source.toString("base64")}`;
    const result = response();

    await authHandler(request(dataUrl), result as never);

    expect(result.statusCode).toBe(200);
    expect(mocks.upload).toHaveBeenCalledOnce();
    const [path, output, options] = mocks.upload.mock.calls[0];
    expect(path).toBe("11111111-1111-1111-1111-111111111111/avatar.webp");
    expect(options).toMatchObject({ contentType: "image/webp", upsert: true });
    expect((await sharp(output).metadata()).format).toBe("webp");
  });

  it("rejects forged image payloads before storage", async () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    const result = response();

    await authHandler(
      request(`data:image/png;base64,${svg.toString("base64")}`),
      result as never
    );

    expect(result.statusCode).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects cross-origin uploads before authentication", async () => {
    const result = response();
    await authHandler(request("data:image/png;base64,AAAA", "https://evil.example"), result as never);

    expect(result.statusCode).toBe(403);
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
