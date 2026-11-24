import type { NewsArticle } from "../../domain/news/types";

export function NewsPreviewControls({ hidden, onChange }: { hidden: boolean; onChange: (value: boolean) => void }) {
  return <div className="news-controls">
    <label><input type="checkbox" checked={hidden} aria-describedby="news-preview-note"
      onChange={(event) => onChange(event.target.checked)} />Hide article previews</label>
    <p id="news-preview-note">Headlines and trailers may still contain spoilers.</p>
  </div>;
}

export function RevealPreviewButton({ article, onReveal }: { article: NewsArticle; onReveal: (url: string) => void }) {
  return <button className="news-anime-action news-preview-reveal" type="button"
    aria-label={`Reveal preview: ${article.title}`} onClick={() => onReveal(article.url)}>
    Reveal image and excerpt
  </button>;
}
