export interface NewsArticle {
  id: number;
  title: string;
  url: string;
  publishedAt: string;
  author: string;
  imageUrl?: string;
  excerpt: string;
  comments: number;
}

export interface AnimeNewsArticle extends NewsArticle {
  animeId: number;
  animeTitle: string;
  animeImageUrl: string;
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
