import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiRequest } from "../../api/_lib/http";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));

vi.mock("../../api/_lib/supabase.js", () => ({
  authenticateRequest: mocks.authenticateRequest
}));

import pushHandler from "../../api/push/index";

function response() {
  const headers = new Map<string, string | string[]>();
  let statusCode = 200;
  let body = "";
  return {
    get statusCode() { return statusCode; },
    set statusCode(value: number) { statusCode = value; },
    get body() { return body; },
    getHeader: (name: string) => headers.get(name),
    setHeader: (name: string, value: string | string[]) => headers.set(name, value),
    end: (value?: string) => { body = value ?? ""; }
  };
}

function client() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const deleteEndpoint = vi.fn().mockResolvedValue({ error: null });
  const deleteUser = vi.fn().mockReturnValue({ eq: deleteEndpoint });
  const from = vi.fn().mockReturnValue({
    upsert,
    delete: vi.fn().mockReturnValue({ eq: deleteUser })
  });
  return { from, upsert, deleteEndpoint };
}

function request(method: "PUT" | "DELETE", endpoint: string) {
  return {
    method,
    headers: {
      origin: "http://localhost:5173",
      "content-type": "application/json",
      "x-banime-user": "user-a"
    },
    body: {
      endpoint,
      keys: { p256dh: "p".repeat(64), auth: "a".repeat(16) }
    }
  } as unknown as ApiRequest;
}

describe("private push API", () => {
  beforeEach(() => mocks.authenticateRequest.mockReset());

  it("stores a supported browser-generated endpoint", async () => {
    const database = client();
    mocks.authenticateRequest.mockResolvedValue({ user: { id: "user-a" }, client: database });
    const result = response();

    await pushHandler(request("PUT", "https://fcm.googleapis.com/fcm/send/device-token"), result as never);

    expect(result.statusCode).toBe(200);
    expect(database.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-a", endpoint: "https://fcm.googleapis.com/fcm/send/device-token" }),
      { onConflict: "endpoint" }
    );
  });

  it("rejects an arbitrary HTTPS host before saving", async () => {
    const database = client();
    mocks.authenticateRequest.mockResolvedValue({ user: { id: "user-a" }, client: database });
    const result = response();

    await pushHandler(request("PUT", "https://example.com/push"), result as never);

    expect(result.statusCode).toBe(400);
    expect(database.upsert).not.toHaveBeenCalled();
  });

  it("still lets an account remove a legacy unsupported endpoint", async () => {
    const database = client();
    mocks.authenticateRequest.mockResolvedValue({ user: { id: "user-a" }, client: database });
    const result = response();

    await pushHandler(request("DELETE", "https://example.com/push"), result as never);

    expect(result.statusCode).toBe(200);
    expect(database.deleteEndpoint).toHaveBeenCalledWith("endpoint", "https://example.com/push");
  });
});
