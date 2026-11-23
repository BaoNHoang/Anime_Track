import {
  ExternalLink,
  MessageCircle,
  PlayCircle
} from "../../components/OwnedIcons";
import { ErrorState } from "../../components/ErrorState";
import { useAnimeNews } from "../../hooks/useAnimeNews";
import { NewsGridSkeleton, PromoGridSkeleton } from "../../components/LoadingState";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import type { Anime } from "../../domain/anime/types";
import type { AnimeNewsArticle } from "../../domain/news/types";
import { useState } from "react";

const HIDE_PREVIEWS_KEY = "banime:news:hide-previews:v1";

function readHiddenPreviews() {
  try {
    return localStorage.getItem(HIDE_PREVIEWS_KEY) === "true";
  } catch {
    return false;
  }
}

const publishedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function formatPublishedAt(value: string) {
  return publishedAtFormatter.format(new Date(value));
}

function ViewAnimeButton({ anime }: { anime?: Anime }) {
  const { openAnime } = useAnimePanel();
  if (!anime) return null;

  return (
    <button
      className="news-anime-action"
      type="button"
      aria-label={`View anime: ${anime.titleEnglish || anime.title}`}
      onClick={() => openAnime(anime)}
    >
      View anime
    </button>
  );
}

function RevealPreviewButton({ article, onReveal }: {
  article: AnimeNewsArticle;
  onReveal: (url: string) => void;
}) {
  return (
    <button className="news-anime-action news-preview-reveal" type="button"
      aria-label={`Reveal preview: ${article.title}`} onClick={() => onReveal(article.url)}>
      Reveal image and excerpt
    </button>
  );
}

export function NewsPage() {
  const news = useAnimeNews();
  const [hidePreviews, setHidePreviews] = useState(readHiddenPreviews);
  const [revealedStories, setRevealedStories] = useState<Set<string>>(() => new Set());
  const previewHidden = (article: AnimeNewsArticle) => hidePreviews && !revealedStories.has(article.url);
  const revealPreview = (url: string) => setRevealedStories((current) => new Set([...current, url]));
  const toggleHiddenPreviews = (hidden: boolean) => {
    setHidePreviews(hidden);
    setRevealedStories(new Set());
    try {
      localStorage.setItem(HIDE_PREVIEWS_KEY, String(hidden));
    } catch {
      // The current-page preference still works when storage is unavailable.
    }
  };
  const animeById = new Map(news.sourceAnime.map((anime) => [anime.id, anime]));
  const leadStory = news.articles[0];
  const moreStories = news.articles.slice(1);

  return (
    <div className="page-stack">
      <h1 className="visually-hidden">Anime news</h1>

      <div className="news-controls">
        <label>
          <input type="checkbox" checked={hidePreviews} aria-describedby="news-preview-note"
            onChange={(event) => toggleHiddenPreviews(event.target.checked)} />
          Hide article previews
        </label>
        <p id="news-preview-note">Headlines and trailers may still contain spoilers.</p>
      </div>

      {news.articlesLoading && <NewsGridSkeleton />}

      {news.articlesError && !news.articles.length && (
        <ErrorState
          onRetry={() => void news.refetchArticles()}
          message="Anime news could not be loaded."
        />
      )}

      {leadStory ? (
        <>
          <section aria-label="Latest anime stories" aria-busy={news.articlesRefreshing}>
            <article className={`news-lead${previewHidden(leadStory) ? " news-lead--preview-hidden" : ""}`}>
              {!previewHidden(leadStory) && <ImageWithFallback
                src={leadStory.imageUrl}
                fallbackSrc={leadStory.animeImageUrl}
                decoding="async"
                fallback={<div className="news-lead__fallback" aria-hidden="true" />}
              />}
              <div className="news-lead__body">
                <span className="news-label">Lead story · {leadStory.animeTitle}</span>
                <h2>{leadStory.title}</h2>
                {previewHidden(leadStory)
                  ? <RevealPreviewButton article={leadStory} onReveal={revealPreview} />
                  : <p>{leadStory.excerpt}</p>}
                <div className="news-lead__meta">
                  <span>By {leadStory.author}</span>
                  <span>{formatPublishedAt(leadStory.publishedAt)}</span>
                  <span><MessageCircle size={13} /> {leadStory.comments}</span>
                </div>
                <div className="news-lead__actions">
                  <a href={leadStory.url} target="_blank" rel="noreferrer" className="news-read-link">
                    Read the story <ExternalLink size={15} />
                  </a>
                  <ViewAnimeButton anime={animeById.get(leadStory.animeId)} />
                </div>
              </div>
            </article>
          </section>

          {moreStories.length > 0 && (
            <section>
              <div className="section-header">
                <div>
                  <h2>More anime news</h2>
                </div>
              </div>
              <div className="news-grid">
                {moreStories.map((article) => (
                  <article className="news-card" key={article.url}>
                    <div className="news-card__body">
                      <div className="news-card__heading">
                        {!previewHidden(article) && (article.imageUrl || article.animeImageUrl) && (
                          <span className="news-card__thumbnail">
                            <ImageWithFallback src={article.imageUrl} fallbackSrc={article.animeImageUrl}
                              loading="lazy" decoding="async"
                              fallback={<span className="small-image-fallback" aria-hidden="true" />} />
                          </span>
                        )}
                        <div>
                          <span className="news-card__anime">{article.animeTitle}</span>
                          <h3><a href={article.url} target="_blank" rel="noreferrer">{article.title}</a></h3>
                        </div>
                      </div>
                      {previewHidden(article)
                        ? <RevealPreviewButton article={article} onReveal={revealPreview} />
                        : <p>{article.excerpt}</p>}
                      <div className="news-card__footer">
                        <span>{formatPublishedAt(article.publishedAt)}</span>
                        <span><MessageCircle size={13} /> {article.comments}</span>
                        <ViewAnimeButton anime={animeById.get(article.animeId)} />
                        <a href={article.url} target="_blank" rel="noreferrer" aria-label={`Read ${article.title}`}>
                          Read story <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        !news.articlesLoading &&
        !news.articlesError && (
          <div className="empty-state">
            <strong>No current headlines were found.</strong>
            <p>Tenrai may still be refreshing this season's news.</p>
          </div>
        )
      )}

      {news.articles.length > 0 && news.articlesError && (
        <ErrorState message="Some news could not be loaded." onRetry={() => void news.refetchArticles()} />
      )}
      {(news.hasMoreArticles || (news.articlesLoadingMore && news.articles.length > 0)) && (
        <div className="news-load-more">
          <button className="button button--ghost" type="button"
            disabled={news.articlesLoadingMore || !news.hasMoreArticles} onClick={news.loadMoreArticles}>
            {news.articlesLoadingMore ? "Loading news…" : "Load more news"}
          </button>
        </div>
      )}

      <section>
        <div className="section-header">
          <div>
            <h2>Popular trailers</h2>
          </div>
        </div>

        {news.promosLoading && <PromoGridSkeleton />}

        {news.promosError && !news.promos.length && (
          <ErrorState
            onRetry={() => void news.refetchPromos()}
            message="Popular trailers could not be loaded."
          />
        )}

        {news.promos.length > 0 && (
          <div className="promo-row">
            {news.promos.map((promo) => (
              <a
                className="promo-card"
                href={promo.videoUrl || promo.embedUrl}
                target="_blank"
                rel="noreferrer"
                key={`${promo.animeId}-${promo.promoTitle}`}
              >
                <ImageWithFallback
                  src={promo.imageUrl}
                  loading="lazy"
                  decoding="async"
                  fallback={<span className="promo-card__image-fallback" aria-hidden="true"><PlayCircle size={28} /></span>}
                />
                <div>
                  <span className="promo-card__play">
                    <PlayCircle size={18} />
                  </span>
                  <span>
                    <strong>{promo.animeTitle}</strong>
                    <small>{promo.promoTitle}</small>
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
