import { describe, expect, it } from "vitest";
import {
  accountFavorites,
  passkeyCredential,
  passkeyUuid
} from "./accountValidation.js";

const emptyFavorites = {
  anime: [],
  studios: [],
  directors: [],
  characters: []
};

describe("accountFavorites", () => {
  it("accepts a bounded ordered favorites payload", () => {
    expect(accountFavorites({
      ...emptyFavorites,
      anime: [{ id: 20, name: "Naruto", imageUrl: "https://cdn.myanimelist.net/images/anime/1/20.jpg" }]
    }).anime[0]).toMatchObject({ id: 20, name: "Naruto" });
  });

  it("rejects unsupported fields and unsafe image URLs", () => {
    expect(() => accountFavorites({ ...emptyFavorites, admin: true })).toThrow();
    expect(() => accountFavorites({
      ...emptyFavorites,
      anime: [{ id: 20, name: "Naruto", imageUrl: "javascript:alert(1)" }]
    })).toThrow();
  });
});

describe("passkey validation", () => {
  it("accepts a bounded WebAuthn response", () => {
    expect(passkeyUuid(
      "123e4567-e89b-42d3-a456-426614174000",
      "Challenge"
    )).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(passkeyCredential({
      id: "credential-id",
      rawId: "credential-id",
      type: "public-key",
      response: { clientDataJSON: "encoded" },
      clientExtensionResults: {}
    })).toMatchObject({ type: "public-key" });
  });

  it("rejects malformed identifiers and credentials", () => {
    expect(() => passkeyUuid("not-a-uuid", "Challenge")).toThrow();
    expect(() => passkeyCredential({
      id: "credential-id",
      rawId: "credential-id",
      type: "password",
      response: {}
    })).toThrow("Passkey response is invalid");
  });
});
