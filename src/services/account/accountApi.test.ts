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
});
