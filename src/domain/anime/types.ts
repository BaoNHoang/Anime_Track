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
  startDate?: string;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    label?: string;
  };
  genres: string[];
  studios: string[];
  trailerUrl?: string;
  streaming?: StreamingAvailability[];
  url: string;
}

export interface StreamingAvailability {
  /** Name and official destination supplied by the catalog. */
  provider: string;
  url: string;
  /** The catalog does not claim a country-specific entitlement. */
  regionStatus: "catalog";
  /** Only shown when the provider/catalog actually supplies language metadata. */
  audio?: "sub" | "dub" | "sub_and_dub";
}

export interface AnimePage {
  items: Anime[];
  currentPage: number;
  hasNextPage: boolean;
  lastPage?: number;
}
