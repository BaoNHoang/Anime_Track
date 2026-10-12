import { describe, expect, it } from "vitest";
import { layoutAnimeConnections, type MapPoint } from "./connectionMapLayout";
import type { ConnectedAnime, ConnectionFacet } from "./connectionMap";
import type { Anime } from "./types";

const facet = (key: string, parentKey?: string): ConnectionFacet => ({
  key, parentKey, kind: "genre", label: key
});
const neighbor = (id: number, via: string): ConnectedAnime => ({
  anime: { id } as Anime, via, sharedKeys: [via]
});

function crosses(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint) {
  const orient = (p: MapPoint, q: MapPoint, r: MapPoint) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const abC = orient(a, b, c);
  const abD = orient(a, b, d);
  const cdA = orient(c, d, a);
  const cdB = orient(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

describe("layoutAnimeConnections", () => {
  const cases = [
    {
      facets: [facet("a"), facet("b"), facet("c"), facet("d")],
      neighbors: [neighbor(1, "a"), neighbor(2, "b"), neighbor(3, "b"),
        neighbor(4, "b"), neighbor(5, "c"), neighbor(6, "d")]
    },
    {
      facets: [facet("genre"), facet("studio-a", "genre"), facet("studio-b", "genre"), facet("studio-c", "genre")],
      neighbors: [neighbor(1, "genre"), neighbor(2, "studio-a"), neighbor(3, "studio-a"),
        neighbor(4, "studio-b"), neighbor(5, "studio-c"), neighbor(6, "studio-c")]
    },
    {
      facets: [facet("genre"), facet("studio", "genre"), facet("other-a"), facet("other-b")],
      neighbors: Array.from({ length: 6 }, (_, index) => neighbor(index + 1, "studio"))
    }
  ];

  it.each(cases)("keeps all branches separate across shuffled layouts", ({ facets, neighbors }) => {
    for (let seed = 0; seed < 30; seed++) {
      const layout = layoutAnimeConnections(facets, neighbors, seed);
      const edges: Array<[MapPoint, MapPoint]> = [
        ...facets.map((item): [MapPoint, MapPoint] => [
          layout.facets.get(item.parentKey ?? "") ?? layout.center, layout.facets.get(item.key)!
        ]),
        ...neighbors.flatMap((item): Array<[MapPoint, MapPoint]> => {
          const from = layout.facets.get(item.via)!;
          const to = layout.anime.get(item.anime.id)!;
          const bend = layout.animeBends.get(item.anime.id);
          return bend ? [[from, bend], [bend, to]] : [[from, to]];
        })
      ];
      for (let left = 0; left < edges.length; left++) {
        for (let right = left + 1; right < edges.length; right++) {
          expect(crosses(...edges[left], ...edges[right]),
            `seed ${seed}: ${JSON.stringify(edges[left])} crosses ${JSON.stringify(edges[right])}`).toBe(false);
        }
      }
      expect(new Set(neighbors.map((item) => layout.anime.get(item.anime.id)?.x)).size).toBe(neighbors.length);
      expect(layout.width).toBeGreaterThanOrEqual(1000);
      // The center poster and two-line title need roughly 100px above their anchor.
      expect(layout.center.y - 100).toBeGreaterThanOrEqual(40);
      expect(layout.height - Math.max(...[...layout.anime.values()].map((point) => point.y + 90))).toBeGreaterThanOrEqual(40);
    }
  });
});
