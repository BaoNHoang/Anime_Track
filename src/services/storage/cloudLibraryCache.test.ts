import { describe, expect, it } from "vitest";
import { isFreshCloudLibrary } from "./cloudLibraryCache";

describe("cloud library freshness", () => {
  const now = 1_800_000;

  it("uses a recently verified library without another cloud read", () => {
    expect(isFreshCloudLibrary({ verifiedAt: now - 60_000 }, now)).toBe(true);
  });

  it("refreshes old, locally edited, or unverified libraries", () => {
    expect(isFreshCloudLibrary({ verifiedAt: now - 120_000 }, now)).toBe(false);
    expect(isFreshCloudLibrary({ verifiedAt: undefined }, now)).toBe(false);
    expect(isFreshCloudLibrary({ verifiedAt: 0 }, now)).toBe(false);
    expect(isFreshCloudLibrary({ verifiedAt: now + 1 }, now)).toBe(false);
  });
});
