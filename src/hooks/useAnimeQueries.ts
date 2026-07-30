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
  filter: "airing" | "upcoming" | "bypopularity"
) {
  const cacheTime = getTopAnimeCacheMs(filter);

  return useQuery({
    queryKey: ["anime", "top", filter],
    queryFn: ({ signal }) => getTopAnime(filter, signal),
    staleTime: cacheTime,
    gcTime: 2 * 60 * 60 * 1000,
    refetchInterval: cacheTime,
    placeholderData: (previousData) => previousData
  });
}

export function useAnimeSearch(query: string) {
  return useQuery({
    queryKey: ["anime", "search", query],
    queryFn: ({ signal }) => searchAnime(query, signal),
    enabled: query.trim().length >= 2,
    staleTime: 10 * 60 * 1000
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
