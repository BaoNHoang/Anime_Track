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

  it("binds writes to the expected user and chunks bulk imports", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response('{"saved":1}', {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const items = Array.from({ length: 201 }, (_, index) => ({
      anime: { id: index + 1 }
    })) as never;

    await trackerCloudRepository.upsertMany(items, "user-a");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.headers["X-Banime-User"]).toBe("user-a");
      expect(JSON.parse(options.body).items.length).toBeLessThanOrEqual(100);
    }
  });
});
