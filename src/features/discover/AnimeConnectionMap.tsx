import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, Search, Shuffle, X } from "../../components/OwnedIcons";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { buildAnimeConnections, type ConnectionFacet } from "../../domain/anime/connectionMap";
import { layoutAnimeConnections, type MapPoint } from "../../domain/anime/connectionMapLayout";
import { mapFacetParam, readConnectionMapUrl } from "../../domain/anime/connectionMapUrl";
import type { Anime } from "../../domain/anime/types";
import { useAnimeBrowse, useAnimeDetails, useAnimeFacet, useAnimeSearch } from "../../hooks/useAnimeQueries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const EMPTY_ANIME: Anime[] = [];

function positionStyle(position: MapPoint): CSSProperties {
  return { left: position.x, top: position.y };
}

export function AnimeConnectionMap({ currentResults = EMPTY_ANIME }: { currentResults?: Anime[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapUrl = useMemo(() => readConnectionMapUrl(searchParams), [searchParams]);
  const { animeId, facet: activeFacet, bridgeGenre, page: facetPage, seed: shuffleSeed } = mapUrl;
  const { openAnime } = useAnimePanel();
  const { items: library } = useTracker();
  const popular = useAnimeBrowse("popular");
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText.trim(), 350);
  const search = useAnimeSearch(debouncedSearch);
  const [discoveredAnime, setDiscoveredAnime] = useState<Anime[]>([]);
  const [shareStatus, setShareStatus] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);

  const librarySeeds = useMemo(() => library
    .filter((item) => item.progress > 0 || item.status === "completed")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((item) => item.anime), [library]);
  const starterCatalog = useMemo(() => [...new Map([
    ...library.map((item) => item.anime),
    ...currentResults,
    ...(popular.data?.items ?? []),
    ...(search.data?.items ?? []),
    ...discoveredAnime
  ].map((anime) => [anime.id, anime])).values()], [
    currentResults, popular.data, search.data, library, discoveredAnime
  ]);
  const knownAnime = animeId ? starterCatalog.find((anime) => anime.id === animeId) : undefined;
  const details = useAnimeDetails(animeId && !knownAnime ? animeId : undefined);
  const facetBrowse = useAnimeFacet(activeFacet ?? undefined, facetPage);
  const catalog = useMemo(() => [...new Map([
    ...starterCatalog,
    ...(details.data ? [details.data] : []),
    ...(facetBrowse.data?.items ?? [])
  ].map((anime) => [anime.id, anime])).values()], [starterCatalog, details.data, facetBrowse.data]);
  const center = animeId
    ? catalog.find((anime) => anime.id === animeId)
    : librarySeeds[0] ?? catalog[0];
  const connections = useMemo(() => center
    ? buildAnimeConnections(center, catalog, {
      facet: activeFacet,
      bridgeGenre,
      seed: shuffleSeed
    })
    : { facets: [], neighbors: [] }, [center, catalog, activeFacet, bridgeGenre, shuffleSeed]);
  const layout = useMemo(() => layoutAnimeConnections(
    connections.facets, connections.neighbors, shuffleSeed
  ), [connections, shuffleSeed]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
  }, [center?.id, layout.width]);
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
  const updateMapUrl = (update: (next: URLSearchParams) => void, replace = false) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", "map");
    update(next);
    setSearchParams(next, { replace });
  };
  const chooseAnime = (anime: Anime) => {
    rememberAnime([anime, ...(search.data?.items ?? []), ...(facetBrowse.data?.items ?? [])]);
    updateMapUrl((next) => {
      next.set("anime", String(anime.id));
      next.delete("facet");
      next.delete("bridge");
      next.delete("mapPage");
      next.set("mapSeed", String(shuffleSeed + 1));
    });
    setSearchText("");
  };
  const shuffleConnections = () => {
    if (activeFacet) rememberAnime(facetBrowse.data?.items ?? []);
    updateMapUrl((next) => {
      next.set("mapSeed", String(shuffleSeed + 1));
      if (!activeFacet) return;
      const lastPage = Math.min(
        facetBrowse.data?.lastPage ?? (facetBrowse.data?.hasNextPage ? facetPage + 1 : 1), 50
      );
      if (lastPage > 1) {
        const offset = 1 + (shuffleSeed % (lastPage - 1));
        next.set("mapPage", String(((facetPage - 1 + offset) % lastPage) + 1));
      }
    }, true);
  };
  const chooseFacet = (facet: ConnectionFacet) => {
    if (!center) return;
    if (activeFacet?.key === facet.key) {
      shuffleConnections();
      return;
    }
    rememberAnime(facetBrowse.data?.items ?? []);
    updateMapUrl((next) => {
      next.set("anime", String(center.id));
      next.set("facet", mapFacetParam(facet));
      if (activeFacet?.kind === "genre" && facet.kind === "studio") {
        next.set("bridge", mapFacetParam(activeFacet));
      } else next.delete("bridge");
      next.delete("mapPage");
      next.set("mapSeed", String(shuffleSeed + 1));
    });
  };
  const surprise = () => {
    const choices = catalog.filter((anime) => anime.id !== center?.id && (anime.genres.length || anime.studios.length));
    if (choices.length) chooseAnime(choices[Math.floor(Math.random() * choices.length)]);
  };
  const isLoading = popular.isPending || (Boolean(animeId) && details.isPending);
  const allFailed = !center && (animeId ? details.isError : popular.isError);
  const shareMap = async () => {
    if (!center) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", "map");
    url.searchParams.set("anime", String(center.id));
    url.searchParams.set("mapSeed", String(shuffleSeed));
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Map link copied.");
    } catch {
      setShareStatus("Could not copy the link. Copy this page's URL instead.");
    }
  };

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
        <button className="anime-map__share" type="button" onClick={shareMap} disabled={!center}>Share map</button>
      </div>
      {shareStatus ? <p className="anime-map__facet-status" role="status">{shareStatus}</p> : null}

      {allFailed ? <div className="anime-map__message">The map could not load anime. Try opening it again in a moment.</div> : null}
      {!center && isLoading ? <div className="anime-map__message" role="status">Finding anime to map…</div> : null}
      {center ? (
        <>
          {activeFacet && facetBrowse.isFetching ? <p className="anime-map__facet-status" role="status">Finding more {activeFacet.label} anime…</p> : null}
          {activeFacet && facetBrowse.isError ? <p className="anime-map__facet-status" role="status">More {activeFacet.label} anime could not load. Showing available connections.</p> : null}
          <p className="anime-map__pan-hint">Swipe the map to see more connections.</p>
          <div className="anime-map__viewport" ref={viewportRef} tabIndex={0} aria-label="Anime connection map. Scroll horizontally to explore on smaller screens.">
            <div className="anime-map__canvas" style={{ width: layout.width, height: layout.height }}>
              <svg className="anime-map__lines" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
                {connections.facets.map((facet) => {
                  const to = layout.facets.get(facet.key);
                  if (!to) return null;
                  const from = layout.facets.get(facet.parentKey ?? "") ?? layout.center;
                  const onPath = !activeFacet || facet.key === activeFacet.key ||
                    facet.parentKey === activeFacet.key || facet.key === bridgeGenre?.key;
                  return <line key={facet.key} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={onPath ? "" : "is-muted"} />;
                })}
                {connections.neighbors.map((entry) => {
                  const to = layout.anime.get(entry.anime.id);
                  if (!to) return null;
                  const from = layout.facets.get(entry.via) ?? layout.center;
                  const bend = layout.animeBends.get(entry.anime.id);
                  return <path key={entry.anime.id} d={`M ${from.x} ${from.y} ${bend ? `L ${bend.x} ${bend.y} ` : ""}L ${to.x} ${to.y}`} className="anime-map__link" />;
                })}
              </svg>
              <button className="anime-map__center" type="button" style={positionStyle(layout.center)} onClick={() => openAnime(center)} aria-label={`Open details for ${center.titleEnglish || center.title}`}>
                <span className="anime-map__center-image"><ImageWithFallback src={center.imageUrl} fallbackSrc={center.largeImageUrl} alt="" loading="lazy" /></span>
                <span className="anime-map__center-title">{center.titleEnglish || center.title}</span>
              </button>
              {connections.facets.map((facet) => (
                <button
                  className={`anime-map__facet anime-map__facet--${facet.kind}${activeFacet?.key === facet.key ? " is-active" : ""}${activeFacet && activeFacet.key !== facet.key && facet.parentKey !== activeFacet.key && facet.key !== bridgeGenre?.key ? " is-muted" : ""}`}
                  key={facet.key}
                  type="button"
                  style={positionStyle(layout.facets.get(facet.key)!)}
                  aria-pressed={activeFacet?.key === facet.key}
                  title={`${facet.kind === "studio" ? "Studio" : "Genre"}: ${facet.label}. Select again for new anime.`}
                  onClick={() => chooseFacet(facet)}
                >
                  <small>{facet.kind}</small><strong>{facet.label}</strong>
                </button>
              ))}
              {connections.neighbors.map((entry) => (
                <button className="anime-map__neighbor" key={entry.anime.id} type="button" style={positionStyle(layout.anime.get(entry.anime.id)!)} onClick={() => chooseAnime(entry.anime)} aria-label={`Explore connections for ${entry.anime.titleEnglish || entry.anime.title}`}>
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
                updateMapUrl((next) => {
                  next.delete("facet");
                  next.delete("bridge");
                  next.delete("mapPage");
                });
              }}>Show all connections</button>
            ) : <span>Select a genre or studio to explore more of the catalog.</span>}
          </div>
        </>
      ) : null}
    </section>
  );
}
