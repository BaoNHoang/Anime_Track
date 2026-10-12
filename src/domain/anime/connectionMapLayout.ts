import { shuffleMapItems, type ConnectedAnime, type ConnectionFacet } from "./connectionMap";

export interface MapPoint { x: number; y: number }

export interface ConnectionMapLayout {
  width: number;
  height: number;
  center: MapPoint;
  facets: Map<string, MapPoint>;
  anime: Map<number, MapPoint>;
  animeBends: Map<number, MapPoint>;
}

const LEAF_SPACING = 150;
const SIDE_PADDING = 100;
const TOP_INSET = 64;
const ROOT_Y = 250 + TOP_INSET;
const CHILD_Y = 410 + TOP_INSET;
const ANIME_Y = 610 + TOP_INSET;

// Each branch owns a consecutive run of leaf slots. Edges between layers can
// therefore meet at their parent, but cannot cross another branch's edges.
export function layoutAnimeConnections(
  facets: ConnectionFacet[],
  neighbors: ConnectedAnime[],
  seed = 0
): ConnectionMapLayout {
  const positions = new Map<string, MapPoint>();
  const anime = new Map<number, MapPoint>();
  const animeBends = new Map<number, MapPoint>();
  const children = new Map<string, ConnectionFacet[]>();
  const facetKeys = new Set(facets.map((facet) => facet.key));
  const roots: ConnectionFacet[] = [];
  for (const facet of facets) {
    const parent = facet.parentKey && facetKeys.has(facet.parentKey) ? facet.parentKey : undefined;
    if (!parent) {
      roots.push(facet);
      continue;
    }
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(facet);
  }

  const animeByFacet = new Map<string, ConnectedAnime[]>();
  for (const entry of neighbors) {
    if (!animeByFacet.has(entry.via)) animeByFacet.set(entry.via, []);
    animeByFacet.get(entry.via)!.push(entry);
  }
  let nextSlot = 0;
  const placeFacet = (facet: ConnectionFacet, depth: number): void => {
    const start = nextSlot;
    for (const child of shuffleMapItems(children.get(facet.key) ?? [], seed + depth)) placeFacet(child, depth + 1);
    for (const entry of animeByFacet.get(facet.key) ?? []) {
      const x = SIDE_PADDING + nextSlot++ * LEAF_SPACING;
      anime.set(entry.anime.id, { x, y: ANIME_Y });
      if (depth === 0) animeBends.set(entry.anime.id, { x, y: CHILD_Y });
    }
    if (nextSlot === start) nextSlot++;
    const first = SIDE_PADDING + start * LEAF_SPACING;
    const last = SIDE_PADDING + (nextSlot - 1) * LEAF_SPACING;
    positions.set(facet.key, { x: (first + last) / 2, y: depth ? CHILD_Y : ROOT_Y });
  };
  for (const root of shuffleMapItems(roots, seed)) placeFacet(root, 0);

  // A missing facet should not make its anime disappear behind the center.
  for (const entry of neighbors) {
    if (!anime.has(entry.anime.id)) {
      anime.set(entry.anime.id, { x: SIDE_PADDING + nextSlot++ * LEAF_SPACING, y: ANIME_Y });
    }
  }
  const naturalWidth = SIDE_PADDING * 2 + Math.max(0, nextSlot - 1) * LEAF_SPACING;
  const width = Math.max(1000, naturalWidth);
  const offset = (width - naturalWidth) / 2;
  for (const point of positions.values()) point.x += offset;
  for (const point of anime.values()) point.x += offset;
  for (const point of animeBends.values()) point.x += offset;
  return {
    width,
    height: 760 + TOP_INSET,
    center: { x: width / 2, y: 90 + TOP_INSET },
    facets: positions,
    anime,
    animeBends
  };
}
