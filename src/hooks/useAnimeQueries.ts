import { useQuery } from "@tanstack/react-query";
import {
  getAnimeById,
  browseAnime,
  getCurrentSeason,
  getTopAnimeCacheMs,
  getTopAnime,
  searchAnime,
  type AnimeBrowsePreset
} from "../services/tenrai/animeService";

const DISCOVERY_QUERY_GC_MS = 30 * 60 * 1000;

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
    gcTime: DISCOVERY_QUERY_GC_MS,
    placeholderData: (previousData) => previousData
  });
}

export function useAnimeSearch(query: string, page = 1) {
  return useQuery({
    queryKey: ["anime", "search", query, page],
    queryFn: ({ signal }) => searchAnime(query, page, signal),
    enabled: query.trim().length >= 2,
    staleTime: 30 * 60 * 1000,
    gcTime: DISCOVERY_QUERY_GC_MS,
    placeholderData: (previousData) => previousData
  });
}

export function useAnimeBrowse(preset: AnimeBrowsePreset, page = 1) {
  return useQuery({
    queryKey: ["anime", "browse", preset, page],
    queryFn: ({ signal }) => browseAnime(preset, page, signal),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: DISCOVERY_QUERY_GC_MS,
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
