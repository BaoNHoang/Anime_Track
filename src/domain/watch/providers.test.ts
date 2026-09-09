import { describe, expect, it } from "vitest";
import { DEFAULT_STREAMING_REGION, getStreamingRegionLabel } from "./providers";

describe("streaming regions", () => {
  it("uses a safe default when the selected region is unknown", () => {
    expect(DEFAULT_STREAMING_REGION).toBe("US");
    expect(getStreamingRegionLabel("unknown")).toBe("United States");
  });
});
