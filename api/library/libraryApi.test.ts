import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiRequest } from "../_lib/http";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn()
}));

vi.mock("../_lib/supabase.js", () => ({
  authenticateRequest: mocks.authenticateRequest
}));

import libraryHandler from "./index";
import deleteHandler from "./[animeId]";

function response() {
  const headers = new Map<string, string | string[]>();
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
    getHeader: (name: string) => headers.get(name),
    setHeader: (name: string, value: string | string[]) => headers.set(name, value),
    end: (value?: string) => {
      body = value ?? "";
    }
  };
}

describe("private library API", () => {
  it("scopes a library read to the authenticated user", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ item: { id: 1 } }], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "user-a" },
      client: { from: vi.fn().mockReturnValue({ select }) }
    });
    const result = response();

    await libraryHandler({ method: "GET", headers: {} } as ApiRequest, result as never);

    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('{"items":[{"id":1}]}');
  });

  it("scopes a delete to the authenticated user and validated numeric ID", async () => {
    const eqAnime = vi.fn().mockResolvedValue({ error: null });
    const eqUser = vi.fn().mockReturnValue({ eq: eqAnime });
    const remove = vi.fn().mockReturnValue({ eq: eqUser });
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "user-a" },
      client: { from: vi.fn().mockReturnValue({ delete: remove }) }
    });
    const result = response();

    await deleteHandler(
      {
        method: "DELETE",
        headers: { origin: "http://localhost:5173" },
        query: { animeId: "42" }
      } as unknown as ApiRequest,
      result as never
    );

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-a");
    expect(eqAnime).toHaveBeenCalledWith("anime_id", 42);
    expect(result.body).toBe('{"removed":42}');
  });

  it("does not query data when session authentication fails", async () => {
    mocks.authenticateRequest.mockRejectedValue(
      new ApiError(401, "Authentication required.")
    );
    const result = response();

    await libraryHandler({ method: "GET", headers: {} } as ApiRequest, result as never);

    expect(result.statusCode).toBe(401);
    expect(result.body).toBe('{"error":"Authentication required."}');
  });
});
