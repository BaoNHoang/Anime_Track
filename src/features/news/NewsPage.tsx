import {
  ExternalLink,
  MessageCircle,
  Newspaper,
  PlayCircle
} from "../../components/OwnedIcons";
import { ErrorState } from "../../components/ErrorState";
import { useAnimeNews } from "../../hooks/useAnimeNews";
import { NewsGridSkeleton, PromoGridSkeleton } from "../../components/LoadingState";

const publishedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function formatPublishedAt(value: string) {
  return publishedAtFormatter.format(new Date(value));
}

export function NewsPage() {
  const news = useAnimeNews();
  const leadStory = news.articles[0];
  const briefingStories = news.articles.slice(1, 5);
  const moreStories = news.articles.slice(5);

  return (
    <div className="page-stack">
      <h1 className="visually-hidden">Anime news</h1>

      {news.articlesLoading && <NewsGridSkeleton />}

      {news.articlesError && !news.articles.length && (
        <ErrorState
          onRetry={() => void news.refetchArticles()}
          message="Anime news could not be loaded."
        />
      )}

      {leadStory ? (
        <>
          <section className="news-intro" aria-labelledby="news-heading">
            <div>
              <span className="news-intro__eyebrow">
                <Newspaper size={14} /> Anime news desk
              </span>
              <h2 id="news-heading">The stories shaping this season.</h2>
              <p>Fresh announcements, casting updates, and moments worth putting on your watchlist.</p>
            </div>
            {news.articlesRefreshing && (
              <span className="section-status section-status--skeleton" role="status">
                <span className="visually-hidden">Refreshing stories</span>
                <span className="skeleton" aria-hidden="true" />
              </span>
            )}
          </section>

          <section className="news-lead-grid" aria-label="Latest anime stories">
            <article className="news-lead">
              {leadStory.imageUrl ? (
                <img src={leadStory.imageUrl} alt="" decoding="async" />
              ) : (
                <div className="news-lead__fallback" aria-hidden="true" />
              )}
              <div className="news-lead__body">
                <span className="news-label">Lead story · {leadStory.animeTitle}</span>
                <h3>{leadStory.title}</h3>
                <p>{leadStory.excerpt}</p>
                <div className="news-lead__meta">
                  <span>By {leadStory.author}</span>
                  <span>{formatPublishedAt(leadStory.publishedAt)}</span>
                  <span><MessageCircle size={13} /> {leadStory.comments}</span>
                </div>
                <a href={leadStory.url} target="_blank" rel="noreferrer" className="news-read-link">
                  Read the story <ExternalLink size={15} />
                </a>
              </div>
            </article>

            <aside className="news-briefing" aria-label="Today's briefing">
              <div className="news-briefing__heading">
                <span>Today’s briefing</span>
                <small>{briefingStories.length} more updates</small>
              </div>
              {briefingStories.map((article) => (
                <a className="briefing-story" href={article.url} target="_blank" rel="noreferrer" key={article.url}>
                  <span className="briefing-story__anime">{article.animeTitle}</span>
                  <strong>{article.title}</strong>
                  <span className="briefing-story__meta">{formatPublishedAt(article.publishedAt)} · {article.comments} comments</span>
                </a>
              ))}
            </aside>
          </section>

          {moreStories.length > 0 && (
            <section>
              <div className="section-header">
                <div>
                  <span className="news-label">Keep reading</span>
                  <h2>More from the feed</h2>
                </div>
              </div>
              <div className="news-grid">
                {moreStories.map((article) => (
                  <article className="news-card" key={article.url}>
                    <div className="news-card__body">
                      <span className="news-card__anime">{article.animeTitle}</span>
                      <h3>{article.title}</h3>
                      <p>{article.excerpt}</p>
                      <div className="news-card__footer">
                        <span>{formatPublishedAt(article.publishedAt)}</span>
                        <span><MessageCircle size={13} /> {article.comments}</span>
                        <a href={article.url} target="_blank" rel="noreferrer" aria-label={`Read ${article.title}`}>
                          <ExternalLink size={15} />
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
                <img
                  src={promo.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
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
