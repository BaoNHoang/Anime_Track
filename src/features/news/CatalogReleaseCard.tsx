import type { ReactNode } from "react";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { ExternalLink } from "../../components/OwnedIcons";

export function CatalogReleaseCard({ title, imageUrl, description, status, publication, url, children }: {
  title: string; imageUrl?: string; description: string; status: string; publication: string; url: string; children?: ReactNode;
}) {
  return <article className="news-release-card">
    <div className="news-release-card__heading">
      <a href={url} target="_blank" rel="noreferrer" aria-label={`View ${title} on MyAnimeList`}>
        <ImageWithFallback src={imageUrl} loading="lazy" decoding="async" fallback={<span className="small-image-fallback" aria-hidden="true" />} />
      </a>
      <div><span>{status}</span><h3><a href={url} target="_blank" rel="noreferrer">{title}</a></h3><p>{publication}</p></div>
    </div>
    <p className="news-release-card__synopsis">{description}</p>
    <div className="news-release-card__actions">{children}<a href={url} target="_blank" rel="noreferrer">MyAnimeList <ExternalLink size={13} /></a></div>
  </article>;
}
