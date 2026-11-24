import {
  ExternalLink,
  MessageCircle
} from "../../components/OwnedIcons";
import { ErrorState } from "../../components/ErrorState";
import { useAnimeNews } from "../../hooks/useAnimeNews";
import { NewsGridSkeleton } from "../../components/LoadingState";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { NewsStoryCard, ViewAnimeButton } from "./NewsStoryCard";
import { NewsPreviewControls, RevealPreviewButton } from "./NewsPreviewControls";
import { useNewsPreviews } from "./useNewsPreviews";

const publishedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function formatPublishedAt(value: string) {
  return publishedAtFormatter.format(new Date(value));
}

export function NewsHeadlines() {
  const news = useAnimeNews();
  const { hidePreviews, hidden: previewHidden, reveal: revealPreview, toggle: toggleHiddenPreviews } = useNewsPreviews();
  const animeById = new Map(news.sourceAnime.map((anime) => [anime.id, anime]));
  const leadStory = news.articles[0];
  const moreStories = news.articles.slice(1);

  return (
    <div className="page-stack">
      <h1 className="visually-hidden">Anime news</h1>

      <NewsPreviewControls hidden={hidePreviews} onChange={toggleHiddenPreviews} />

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
                  <NewsStoryCard key={article.url} article={article} anime={animeById.get(article.animeId)}
                    sourceLabel={article.animeTitle} previewHidden={previewHidden(article)} onReveal={revealPreview} />
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

    </div>
  );
}
