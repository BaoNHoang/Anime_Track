import type { Anime } from "../../domain/anime/types";
import type { JikanAnimeDto } from "./dto";

export function mapJikanAnime(dto: JikanAnimeDto): Anime {
  return {
    id: dto.mal_id,
    title: dto.title,
    titleEnglish: dto.title_english ?? undefined,
    imageUrl: dto.images.jpg.image_url,
    largeImageUrl:
      dto.images.jpg.large_image_url || dto.images.jpg.image_url,
    synopsis: dto.synopsis ?? "No synopsis is available yet.",
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
    genres: dto.genres?.map((genre) => genre.name) ?? [],
    studios: dto.studios?.map((studio) => studio.name) ?? [],
    trailerUrl: dto.trailer?.url ?? undefined,
    url: dto.url
  };
}
