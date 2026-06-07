export interface JikanNewsDto {
  mal_id: number;
  url: string;
  title: string;
  date: string;
  author_username?: string | null;
  images: {
    jpg: {
      image_url?: string | null;
    };
  };
  comments: number;
  excerpt?: string | null;
}

export interface JikanNewsResponse {
  data: JikanNewsDto[];
}

export interface JikanPromoDto {
  title: string;
  entry: {
    mal_id: number;
    url: string;
    title: string;
    images: {
      jpg: {
        image_url: string;
        large_image_url: string;
      };
    };
  };
  trailer: {
    url?: string | null;
    embed_url: string;
  };
}

export interface JikanPromoResponse {
  data: JikanPromoDto[];
}
