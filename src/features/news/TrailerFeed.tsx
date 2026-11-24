import { useQuery } from "@tanstack/react-query";
import { getPopularPromos } from "../../services/tenrai/newsService";
import { ErrorState } from "../../components/ErrorState";
import { PromoGridSkeleton } from "../../components/LoadingState";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { PlayCircle } from "../../components/OwnedIcons";

export function TrailerFeed() {
  const promos = useQuery({ queryKey: ["anime", "news", "promos"],
    queryFn: ({ signal }) => getPopularPromos(signal), staleTime: 2 * 60 * 60 * 1000, gcTime: 6 * 60 * 60 * 1000 });
  return <section className="page-stack" aria-label="Anime trailers">
    {promos.isPending && <PromoGridSkeleton />}
    {promos.isError && <ErrorState message="Trailers could not be loaded." onRetry={() => void promos.refetch()} />}
    {promos.data?.length === 0 && <p className="schedule-empty">No trailers are available in the current catalog.</p>}
    {Boolean(promos.data?.length) && <div className="promo-row">{promos.data?.map((promo) => (
      <a className="promo-card" href={promo.videoUrl || promo.embedUrl} target="_blank" rel="noreferrer" key={`${promo.animeId}-${promo.promoTitle}`}>
        <ImageWithFallback src={promo.imageUrl} loading="lazy" decoding="async"
          fallback={<span className="promo-card__image-fallback" aria-hidden="true"><PlayCircle size={28} /></span>} />
        <div><span className="promo-card__play"><PlayCircle size={18} /></span>
          <span><strong>{promo.animeTitle}</strong><small>{promo.promoTitle}</small></span></div>
      </a>
    ))}</div>}
  </section>;
}
