import { afterEach, describe, expect, it, vi } from "vitest";
import { trackerCloudRepository } from "./trackerCloudRepository";

describe("trackerCloudRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replaces a non-JSON server error with actionable sync guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("A server error occurred", {
          status: 500,
          headers: { "Content-Type": "text/html" }
        })
      )
    );

    await expect(trackerCloudRepository.getAll()).rejects.toThrow(
      "Cloud sync is temporarily unavailable. Try again shortly."
    );
  });
});
