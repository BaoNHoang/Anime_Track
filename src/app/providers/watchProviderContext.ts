import { createContext } from "react";
export interface WatchProviderContextValue {
  region: string;
  setRegion: (region: string) => void;
}

export const WatchProviderContext = createContext<
  WatchProviderContextValue | undefined
>(undefined);
