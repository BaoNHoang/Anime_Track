export interface TenraiNewsDto {
  mal_id: number;
  url: string;
  title: string;
  date: string | null;
  author_username?: string | null;
  images?: {
    jpg?: {
      image_url?: string | null;
    } | null;
  } | null;
  comments: number;
  excerpt?: string | null;
}

export interface TenraiNewsResponse {
  data: TenraiNewsDto[];
  pagination?: { has_next_page?: boolean };
}
