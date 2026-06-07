export interface AnimeNewsArticle {
  id: number;
  animeId: number;
  animeTitle: string;
  animeImageUrl: string;
  title: string;
  url: string;
  publishedAt: string;
  author: string;
  imageUrl?: string;
  excerpt: string;
  comments: number;
}

export interface AnimePromo {
  animeId: number;
  animeTitle: string;
  animeUrl: string;
  imageUrl: string;
  promoTitle: string;
  videoUrl?: string;
  embedUrl: string;
}

export interface AnimeNewsFeed {
  articles: AnimeNewsArticle[];
  promos: AnimePromo[];
}
