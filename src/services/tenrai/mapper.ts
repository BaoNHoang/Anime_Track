import type { Anime } from "../../domain/anime/types";
import {
  safeExternalUrl,
  safeAnimeImageUrl,
  safeMyAnimeListAnimeUrl,
  safeTrailerUrl,
  truncateExternalText
} from "../../domain/security/validation";
import type { TenraiAnimeDto } from "./dto";

export function mapTenraiAnime(dto: TenraiAnimeDto): Anime {
  const imageUrl = safeAnimeImageUrl(dto.images.jpg.image_url) ?? "";
  const largeImageUrl =
    safeAnimeImageUrl(dto.images.jpg.large_image_url) ?? imageUrl;
  const bannerImageUrl =
    safeAnimeImageUrl(dto.trailer?.images?.maximum_image_url) ??
    safeAnimeImageUrl(dto.trailer?.images?.large_image_url);

  return {
    id: dto.mal_id,
    title: truncateExternalText(dto.title, 500),
    titleEnglish: dto.title_english
      ? truncateExternalText(dto.title_english, 500)
      : undefined,
    imageUrl,
    largeImageUrl,
    bannerImageUrl,
    synopsis: truncateExternalText(
      dto.synopsis ?? "No synopsis is available yet.",
      20_000
    ),
    score: dto.score ?? undefined,
    rank: dto.rank ?? undefined,
    popularity: dto.popularity ?? undefined,
    episodes: dto.episodes ?? undefined,
    status: dto.status ?? "Unknown",
    type: dto.type ?? "Anime",
    rating: dto.rating ?? undefined,
    duration: dto.duration ?? undefined,
    year: dto.year ?? undefined,
    season: dto.season ?? undefined,
    startDate:
      dto.aired?.from && !Number.isNaN(Date.parse(dto.aired.from))
        ? dto.aired.from
        : undefined,
    broadcast: dto.broadcast
      ? {
          day: dto.broadcast.day ?? undefined,
          time: dto.broadcast.time ?? undefined,
          timezone: dto.broadcast.timezone ?? undefined,
          label: dto.broadcast.string ?? undefined
        }
      : undefined,
    genres:
      dto.genres
        ?.slice(0, 50)
        .map((genre) => truncateExternalText(genre.name, 200)) ?? [],
    studios:
      dto.studios
        ?.slice(0, 50)
        .map((studio) => truncateExternalText(studio.name, 200)) ?? [],
    trailerUrl: safeTrailerUrl(dto.trailer?.url),
    streaming: (dto.streaming ?? [])
      .map((service) => ({
        provider: truncateExternalText(service.name, 120),
        // The upstream catalog still publishes a few official provider links
        // with an obsolete http scheme. Never render plain-http destinations.
        url: safeExternalUrl(service.url.replace(/^http:/i, "https:")),
        regionStatus: "catalog" as const
      }))
      .filter((service): service is { provider: string; url: string; regionStatus: "catalog" } =>
        Boolean(service.provider && service.url)
      )
      .filter((service, index, services) =>
        services.findIndex((candidate) => candidate.url === service.url) === index
      )
      .slice(0, 24),
    url:
      safeMyAnimeListAnimeUrl(dto.url) ??
      `https://myanimelist.net/anime/${dto.mal_id}`
  };
}
