import type { Anime } from "../../domain/anime/types";
import {
  safeExternalUrl,
  truncateExternalText
} from "../../domain/security/validation";
import type { TenraiAnimeDto } from "./dto";

export function mapTenraiAnime(dto: TenraiAnimeDto): Anime {
  const imageUrl = safeExternalUrl(dto.images.jpg.image_url) ?? "";
  const largeImageUrl =
    safeExternalUrl(dto.images.jpg.large_image_url) ?? imageUrl;
  const bannerImageUrl =
    safeExternalUrl(dto.trailer?.images?.maximum_image_url) ??
    safeExternalUrl(dto.trailer?.images?.large_image_url);

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
    trailerUrl: safeExternalUrl(dto.trailer?.url),
    url: safeExternalUrl(dto.url) ?? ""
  };
}
