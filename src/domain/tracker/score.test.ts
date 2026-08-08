import { describe, expect, it } from "vitest";
import { normalizeUserScore } from "./score";

describe("normalizeUserScore", () => {
  it("keeps scores between 1 and 10", () => {
    expect(normalizeUserScore(1)).toBe(1);
    expect(normalizeUserScore(8.5)).toBe(8.5);
    expect(normalizeUserScore(10)).toBe(10);
  });

  it("clamps scores outside the supported range", () => {
    expect(normalizeUserScore(-1)).toBe(1);
    expect(normalizeUserScore(11)).toBe(10);
    expect(normalizeUserScore(100)).toBe(10);
  });

  it("rounds scores to the selected increment", () => {
    expect(normalizeUserScore(7.6, 1)).toBe(8);
    expect(normalizeUserScore(7.6, 0.5)).toBe(7.5);
    expect(normalizeUserScore(1.2, 1)).toBe(1);
  });

  it("clears missing or non-finite scores", () => {
    expect(normalizeUserScore(undefined)).toBeUndefined();
    expect(normalizeUserScore(Number.NaN)).toBeUndefined();
    expect(normalizeUserScore(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});
