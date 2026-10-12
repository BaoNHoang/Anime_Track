import { describe, expect, it } from "vitest";
import { mapFacetParam, readConnectionMapUrl } from "./connectionMapUrl";

describe("connection map URL", () => {
  it("restores anime, facet, bridge, page and shuffle seed", () => {
    const state = readConnectionMapUrl(new URLSearchParams(
      "view=map&anime=123&facet=studio%3AJ.C.Staff&bridge=genre%3AComedy&mapPage=4&mapSeed=29"
    ));
    expect(state.animeId).toBe(123);
    expect(state.facet).toEqual({ kind: "studio", label: "J.C.Staff", key: "studio:j.c.staff" });
    expect(state.bridgeGenre?.key).toBe("genre:comedy");
    expect(state.page).toBe(4);
    expect(state.seed).toBe(29);
    expect(mapFacetParam(state.facet!)).toBe("studio:J.C.Staff");
  });

  it("ignores malformed and excessive values", () => {
    const state = readConnectionMapUrl(new URLSearchParams(
      `anime=-2&facet=genre%3A${"x".repeat(300)}&bridge=genre%3AComedy&mapPage=999&mapSeed=0`
    ));
    expect(state).toEqual({ animeId: undefined, facet: undefined, bridgeGenre: undefined, page: 1, seed: 1 });
  });

  it("only accepts a genre bridge for a studio facet", () => {
    const state = readConnectionMapUrl(new URLSearchParams("facet=genre%3ARomance&bridge=genre%3AComedy"));
    expect(state.bridgeGenre).toBeUndefined();
  });
});
