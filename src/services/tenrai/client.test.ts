import { afterEach, describe, expect, it, vi } from "vitest";
import { configureTenraiRequestGate, tenraiGet } from "./client";

describe("Tenrai client response limits", () => {
  afterEach(() => {
    configureTenraiRequestGate(undefined);
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

  it("skips the request gate when a queued request has been cancelled", async () => {
    const gateResolvers: Array<() => void> = [];
    const gate = vi.fn(
      () => new Promise<void>((resolve) => gateResolvers.push(resolve))
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    configureTenraiRequestGate(gate);

    const first = tenraiGet("/active-queue-test");
    await vi.waitFor(() => expect(gate).toHaveBeenCalledTimes(1));

    const controller = new AbortController();
    const cancelled = tenraiGet("/cancelled-queue-test", {
      signal: controller.signal
    });
    controller.abort();
    gateResolvers[0]();

    await expect(first).resolves.toEqual({});
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    expect(gate).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
