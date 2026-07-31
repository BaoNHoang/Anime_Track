import { describe, expect, it } from "vitest";
import {
  accountEmail,
  accountPassword,
  accountUsername,
  loginIdentifier,
  verificationCode
} from "./accountValidation";

describe("account validation", () => {
  it("normalizes emails and login identifiers", () => {
    expect(accountEmail(" Person@Example.COM ")).toBe(
      "person@example.com"
    );
    expect(loginIdentifier("  Anime_Fan  ")).toBe("anime_fan");
  });

  it("accepts bounded usernames and rejects unsafe aliases", () => {
    expect(accountUsername("Anime_Fan12")).toBe("Anime_Fan12");
    expect(() => accountUsername("two words")).toThrow();
    expect(() => accountUsername("../admin")).toThrow();
  });

  it("requires a strong bounded password", () => {
    expect(accountPassword("StrongPassword7")).toBe("StrongPassword7");
    expect(() => accountPassword("alllowercase7")).toThrow();
    expect(() => accountPassword("NoNumberPassword")).toThrow();
  });

  it("accepts numeric one-time codes only", () => {
    expect(verificationCode("123456", "Code")).toBe("123456");
    expect(() => verificationCode("12A456", "Code")).toThrow();
  });
});
