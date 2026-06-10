import { describe, expect, it } from "vitest";
import {
  escapePostgresLikePattern,
  hasUnsafeControlCharacters,
  safeExternalUrl,
  truncateExternalText
} from "./validation";

describe("security validation", () => {
  it("only accepts credential-free HTTPS external URLs", () => {
    expect(safeExternalUrl("https://example.com/anime")).toBe(
      "https://example.com/anime"
    );
    expect(safeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(
      safeExternalUrl("https://user:password@example.com")
    ).toBeUndefined();
  });

  it("detects or removes unsafe control and direction characters", () => {
    expect(hasUnsafeControlCharacters("safe text")).toBe(false);
    expect(hasUnsafeControlCharacters("unsafe\u0000text")).toBe(true);
    expect(truncateExternalText("a\u202Eb", 10)).toBe("ab");
  });

  it("escapes wildcard characters used by ILIKE", () => {
    expect(escapePostgresLikePattern("100%_match\\test")).toBe(
      "100\\%\\_match\\\\test"
    );
  });
});
