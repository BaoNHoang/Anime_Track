import { ExternalLink, MessageCircle, PlayCircle } from "../../components/OwnedIcons";
import { ErrorState } from "../../components/ErrorState";
import { useAnimeNews } from "../../hooks/useAnimeNews";

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

  return (
    <div className="page-stack">
      <h1 className="visually-hidden">Anime news</h1>

      {news.articlesLoading && (
        <div className="news-grid" aria-label="Loading anime news">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeleton news-loading-card" key={index} />
          ))}
        </div>
      )}

      {news.articlesError && !news.articles.length && (
        <ErrorState
          onRetry={() => void news.refetchArticles()}
          message="Anime news could not be loaded."
        />
      )}

      {news.articles.length > 0 ? (
        <section>
          <div className="section-header">
            <div>
              <h2>Latest stories</h2>
            </div>
            {news.articlesRefreshing && (
              <span className="section-status">Loading more stories...</span>
            )}
          </div>
          <div className="news-grid">
            {news.articles.map((article) => (
              <article className="news-card" key={article.url}>
                <img
                  src={article.imageUrl || article.animeImageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="news-card__body">
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <div className="news-card__footer">
                    <span>{formatPublishedAt(article.publishedAt)}</span>
                    <span>
                      <MessageCircle size={13} /> {article.comments}
                    </span>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Read ${article.title}`}
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
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

        {news.promosLoading && (
          <div className="promo-row" aria-label="Loading popular trailers">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="skeleton promo-loading-card" key={index} />
            ))}
          </div>
        )}

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
