export type MangaCatalogFeed = "publishing" | "popular";
export type MangaFeed = MangaCatalogFeed | "upcoming";

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
