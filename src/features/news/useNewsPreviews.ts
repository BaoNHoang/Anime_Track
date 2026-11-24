import { useState } from "react";
import type { NewsArticle } from "../../domain/news/types";

const HIDE_PREVIEWS_KEY = "banime:news:hide-previews:v1";
function readHiddenPreviews() {
  try { return localStorage.getItem(HIDE_PREVIEWS_KEY) === "true"; }
  catch { return false; }
}

export function useNewsPreviews() {
  const [hidePreviews, setHidePreviews] = useState(readHiddenPreviews);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  return {
    hidePreviews,
    hidden: (article: NewsArticle) => hidePreviews && !revealed.has(article.url),
    reveal: (url: string) => setRevealed((current) => new Set([...current, url])),
    toggle: (hidden: boolean) => {
      setHidePreviews(hidden);
      setRevealed(new Set());
      try { localStorage.setItem(HIDE_PREVIEWS_KEY, String(hidden)); }
      catch { /* Keep the preference working on this page if storage is unavailable. */ }
    }
  };
}
