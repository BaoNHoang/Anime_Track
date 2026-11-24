export function NewsPagination({ page, hasNextPage, loading, onPage }: {
  page: number; hasNextPage: boolean; loading: boolean; onPage: (page: number) => void;
}) {
  if (page === 1 && !hasNextPage) return null;
  return <nav className="news-pagination" aria-label="News pages">
    <button className="button button--ghost" type="button" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>Previous</button>
    <span aria-live="polite">Page {page}</span>
    <button className="button button--ghost" type="button" disabled={!hasNextPage || loading} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}
