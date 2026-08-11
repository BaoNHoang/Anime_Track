import { ExternalLink, Star } from "../../components/OwnedIcons";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useAnimeNews } from "../../hooks/useAnimeNews";
import {
  useAnimeBrowse,
  useCurrentSeason,
  useTopAnime
} from "../../hooks/useAnimeQueries";
import type { Anime } from "../../domain/anime/types";
import type { AnimePage } from "../../domain/anime/types";

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

function HomeShelf({
  title,
  result,
  limit = 5
}: {
  title: string;
  result: {
    data?: AnimePage;
    isLoading: boolean;
    isError: boolean;
    refetch: () => unknown;
  };
  limit?: number;
}) {
  return (
    <section className="home-section home-section--shelf">
      <SectionHeader title={title} action={{ label: "Browse", to: "/discover" }} />
      {result.isLoading && <LoadingState cards={limit} />}
      {result.isError && <ErrorState onRetry={() => void result.refetch()} />}
      {result.data && (
        <div className="home-season-grid">
          {result.data.items.slice(0, limit).map((anime) => (
            <SeasonTile anime={anime} key={anime.id} />
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardPage() {
  const { openAnime } = useAnimePanel();
  const season = useCurrentSeason();
  const airing = useTopAnime("airing");
  const upcoming = useAnimeBrowse("upcoming");
  const past = useAnimeBrowse("past");
  const twoThousands = useAnimeBrowse("2000s");
  const twentyTens = useAnimeBrowse("2010s");
  const twentyTwenties = useAnimeBrowse("2020s");
  const news = useAnimeNews();

  return (
    <div className="home-page">
      <h1 className="visually-hidden">Home</h1>

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

          <HomeShelf title="Coming soon" result={upcoming} />
          <HomeShelf title="Blast from the past" result={past} />
          <HomeShelf title="Top anime of the 2000s" result={twoThousands} />
          <HomeShelf title="Top anime of the 2010s" result={twentyTens} />
          <HomeShelf title="Top anime of the 2020s" result={twentyTwenties} />

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
