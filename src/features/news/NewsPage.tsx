import { ExternalLink, MessageCircle, PlayCircle } from "lucide-react";
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
  const featured = news.articles[0];

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">News and trailers</span>
        <h1>Anime news</h1>
        <p>Read recent stories and watch promotional videos.</p>
      </header>

      {news.articlesLoading && (
        <div className="news-loading" aria-label="Loading anime news">
          <div className="skeleton news-loading__feature" />
          <div className="news-loading__list">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </div>
      )}

      {news.articlesError && !featured && (
        <ErrorState
          onRetry={() => void news.refetchArticles()}
          message="Anime news could not be loaded."
        />
      )}

      {featured ? (
        <section className="news-feature">
          <img
            src={featured.imageUrl || featured.animeImageUrl}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
          <div className="news-feature__content">
            <span className="news-label">{featured.animeTitle}</span>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <div className="news-meta">
              <span>{formatPublishedAt(featured.publishedAt)}</span>
              <span>{featured.author}</span>
            </div>
            <a
              className="button"
              href={featured.url}
              target="_blank"
              rel="noreferrer"
            >
              Read story <ExternalLink size={15} />
            </a>
          </div>
        </section>
      ) : (
        !news.articlesLoading &&
        !news.articlesError && (
          <div className="empty-state">
            <strong>No current headlines were found.</strong>
            <p>Jikan may still be refreshing this season's news.</p>
          </div>
        )
      )}

      {news.articles.length > 1 && (
        <section>
          <div className="section-header">
            <div>
              <span className="eyebrow">Recent articles</span>
              <h2>Latest stories</h2>
            </div>
            {news.articlesRefreshing && (
              <span className="section-status">Loading more stories...</span>
            )}
          </div>
          <div className="news-grid">
            {news.articles.slice(1).map((article) => (
              <article className="news-card" key={article.url}>
                <img
                  src={article.imageUrl || article.animeImageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="news-card__body">
                  <span className="news-label">{article.animeTitle}</span>
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
      )}

      <section>
        <div className="section-header">
          <div>
            <span className="eyebrow">Videos</span>
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
