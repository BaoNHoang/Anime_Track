import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, ExternalLink, Newspaper, PlayCircle } from "../../components/OwnedIcons";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useNotifications } from "../../app/providers/useNotifications";
import { useTracker } from "../../app/providers/useTracker";
import type { AnimeNewsArticle, AnimePromo } from "../../domain/news/types";
import type { ReleaseNotification } from "../../domain/notifications/releaseNotifications";

const STORAGE_PREFIX = "banime:dashboard-updates:v1:";
const MAX_SEEN_LINKS = 200;

interface SeenState {
  seenThrough: string;
  seenArticleUrls: string[];
  knownTrailerUrls: string[];
  trailersInitialized: boolean;
}

function readSeenState(owner: string): SeenState {
  const initial: SeenState = {
    seenThrough: new Date().toISOString(),
    seenArticleUrls: [],
    knownTrailerUrls: [],
    trailersInitialized: false
  };
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${owner}`);
    if (!stored) return initial;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return initial;
    const state = parsed as Partial<SeenState>;
    return {
      seenThrough: typeof state.seenThrough === "string" && Number.isFinite(Date.parse(state.seenThrough))
        ? state.seenThrough
        : initial.seenThrough,
      seenArticleUrls: Array.isArray(state.seenArticleUrls)
        ? state.seenArticleUrls.filter((url): url is string => typeof url === "string").slice(-MAX_SEEN_LINKS)
        : [],
      knownTrailerUrls: Array.isArray(state.knownTrailerUrls)
        ? state.knownTrailerUrls.filter((url): url is string => typeof url === "string").slice(-MAX_SEEN_LINKS)
        : [],
      trailersInitialized: state.trailersInitialized === true
    };
  } catch {
    return initial;
  }
}

function rememberUrl(urls: string[], url: string) {
  return [...new Set([...urls, url])].slice(-MAX_SEEN_LINKS);
}

function trailerUrl(promo: AnimePromo) {
  return promo.videoUrl || promo.embedUrl;
}

const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function SinceLastVisit({
  owner,
  articles,
  promos,
  promosReady
}: {
  owner: string;
  articles: AnimeNewsArticle[];
  promos: AnimePromo[];
  promosReady: boolean;
}) {
  const { items, getTracked } = useTracker();
  const { notifications, clearNotification, clearAllNotifications } = useNotifications();
  const { openAnime } = useAnimePanel();
  const [seen, setSeen] = useState(() => readSeenState(owner));
  const trackedIds = useMemo(() => new Set(items.map((item) => item.anime.id)), [items]);
  const relevantPromos = promos.filter((promo) => trackedIds.has(promo.animeId));

  useEffect(() => {
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${owner}`, JSON.stringify(seen));
    } catch {
      // The section still works for this visit if browser storage is unavailable.
    }
  }, [owner, seen]);

  if (promosReady && !seen.trailersInitialized) {
    setSeen((current) => ({
      ...current,
      knownTrailerUrls: relevantPromos.map(trailerUrl).slice(-MAX_SEEN_LINKS),
      trailersInitialized: true
    }));
  }

  const newArticles = articles.filter((article) =>
    trackedIds.has(article.animeId) &&
    Date.parse(article.publishedAt) > Date.parse(seen.seenThrough) &&
    !seen.seenArticleUrls.includes(article.url)
  );
  const newPromos = seen.trailersInitialized
    ? relevantPromos.filter((promo) => !seen.knownTrailerUrls.includes(trailerUrl(promo)))
    : [];
  const count = notifications.length + newArticles.length + newPromos.length;
  const visibleCount = Math.min(notifications.length, 2) + Math.min(newArticles.length, 2) + Math.min(newPromos.length, 2);

  const openNotification = (notification: ReleaseNotification) => {
    const tracked = getTracked(notification.animeId);
    openAnime(tracked?.anime ?? {
      id: notification.animeId,
      title: notification.title,
      imageUrl: notification.imageUrl,
      largeImageUrl: notification.imageUrl,
      synopsis: "",
      status: notification.kind === "season" ? "Not yet aired" : "Currently Airing",
      type: "Anime",
      genres: [],
      studios: [],
      url: ""
    });
    clearNotification(notification.id);
  };

  const markAllSeen = () => {
    setSeen({
      seenThrough: new Date().toISOString(),
      seenArticleUrls: [],
      knownTrailerUrls: [...new Set(relevantPromos.map(trailerUrl))].slice(-MAX_SEEN_LINKS),
      trailersInitialized: true
    });
    clearAllNotifications();
  };

  return (
    <section className="since-visit" aria-labelledby="since-visit-title">
      <div className="since-visit__heading">
        <div>
          <span className="since-visit__eyebrow">Your watchlist briefing</span>
          <h2 id="since-visit-title">New since your last visit</h2>
          <p>Releases, stories, and trailers for anime in your library.</p>
        </div>
        {count > 0 && (
          <button className="since-visit__clear" type="button" onClick={markAllSeen}>
            <CheckCircle2 size={15} /> Mark all seen
          </button>
        )}
      </div>

      {count > 0 ? (
        <>
          <div className="since-visit__summary" aria-live="polite">
            <span className="since-visit__count">{count}</span>
            <span>new update{count === 1 ? "" : "s"} for your library</span>
          </div>
          <div className="since-visit__list">
            {notifications.slice(0, 2).map((notification) => (
              <button className="since-visit__item" type="button" key={notification.id} onClick={() => openNotification(notification)}>
                <span className="since-visit__icon"><Bell size={17} /></span>
                <span className="since-visit__copy">
                  <small>{notification.kind === "season" ? "Season announcement" : "Episode release"}</small>
                  <strong>{notification.title}</strong>
                  <span>{notification.kind === "season" ? "A related season was announced" : notification.episodeNumber ? `Episode ${notification.episodeNumber} is out` : "A new episode is out"}</span>
                </span>
                <span className="since-visit__date">
                  {Number.isFinite(Date.parse(notification.releasedAt))
                    ? shortDate.format(new Date(notification.releasedAt))
                    : "Recent"}
                </span>
              </button>
            ))}
            {newArticles.slice(0, 2).map((article) => (
              <a className="since-visit__item" href={article.url} target="_blank" rel="noreferrer" key={article.url}
                onClick={() => setSeen((current) => ({ ...current, seenArticleUrls: rememberUrl(current.seenArticleUrls, article.url) }))}>
                <span className="since-visit__icon"><Newspaper size={17} /></span>
                <span className="since-visit__copy">
                  <small>News · {article.animeTitle}</small>
                  <strong>{article.title}</strong>
                </span>
                <ExternalLink className="since-visit__external" size={15} />
              </a>
            ))}
            {newPromos.slice(0, 2).map((promo) => (
              <a className="since-visit__item" href={trailerUrl(promo)} target="_blank" rel="noreferrer" key={trailerUrl(promo)}
                onClick={() => setSeen((current) => ({ ...current, knownTrailerUrls: rememberUrl(current.knownTrailerUrls, trailerUrl(promo)) }))}>
                <span className="since-visit__icon"><PlayCircle size={17} /></span>
                <span className="since-visit__copy">
                  <small>New trailer</small>
                  <strong>{promo.animeTitle}</strong>
                </span>
                <ExternalLink className="since-visit__external" size={15} />
              </a>
            ))}
          </div>
          <div className="since-visit__links">
            {count > visibleCount && <span>Showing {visibleCount} of {count}</span>}
            <Link to="/notifications">All releases</Link>
            <Link to="/news">News and trailers</Link>
          </div>
        </>
      ) : (
        <div className="since-visit__empty" aria-live="polite">
          <CheckCircle2 size={20} />
          <div>
            <strong>{items.length ? "You're all caught up" : "Start your watchlist"}</strong>
            <p>{items.length ? "New updates for your library will appear here." : "Add anime to your library to see updates here."}</p>
          </div>
          {!items.length && <Link to="/discover">Discover anime</Link>}
        </div>
      )}
    </section>
  );
}
