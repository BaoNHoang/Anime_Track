import { describe, expect, it } from "vitest";
import {
  accountDeletionConfirmation,
  accountEmail,
  accountAvatarId,
  accountPassword,
  accountScoreStep,
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

  it("accepts only bundled profile pictures", () => {
    expect(accountAvatarId("female-05")).toBe("female-05");
    expect(() => accountAvatarId("../../secret")).toThrow();
    expect(() => accountAvatarId("unknown-avatar")).toThrow();
  });

  it("accepts whole-number or half-step score preferences", () => {
    expect(accountScoreStep(1)).toBe(1);
    expect(accountScoreStep(0.5)).toBe(0.5);
    expect(() => accountScoreStep(0.25)).toThrow();
    expect(() => accountScoreStep("0.5")).toThrow();
  });

  it("requires the exact account deletion confirmation", () => {
    expect(accountDeletionConfirmation("DELETE")).toBe("DELETE");
    expect(() => accountDeletionConfirmation("delete")).toThrow();
    expect(() => accountDeletionConfirmation(undefined)).toThrow();
  });
});
