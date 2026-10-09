import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Compass, Search, Shuffle, X } from "../../components/OwnedIcons";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { buildAnimeConnections } from "../../domain/anime/connectionMap";
import type { Anime } from "../../domain/anime/types";
import { useAnimeBrowse, useAnimeSearch } from "../../hooks/useAnimeQueries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const facetPositions = [
  { x: 500, y: 108 },
  { x: 285, y: 293 },
  { x: 715, y: 293 },
  { x: 500, y: 480 }
];
const animePositions = [
  { x: 155, y: 104 },
  { x: 845, y: 104 },
  { x: 90, y: 305 },
  { x: 910, y: 305 },
  { x: 155, y: 510 },
  { x: 845, y: 510 }
];
const centerPosition = { x: 500, y: 293 };
const EMPTY_ANIME: Anime[] = [];

function positionStyle(position: { x: number; y: number }): CSSProperties {
  return { left: `${position.x / 10}%`, top: `${position.y / 6.2}%` };
}

export function AnimeConnectionMap({ currentResults = EMPTY_ANIME }: { currentResults?: Anime[] }) {
  const { openAnime } = useAnimePanel();
  const { items: library } = useTracker();
  const popular = useAnimeBrowse("popular");
  const classics = useAnimeBrowse("classics");
  const airing = useAnimeBrowse("airing");
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText.trim(), 350);
  const search = useAnimeSearch(debouncedSearch);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [activeFacet, setActiveFacet] = useState<string | null>(null);
  const [discoveredAnime, setDiscoveredAnime] = useState<Anime[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const librarySeeds = useMemo(() => library
    .filter((item) => item.progress > 0 || item.status === "completed")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((item) => item.anime), [library]);
  const catalog = useMemo(() => [...new Map([
    ...library.map((item) => item.anime),
    ...currentResults,
    ...(popular.data?.items ?? []),
    ...(classics.data?.items ?? []),
    ...(airing.data?.items ?? []),
    ...(search.data?.items ?? []),
    ...discoveredAnime
  ].map((anime) => [anime.id, anime])).values()], [
    currentResults, popular.data, classics.data, airing.data, search.data, library, discoveredAnime
  ]);
  const center = selectedAnime ?? librarySeeds[0] ?? catalog[0];
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
  }, [center?.id]);
  const connections = useMemo(() => center
    ? buildAnimeConnections(center, catalog)
    : { facets: [], neighbors: [] }, [center, catalog]);
  const shownNeighbors = activeFacet
    ? connections.neighbors.filter((entry) => entry.sharedKeys.includes(activeFacet))
    : connections.neighbors;
  const placedNeighbors = useMemo(() => {
    const free = [...animePositions];
    return shownNeighbors.map((entry) => {
      const facetIndex = connections.facets.findIndex((facet) => facet.key === (activeFacet ?? entry.via));
      const anchor = facetPositions[facetIndex] ?? centerPosition;
      free.sort((left, right) =>
        Math.hypot(left.x - anchor.x, left.y - anchor.y) -
        Math.hypot(right.x - anchor.x, right.y - anchor.y)
      );
      return { ...entry, position: free.shift() ?? animePositions[0], via: activeFacet ?? entry.via };
    });
  }, [shownNeighbors, connections.facets, activeFacet]);
  const suggestions = useMemo(() => {
    const needle = searchText.trim().toLocaleLowerCase();
    if (!needle) return [];
    return [...new Map(catalog
      .filter((anime) => `${anime.title} ${anime.titleEnglish ?? ""}`.toLocaleLowerCase().includes(needle))
      .map((anime) => [anime.id, anime])).values()].slice(0, 6);
  }, [catalog, searchText]);
  const searchPending = searchText.trim().length >= 2 &&
    (debouncedSearch.toLocaleLowerCase() !== searchText.trim().toLocaleLowerCase() || search.isFetching);

  const chooseAnime = (anime: Anime) => {
    if (search.data?.items.length) {
      setDiscoveredAnime((previous) => [...new Map([
        ...previous,
        ...search.data.items
      ].map((item) => [item.id, item])).values()].slice(-96));
    }
    setSelectedAnime(anime);
    setActiveFacet(null);
    setSearchText("");
  };
  const surprise = () => {
    const choices = catalog.filter((anime) => anime.id !== center?.id && (anime.genres.length || anime.studios.length));
    if (choices.length) chooseAnime(choices[Math.floor(Math.random() * choices.length)]);
  };
  const isLoading = popular.isPending || classics.isPending || airing.isPending;
  const allFailed = popular.isError && classics.isError && airing.isError && !catalog.length;

  return (
    <section className="anime-map" aria-labelledby="anime-map-title">
      <div className="anime-map__intro">
        <div>
          <span className="anime-map__eyebrow"><Compass size={15} /> A different way to discover</span>
          <h2 id="anime-map-title">Follow the connections</h2>
          <p>Start with a show, then hop between anime linked by a genre or studio.</p>
        </div>
        <button className="anime-map__surprise" type="button" onClick={surprise} disabled={catalog.length < 2}>
          <Shuffle size={16} /> Surprise me
        </button>
      </div>

      <div className="anime-map__tools">
        <div className="anime-map__search">
          <Search size={17} aria-hidden="true" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Find a starting anime"
            aria-label="Find a starting anime for the map"
          />
          {searchText ? <button type="button" onClick={() => setSearchText("")} aria-label="Clear map search"><X size={16} /></button> : null}
          {searchText.trim() ? (
            <div className="anime-map__suggestions" aria-label="Matching anime">
              {suggestions.map((anime) => (
                <button type="button" key={anime.id} onClick={() => chooseAnime(anime)}>
                  {anime.titleEnglish || anime.title}
                </button>
              ))}
              {!suggestions.length && !searchPending ? <span>No matching anime found. Try another title.</span> : null}
              {!suggestions.length && searchPending ? <span>Looking for anime…</span> : null}
            </div>
          ) : null}
        </div>
        {librarySeeds.length ? (
          <label className="anime-map__library">
            <span>Or start from your library</span>
            <select value={librarySeeds.some((anime) => anime.id === center?.id) ? center?.id : ""} onChange={(event) => {
              const match = librarySeeds.find((anime) => anime.id === Number(event.target.value));
              if (match) chooseAnime(match);
            }}>
              <option value="">Choose a watched anime</option>
              {librarySeeds.map((anime) => <option value={anime.id} key={anime.id}>{anime.titleEnglish || anime.title}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      {allFailed ? <div className="anime-map__message">The map could not load anime. Try opening it again in a moment.</div> : null}
      {!center && isLoading ? <div className="anime-map__message" role="status">Finding anime to map…</div> : null}
      {center ? (
        <>
          <p className="anime-map__pan-hint">Swipe the map to see more connections.</p>
          <div className="anime-map__viewport" ref={viewportRef} tabIndex={0} aria-label="Anime connection map. Scroll horizontally to explore on smaller screens.">
            <div className="anime-map__canvas">
              <svg className="anime-map__lines" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
                {connections.facets.map((facet, index) => (
                  <line key={facet.key} x1={centerPosition.x} y1={centerPosition.y} x2={facetPositions[index].x} y2={facetPositions[index].y} className={activeFacet && activeFacet !== facet.key ? "is-muted" : ""} />
                ))}
                {placedNeighbors.map((entry) => {
                  const index = connections.facets.findIndex((facet) => facet.key === entry.via);
                  const from = facetPositions[index] ?? centerPosition;
                  return <line key={entry.anime.id} x1={from.x} y1={from.y} x2={entry.position.x} y2={entry.position.y} className="anime-map__link" />;
                })}
              </svg>
              <button className="anime-map__center" type="button" style={positionStyle(centerPosition)} onClick={() => openAnime(center)} aria-label={`Open details for ${center.titleEnglish || center.title}`}>
                <span className="anime-map__center-image"><ImageWithFallback src={center.imageUrl} fallbackSrc={center.largeImageUrl} alt="" loading="lazy" /></span>
                <span className="anime-map__center-title">{center.titleEnglish || center.title}</span>
              </button>
              {connections.facets.map((facet, index) => (
                <button
                  className={`anime-map__facet anime-map__facet--${facet.kind}${activeFacet === facet.key ? " is-active" : ""}${activeFacet && activeFacet !== facet.key ? " is-muted" : ""}`}
                  key={facet.key}
                  type="button"
                  style={positionStyle(facetPositions[index])}
                  aria-pressed={activeFacet === facet.key}
                  title={`${facet.kind === "studio" ? "Studio" : "Genre"}: ${facet.label}`}
                  onClick={() => setActiveFacet(activeFacet === facet.key ? null : facet.key)}
                >
                  <small>{facet.kind}</small><strong>{facet.label}</strong>
                </button>
              ))}
              {placedNeighbors.map((entry) => (
                <button className="anime-map__neighbor" key={entry.anime.id} type="button" style={positionStyle(entry.position)} onClick={() => chooseAnime(entry.anime)} aria-label={`Explore connections for ${entry.anime.titleEnglish || entry.anime.title}`}>
                  <span className="anime-map__neighbor-image"><ImageWithFallback src={entry.anime.imageUrl} fallbackSrc={entry.anime.largeImageUrl} alt="" loading="lazy" /></span>
                  <span>{entry.anime.titleEnglish || entry.anime.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="anime-map__footer" aria-live="polite">
            <div>
              <strong>{activeFacet ? connections.facets.find((facet) => facet.key === activeFacet)?.label : center.titleEnglish || center.title}</strong>
              <span>{shownNeighbors.length
                ? `${shownNeighbors.length} connected anime in this map · Select a poster to keep exploring.`
                : "No matching titles in this map. Try another show or connection."}</span>
            </div>
            <span>Connections are based on a sample of popular, classic, and airing anime.</span>
          </div>
        </>
      ) : null}
    </section>
  );
}
