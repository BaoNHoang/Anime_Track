import { useQuery } from "@tanstack/react-query";
import {
  getAnimeById,
  getCurrentSeason,
  getTopAnimeCacheMs,
  getTopAnime,
  searchAnime
} from "../services/tenrai/animeService";

export function useCurrentSeason() {
  return useQuery({
    queryKey: ["anime", "season", "now"],
    queryFn: ({ signal }) => getCurrentSeason(signal),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000
  });
}

export function useTopAnime(
  filter: "airing" | "upcoming" | "bypopularity",
  page = 1
) {
  const cacheTime = getTopAnimeCacheMs(filter);

  return useQuery({
    queryKey: ["anime", "top", filter, page],
    queryFn: ({ signal }) => getTopAnime(filter, page, signal),
    staleTime: cacheTime,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData
  });
}

export function useAnimeSearch(query: string, page = 1) {
  return useQuery({
    queryKey: ["anime", "search", query, page],
    queryFn: ({ signal }) => searchAnime(query, page, signal),
    enabled: query.trim().length >= 2,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData
  });
}

export function useAnimeDetails(id?: number) {
  return useQuery({
    queryKey: ["anime", "detail", id],
    queryFn: ({ signal }) => getAnimeById(id as number, signal),
    enabled: id !== undefined,
    staleTime: 30 * 60 * 1000
  });
}
