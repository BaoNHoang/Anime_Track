export interface TenraiNewsDto {
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

export interface TenraiNewsResponse {
  data: TenraiNewsDto[];
}
