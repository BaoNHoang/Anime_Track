export interface Anime {
  id: number;
  title: string;
  titleEnglish?: string;
  imageUrl: string;
  largeImageUrl: string;
  bannerImageUrl?: string;
  synopsis: string;
  score?: number;
  rank?: number;
  popularity?: number;
  episodes?: number;
  status: string;
  type: string;
  rating?: string;
  duration?: string;
  year?: number;
  season?: string;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    label?: string;
  };
  genres: string[];
  studios: string[];
  trailerUrl?: string;
  url: string;
}

export interface AnimePage {
  items: Anime[];
  currentPage: number;
  hasNextPage: boolean;
  lastPage?: number;
}
