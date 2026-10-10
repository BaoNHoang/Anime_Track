import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Compass, Search, Shuffle, X } from "../../components/OwnedIcons";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { buildAnimeConnections, shuffleMapItems, type ConnectionFacet } from "../../domain/anime/connectionMap";
import type { Anime } from "../../domain/anime/types";
import { useAnimeBrowse, useAnimeFacet, useAnimeSearch } from "../../hooks/useAnimeQueries";
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
  const [activeFacet, setActiveFacet] = useState<ConnectionFacet | null>(null);
  const [bridgeGenre, setBridgeGenre] = useState<ConnectionFacet | null>(null);
  const [facetPage, setFacetPage] = useState(1);
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [discoveredAnime, setDiscoveredAnime] = useState<Anime[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const librarySeeds = useMemo(() => library
    .filter((item) => item.progress > 0 || item.status === "completed")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((item) => item.anime), [library]);
  const starterCatalog = useMemo(() => [...new Map([
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
  const center = selectedAnime ?? librarySeeds[0] ?? starterCatalog[0];
  const facetBrowse = useAnimeFacet(activeFacet ?? undefined, facetPage);
  const catalog = useMemo(() => [...new Map([
    ...starterCatalog,
    ...(facetBrowse.data?.items ?? [])
  ].map((anime) => [anime.id, anime])).values()], [starterCatalog, facetBrowse.data]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
  }, [center?.id]);
  const connections = useMemo(() => center
    ? buildAnimeConnections(center, catalog, {
      facet: activeFacet ?? undefined,
      bridgeGenre: bridgeGenre ?? undefined,
      seed: shuffleSeed
    })
    : { facets: [], neighbors: [] }, [center, catalog, activeFacet, bridgeGenre, shuffleSeed]);
  const placedFacets = useMemo(() => shuffleMapItems(facetPositions, shuffleSeed), [shuffleSeed]);
  const placedNeighbors = useMemo(() => {
    const positions = shuffleMapItems(animePositions, shuffleSeed + 17);
    return connections.neighbors.map((entry, index) => ({
      ...entry,
      position: positions[index]
    }));
  }, [connections.neighbors, shuffleSeed]);
  const suggestions = useMemo(() => {
    const needle = searchText.trim().toLocaleLowerCase();
    if (!needle) return [];
    return [...new Map(catalog
      .filter((anime) => `${anime.title} ${anime.titleEnglish ?? ""}`.toLocaleLowerCase().includes(needle))
      .map((anime) => [anime.id, anime])).values()].slice(0, 6);
  }, [catalog, searchText]);
  const searchPending = searchText.trim().length >= 2 &&
    (debouncedSearch.toLocaleLowerCase() !== searchText.trim().toLocaleLowerCase() || search.isFetching);

  const rememberAnime = (anime: Anime[]) => {
    if (!anime.length) return;
    setDiscoveredAnime((previous) => [...new Map([
      ...previous,
      ...anime
    ].map((item) => [item.id, item])).values()].slice(-240));
  };
  const chooseAnime = (anime: Anime) => {
    rememberAnime([...(search.data?.items ?? []), ...(facetBrowse.data?.items ?? [])]);
    setSelectedAnime(anime);
    setActiveFacet(null);
    setBridgeGenre(null);
    setFacetPage(1);
    setShuffleSeed((seed) => seed + 1);
    setSearchText("");
  };
  const shuffleConnections = () => {
    setShuffleSeed((seed) => seed + 1);
    if (!activeFacet) return;
    rememberAnime(facetBrowse.data?.items ?? []);
    const lastPage = Math.min(
      facetBrowse.data?.lastPage ?? (facetBrowse.data?.hasNextPage ? facetPage + 1 : 1),
      50
    );
    if (lastPage > 1) {
      const offset = 1 + (shuffleSeed % (lastPage - 1));
      setFacetPage((current) => ((current - 1 + offset) % lastPage) + 1);
    }
  };
  const chooseFacet = (facet: ConnectionFacet) => {
    if (activeFacet?.key === facet.key) {
      shuffleConnections();
      return;
    }
    rememberAnime(facetBrowse.data?.items ?? []);
    setBridgeGenre(activeFacet?.kind === "genre" && facet.kind === "studio" ? activeFacet : null);
    setActiveFacet(facet);
    setFacetPage(1);
    setShuffleSeed((seed) => seed + 1);
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
          <p>Pick a genre to uncover other studios, then follow a show that catches your eye.</p>
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
        <button className="anime-map__shuffle" type="button" onClick={shuffleConnections} disabled={!center}>
          <Shuffle size={15} /> Shuffle links
        </button>
      </div>

      {allFailed ? <div className="anime-map__message">The map could not load anime. Try opening it again in a moment.</div> : null}
      {!center && isLoading ? <div className="anime-map__message" role="status">Finding anime to map…</div> : null}
      {center ? (
        <>
          {activeFacet && facetBrowse.isFetching ? <p className="anime-map__facet-status" role="status">Finding more {activeFacet.label} anime…</p> : null}
          {activeFacet && facetBrowse.isError ? <p className="anime-map__facet-status" role="status">More {activeFacet.label} anime could not load. Showing available connections.</p> : null}
          <p className="anime-map__pan-hint">Swipe the map to see more connections.</p>
          <div className="anime-map__viewport" ref={viewportRef} tabIndex={0} aria-label="Anime connection map. Scroll horizontally to explore on smaller screens.">
            <div className="anime-map__canvas">
              <svg className="anime-map__lines" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
                {connections.facets.map((facet, index) => {
                  const parentIndex = connections.facets.findIndex((item) => item.key === facet.parentKey);
                  const from = placedFacets[parentIndex] ?? centerPosition;
                  const onPath = !activeFacet || facet.key === activeFacet.key ||
                    facet.parentKey === activeFacet.key || facet.key === bridgeGenre?.key;
                  return <line key={facet.key} x1={from.x} y1={from.y} x2={placedFacets[index].x} y2={placedFacets[index].y} className={onPath ? "" : "is-muted"} />;
                })}
                {placedNeighbors.map((entry) => {
                  const index = connections.facets.findIndex((facet) => facet.key === entry.via);
                  const from = placedFacets[index] ?? centerPosition;
                  return <line key={entry.anime.id} x1={from.x} y1={from.y} x2={entry.position.x} y2={entry.position.y} className="anime-map__link" />;
                })}
              </svg>
              <button className="anime-map__center" type="button" style={positionStyle(centerPosition)} onClick={() => openAnime(center)} aria-label={`Open details for ${center.titleEnglish || center.title}`}>
                <span className="anime-map__center-image"><ImageWithFallback src={center.imageUrl} fallbackSrc={center.largeImageUrl} alt="" loading="lazy" /></span>
                <span className="anime-map__center-title">{center.titleEnglish || center.title}</span>
              </button>
              {connections.facets.map((facet, index) => (
                <button
                  className={`anime-map__facet anime-map__facet--${facet.kind}${activeFacet?.key === facet.key ? " is-active" : ""}${activeFacet && activeFacet.key !== facet.key && facet.parentKey !== activeFacet.key && facet.key !== bridgeGenre?.key ? " is-muted" : ""}`}
                  key={facet.key}
                  type="button"
                  style={positionStyle(placedFacets[index])}
                  aria-pressed={activeFacet?.key === facet.key}
                  title={`${facet.kind === "studio" ? "Studio" : "Genre"}: ${facet.label}. Select again for new anime.`}
                  onClick={() => chooseFacet(facet)}
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
              <strong>{activeFacet?.label ?? center.titleEnglish ?? center.title}</strong>
              <span>{connections.neighbors.length
                ? activeFacet?.kind === "genre"
                  ? `${connections.neighbors.length} connected anime across ${connections.facets.filter((facet) => facet.kind === "studio").length} studios · Select a studio or poster to branch out.`
                  : `${connections.neighbors.length} connected anime · Select a poster to keep exploring.`
                : "No matching titles in this map. Try another show or connection."}</span>
            </div>
            {activeFacet ? (
              <button className="anime-map__all-links" type="button" onClick={() => {
                rememberAnime(facetBrowse.data?.items ?? []);
                setActiveFacet(null);
                setBridgeGenre(null);
              }}>Show all connections</button>
            ) : <span>Select a genre or studio to explore more of the catalog.</span>}
          </div>
        </>
      ) : null}
    </section>
  );
}
