import { describe, expect, it } from "vitest";
import { accountFavorites } from "./accountValidation";

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
