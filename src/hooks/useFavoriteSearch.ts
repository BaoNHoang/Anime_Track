import { useQuery } from "@tanstack/react-query";
import type { FavoriteKind } from "../domain/account/favorites";
import { searchFavoriteCatalog } from "../services/tenrai/favoriteSearchService";

export function useFavoriteSearch(kind: FavoriteKind, query: string) {
  const normalizedQuery = query.trim();
  return useQuery({
    queryKey: ["profile-favorites", kind, normalizedQuery],
    queryFn: ({ signal }) => searchFavoriteCatalog(kind, normalizedQuery, signal),
    enabled: normalizedQuery.length >= 2,
    staleTime: 30 * 60 * 1000
  });
}
