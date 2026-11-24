import { ExternalLink, MessageCircle } from "../../components/OwnedIcons";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import type { Anime } from "../../domain/anime/types";
import type { NewsArticle } from "../../domain/news/types";
import { RevealPreviewButton } from "./NewsPreviewControls";

const publishedAtFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ViewAnimeButton({ anime }: { anime?: Anime }) {
  const { openAnime } = useAnimePanel();
  return anime ? <button className="news-anime-action" type="button"
    aria-label={`View anime: ${anime.titleEnglish || anime.title}`} onClick={() => openAnime(anime)}>View anime</button> : null;
}

export function NewsStoryCard({ article, anime, previewHidden, onReveal, sourceLabel = "MyAnimeList" }: {
  article: NewsArticle; anime?: Anime; previewHidden: boolean; onReveal: (url: string) => void; sourceLabel?: string;
}) {
  return <article className="news-card">
    <div className="news-card__body">
      <div className="news-card__heading">
        {!previewHidden && (article.imageUrl || anime?.imageUrl) && <span className="news-card__thumbnail">
          <ImageWithFallback src={article.imageUrl} fallbackSrc={anime?.imageUrl} loading="lazy" decoding="async"
            fallback={<span className="small-image-fallback" aria-hidden="true" />} />
        </span>}
        <div><span className="news-card__anime">{anime?.titleEnglish || anime?.title || sourceLabel}</span>
          <h3><a href={article.url} target="_blank" rel="noreferrer">{article.title}</a></h3></div>
      </div>
      {previewHidden ? <RevealPreviewButton article={article} onReveal={onReveal} /> : <p>{article.excerpt}</p>}
      <div className="news-card__footer">
        <time dateTime={article.publishedAt}>{publishedAtFormatter.format(new Date(article.publishedAt))}</time>
        <span><MessageCircle size={13} /> {article.comments}</span>
        <ViewAnimeButton anime={anime} />
        <a href={article.url} target="_blank" rel="noreferrer" aria-label={`Read ${article.title}`}>Read story <ExternalLink size={13} /></a>
      </div>
    </div>
  </article>;
}
