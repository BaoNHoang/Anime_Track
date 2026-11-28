import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { ChevronRight } from "../../components/OwnedIcons";
import { STATUS_LABELS } from "../../domain/tracker/types";
import { animeDetailsQueryOptions } from "../../hooks/useAnimeQueries";
import type { RelatedAnime } from "../../services/tenrai/animeService";

export function RelatedAnimeGuide({ related }: { related: RelatedAnime[] }) {
  const { openAnime } = useAnimePanel();
  const { getTracked } = useTracker();
  const queryClient = useQueryClient();
  const openRelated = useMutation({
    mutationFn: (id: number) => queryClient.fetchQuery(animeDetailsQueryOptions(id))
  });

  return (
    <details className="related-anime">
      <summary>Watch-order guide <span>{related.length}</span></summary>
      <p>Catalog relationships do not establish a viewing order.</p>
      <ul>
        {related.map(({ id, title, relationship }) => {
          const tracked = getTracked(id);
          const status = tracked ? STATUS_LABELS[tracked.status] : "Not in library";
          return (
            <li key={`${relationship}:${id}`}>
              <button type="button" disabled={openRelated.isPending}
                onClick={() => openRelated.mutate(id, { onSuccess: ({ anime }) => openAnime(anime) })}>
                <span>
                  <strong>{title}</strong>
                  <small>{relationship} · {status}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      {openRelated.isPending && <p role="status">Loading title details…</p>}
      {openRelated.isError && <p role="alert">Title details could not be loaded. Select a title to try again.</p>}
    </details>
  );
}
