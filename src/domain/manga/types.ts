export type MangaFeed = "publishing" | "upcoming" | "popular";

export interface Manga {
  id: number;
  title: string;
  imageUrl?: string;
  synopsis: string;
  status: string;
  publication: string;
  score?: number;
  url: string;
}
