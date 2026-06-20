import { createContext } from "react";
import type { Anime } from "../domain/anime/types";
import type { WATCH_PROVIDERS } from "../domain/watch/providers";

export interface WatchProviderContextValue {
  providerId: string;
  provider: (typeof WATCH_PROVIDERS)[number];
  providers: typeof WATCH_PROVIDERS;
  setProviderId: (providerId: string) => void;
  getWatchUrl: (anime: Anime) => string;
}

export const WatchProviderContext = createContext<
  WatchProviderContextValue | undefined
>(undefined);
