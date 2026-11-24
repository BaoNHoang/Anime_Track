import { lazy, Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { NewsGridSkeleton } from "../../components/LoadingState";

const PANELS = {
  headlines: lazy(() => import("./NewsHeadlines").then((module) => ({ default: module.NewsHeadlines }))),
  myanimelist: lazy(() => import("./MyAnimeListNews").then((module) => ({ default: module.MyAnimeListNews }))),
  trailers: lazy(() => import("./TrailerFeed").then((module) => ({ default: module.TrailerFeed }))),
  anime: lazy(() => import("./AnimeReleases").then((module) => ({ default: module.AnimeReleases }))),
  manga: lazy(() => import("./MangaReleases").then((module) => ({ default: module.MangaReleases }))),
  figures: lazy(() => import("./FigureReleases").then((module) => ({ default: module.FigureReleases })))
};
const TABS = [
  { id: "headlines", label: "Headlines" }, { id: "myanimelist", label: "MyAnimeList" },
  { id: "trailers", label: "Trailers" }, { id: "anime", label: "Anime releases" },
  { id: "manga", label: "Manga" }, { id: "figures", label: "Figures" }
] as const;

export function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const navigation = useRef<HTMLDivElement>(null);
  const active = TABS.find((tab) => tab.id === searchParams.get("tab"))?.id ?? "headlines";
  useEffect(() => {
    const container = navigation.current;
    const selected = buttons.current[TABS.findIndex((tab) => tab.id === active)];
    if (container && selected) container.scrollTo({ left: selected.offsetLeft - (container.clientWidth - selected.offsetWidth) / 2 });
  }, [active]);
  const selectTab = (id: typeof active) => {
    const next = new URLSearchParams(searchParams);
    if (id === "headlines") next.delete("tab");
    else next.set("tab", id);
    setSearchParams(next);
  };
  return <div className="page-stack">
    <h1 className="visually-hidden">Anime news</h1>
    <div className="library-tabs news-tabs" role="tablist" aria-label="News categories" ref={navigation}>
      {TABS.map((tab, index) => <button key={tab.id} ref={(button) => { buttons.current[index] = button; }}
        className="library-tabs__tab" type="button" role="tab" id={`news-tab-${tab.id}`}
        aria-controls={`news-panel-${tab.id}`} aria-selected={active === tab.id} tabIndex={active === tab.id ? 0 : -1}
        onClick={() => selectTab(tab.id)} onKeyDown={(event) => {
          const next = event.key === "ArrowRight" ? (index + 1) % TABS.length
            : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length
            : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : undefined;
          if (next !== undefined) {
            event.preventDefault();
            buttons.current[next]?.focus();
          }
        }}>{tab.label}</button>)}
    </div>
    {TABS.map((tab) => {
      const Panel = PANELS[tab.id];
      return <div key={tab.id} id={`news-panel-${tab.id}`} role="tabpanel" aria-labelledby={`news-tab-${tab.id}`}
        hidden={active !== tab.id} tabIndex={0}>
        {active === tab.id && <Suspense fallback={<NewsGridSkeleton cards={3} label={`Loading ${tab.label.toLowerCase()}`} />}><Panel /></Suspense>}
      </div>;
    })}
  </div>;
}
