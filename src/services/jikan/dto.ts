export interface JikanAnimeDto {
  mal_id: number;
  url: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  trailer?: {
    url?: string | null;
  };
  title: string;
  title_english?: string | null;
  type?: string | null;
  episodes?: number | null;
  status?: string | null;
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  rank?: number | null;
  popularity?: number | null;
  synopsis?: string | null;
  season?: string | null;
  year?: number | null;
  broadcast?: {
    day?: string | null;
    time?: string | null;
    timezone?: string | null;
    string?: string | null;
  } | null;
  genres?: Array<{ name: string }>;
  studios?: Array<{ name: string }>;
}

export interface JikanPagination {
  current_page: number;
  has_next_page: boolean;
}

export interface JikanListResponse {
  data: JikanAnimeDto[];
  pagination: JikanPagination;
}

export interface JikanItemResponse {
  data: JikanAnimeDto;
}
