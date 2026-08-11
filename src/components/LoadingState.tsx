import type { ReactNode } from "react";

type SkeletonProps = {
  label?: string;
};

function LoadingRegion({
  label,
  className,
  children
}: SkeletonProps & { className: string; children: ReactNode }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label ?? "Loading content"}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function LoadingState({
  cards = 6,
  layout = "anime",
  label = "Loading anime"
}: SkeletonProps & {
  cards?: number;
  layout?: "anime" | "season";
}) {
  const gridClass = layout === "season" ? "home-season-grid" : "anime-grid";

  return (
    <LoadingRegion className={`skeleton-region ${gridClass}`} label={label}>
      {Array.from({ length: cards }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton skeleton--poster" />
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--meta" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function CompactListSkeleton({
  items = 5,
  variant = "airing",
  label
}: SkeletonProps & {
  items?: number;
  variant?: "airing" | "news" | "ranking" | "search" | "favorite";
}) {
  return (
    <LoadingRegion
      className={`skeleton-region compact-skeleton compact-skeleton--${variant}`}
      label={label}
    >
      {Array.from({ length: items }, (_, index) => (
        <div className="compact-skeleton__item" key={index}>
          {variant === "ranking" && <span className="skeleton compact-skeleton__rank" />}
          <span className="skeleton compact-skeleton__image" />
          <span className="compact-skeleton__copy">
            <span className="skeleton compact-skeleton__title" />
            <span className="skeleton compact-skeleton__meta" />
          </span>
          <span className="skeleton compact-skeleton__action" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function NewsGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <LoadingRegion className="skeleton-region news-grid" label="Loading anime news">
      {Array.from({ length: cards }, (_, index) => (
        <div className="news-skeleton" key={index}>
          <span className="skeleton news-skeleton__image" />
          <span className="news-skeleton__body">
            <span className="skeleton news-skeleton__title" />
            <span className="skeleton news-skeleton__title news-skeleton__title--short" />
            <span className="skeleton news-skeleton__copy" />
            <span className="skeleton news-skeleton__meta" />
          </span>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function PromoGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <LoadingRegion className="skeleton-region promo-row" label="Loading popular trailers">
      {Array.from({ length: cards }, (_, index) => (
        <div className="promo-skeleton" key={index}>
          <span className="skeleton promo-skeleton__image" />
          <span className="promo-skeleton__body">
            <span className="skeleton promo-skeleton__icon" />
            <span className="skeleton promo-skeleton__copy" />
          </span>
        </div>
      ))}
    </LoadingRegion>
  );
}

export function HeaderAuthSkeleton() {
  return (
    <span className="header-auth-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Loading account</span>
      <span className="skeleton" aria-hidden="true" />
    </span>
  );
}

export function RouteSkeleton({ label = "Loading page" }: SkeletonProps) {
  return (
    <LoadingRegion className="skeleton-region route-skeleton" label={label}>
      <span className="skeleton route-skeleton__control" />
      <span className="skeleton route-skeleton__heading" />
      <span className="route-skeleton__grid">
        <span className="skeleton route-skeleton__panel" />
        <span className="skeleton route-skeleton__panel" />
      </span>
    </LoadingRegion>
  );
}

export function AccountSkeleton() {
  return (
    <LoadingRegion className="skeleton-region account-skeleton" label="Loading account">
      <span className="account-skeleton__rail">
        <span className="skeleton account-skeleton__mark" />
        <span className="skeleton account-skeleton__rail-line" />
        <span className="skeleton account-skeleton__rail-line account-skeleton__rail-line--short" />
      </span>
      <span className="account-skeleton__form">
        <span className="skeleton account-skeleton__heading" />
        <span className="skeleton account-skeleton__copy" />
        <span className="skeleton account-skeleton__button" />
        <span className="skeleton account-skeleton__field" />
        <span className="skeleton account-skeleton__field" />
        <span className="skeleton account-skeleton__button" />
      </span>
    </LoadingRegion>
  );
}
