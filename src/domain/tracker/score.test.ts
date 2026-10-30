import { describe, expect, it } from "vitest";
import { displayUserScore, normalizeStoredUserScore, normalizeUserScore } from "./score";

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

  it("supports whole and half-point scores from 1 to 100", () => {
    expect(normalizeUserScore(1, 1, 100)).toBe(0.1);
    expect(normalizeUserScore(1.5, 0.5, 100)).toBe(0.15);
    expect(normalizeUserScore(85.5, 0.5, 100)).toBe(8.55);
    expect(normalizeUserScore(85.5, 1, 100)).toBe(8.6);
    expect(normalizeUserScore(100, 0.5, 100)).toBe(10);
    expect(normalizeUserScore(101, 1, 100)).toBe(10);
  });

  it("displays existing scores on either scale without changing storage", () => {
    expect(displayUserScore(8.5, 10)).toBe(8.5);
    expect(displayUserScore(8.5, 100)).toBe(85);
    expect(displayUserScore(8.55, 100)).toBe(85.5);
    expect(displayUserScore(8.55, 10)).toBe(8.55);
    expect(normalizeStoredUserScore(8.55)).toBe(8.55);
  });

  it("clears missing or non-finite scores", () => {
    expect(normalizeUserScore(undefined)).toBeUndefined();
    expect(normalizeUserScore(Number.NaN)).toBeUndefined();
    expect(normalizeUserScore(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});
