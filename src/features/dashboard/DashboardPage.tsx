import { ExternalLink, Star } from "lucide-react";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useAnimeNews } from "../../hooks/useAnimeNews";
import { useCurrentSeason, useTopAnime } from "../../hooks/useAnimeQueries";
import type { Anime } from "../../domain/anime/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric"
});

function SeasonTile({ anime }: { anime: Anime }) {
  const { openAnime } = useAnimePanel();
  const title = anime.titleEnglish || anime.title;

  return (
    <article className="home-season-tile">
      <button type="button" onClick={() => openAnime(anime)}>
        <img src={anime.imageUrl} alt="" loading="lazy" />
      </button>
      <div>
        <button type="button" onClick={() => openAnime(anime)} title={title}>
          {title}
        </button>
        <span>
          {anime.type || "Anime"}
          {anime.score ? <><Star size={11} fill="currentColor" /> {anime.score.toFixed(1)}</> : null}
        </span>
      </div>
    </article>
  );
}

export function DashboardPage() {
  const { openAnime } = useAnimePanel();
  const season = useCurrentSeason();
  const airing = useTopAnime("airing");
  const news = useAnimeNews();

  return (
    <div className="home-page">
      <header className="page-heading">
        <h1>Home</h1>
      </header>

      <div className="home-layout">
        <div className="home-main">
          <section className="home-section">
            <SectionHeader
              title="Current season"
              action={{ label: "Browse season", to: "/discover" }}
            />
            {season.isPending && <LoadingState />}
            {season.isError && <ErrorState onRetry={() => season.refetch()} />}
            {season.data && (
              <div className="home-season-grid">
                {season.data.items.slice(0, 10).map((anime) => (
                  <SeasonTile anime={anime} key={anime.id} />
                ))}
              </div>
            )}
          </section>

          <section className="home-section">
            <SectionHeader
              title="Latest headlines"
              action={{ label: "All news", to: "/news" }}
            />
            {news.articlesLoading && <LoadingState />}
            {news.articlesError && !news.articles.length && (
              <ErrorState
                message="Anime news could not be loaded."
                onRetry={() => void news.refetchArticles()}
              />
            )}
            {news.articles.length > 0 && (
              <div className="home-news-list">
                {news.articles.slice(0, 6).map((article) => (
                  <article key={article.url}>
                    <img
                      src={article.imageUrl || article.animeImageUrl}
                      alt=""
                      loading="lazy"
                    />
                    <div>
                      <h3>{article.title}</h3>
                      <time dateTime={article.publishedAt}>
                        {dateFormatter.format(new Date(article.publishedAt))}
                      </time>
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Read ${article.title}`}
                    >
                      <ExternalLink size={15} />
                    </a>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="home-ranking" aria-label="Top airing anime">
          <SectionHeader
            title="Top airing"
            action={{ label: "Discover", to: "/discover" }}
          />
          {airing.isLoading && <LoadingState />}
          {airing.isError && <ErrorState onRetry={() => airing.refetch()} />}
          {airing.data && (
            <ol>
              {airing.data.items.slice(0, 8).map((anime, index) => (
                <li key={anime.id}>
                  <span>{index + 1}</span>
                  <button type="button" onClick={() => openAnime(anime)}>
                    <img src={anime.imageUrl} alt="" loading="lazy" />
                  </button>
                  <button type="button" onClick={() => openAnime(anime)}>
                    <strong>{anime.titleEnglish || anime.title}</strong>
                    <small>
                      {anime.score ? `${anime.score.toFixed(2)} score` : anime.type}
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
