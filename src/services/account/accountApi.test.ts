import { afterEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "./accountApi";

describe("account API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("identifies a non-JSON response instead of reporting a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>Not an API response</html>", {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        })
      )
    );

    const result = await accountApi.session();

    expect(result.error).toContain("account API is not running");
  });

  it("sends passkey verification through the same-origin account API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Passkey added." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await accountApi.verifyPasskeyRegistration(
      "123e4567-e89b-42d3-a456-426614174000",
      { id: "credential" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/passkey-register-verify",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin"
      })
    );
  });
});
