import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { Anime } from "../domain/anime/types";
import {
  buildWatchSearchUrl,
  DEFAULT_WATCH_PROVIDER_ID,
  getWatchProvider,
  WATCH_PROVIDERS
} from "../domain/watch/providers";
import { WatchProviderContext } from "./watchProviderContext";

const WATCH_PROVIDER_KEY = "banime:watch-provider:v2";

function getInitialProviderId() {
  try {
    const savedProviderId = window.localStorage.getItem(WATCH_PROVIDER_KEY);
    return getWatchProvider(savedProviderId ?? undefined).id;
  } catch {
    return DEFAULT_WATCH_PROVIDER_ID;
  }
}

export function WatchProvider({ children }: PropsWithChildren) {
  const [providerId, setProviderIdState] = useState(getInitialProviderId);
  const provider = getWatchProvider(providerId);

  const setProviderId = useCallback((nextProviderId: string) => {
    const nextProvider = getWatchProvider(nextProviderId);
    setProviderIdState(nextProvider.id);
    window.localStorage.setItem(WATCH_PROVIDER_KEY, nextProvider.id);
  }, []);

  const getWatchUrl = useCallback(
    (anime: Anime) => buildWatchSearchUrl(providerId, anime),
    [providerId]
  );

  const value = useMemo(
    () => ({
      providerId: provider.id,
      provider,
      providers: WATCH_PROVIDERS,
      setProviderId,
      getWatchUrl
    }),
    [getWatchUrl, provider, setProviderId]
  );

  return (
    <WatchProviderContext.Provider value={value}>
      {children}
    </WatchProviderContext.Provider>
  );
}
