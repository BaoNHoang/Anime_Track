import { afterEach, describe, expect, it, vi } from "vitest";
import { tenraiGet } from "./client";

describe("Tenrai client response limits", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an oversized response before decoding or caching it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", {
          status: 200,
          headers: { "Content-Length": String(2 * 1024 * 1024 + 1) }
        })
      )
    );

    await expect(tenraiGet("/oversized-test")).rejects.toThrow(
      "Tenrai returned too much data"
    );
  });

  it("stops reading an oversized streamed response without a length header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(`{"value":"${"x".repeat(2 * 1024 * 1024)}"}`, {
          status: 200
        })
      )
    );

    await expect(tenraiGet("/oversized-stream-test")).rejects.toThrow(
      "Tenrai returned too much data"
    );
  });
});
