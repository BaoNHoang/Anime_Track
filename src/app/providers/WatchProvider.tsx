import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { DEFAULT_STREAMING_REGION, STREAMING_REGIONS } from "../../domain/watch/providers";
import { WatchProviderContext } from "./watchProviderContext";

const STREAMING_REGION_KEY = "banime:streaming-region:v1";

function getInitialRegion() {
  try {
    const saved = window.localStorage.getItem(STREAMING_REGION_KEY);
    return STREAMING_REGIONS.some(([id]) => id === saved)
      ? saved as string
      : DEFAULT_STREAMING_REGION;
  } catch {
    return DEFAULT_STREAMING_REGION;
  }
}

export function WatchProvider({ children }: PropsWithChildren) {
  const [region, setRegionState] = useState(getInitialRegion);

  const setRegion = useCallback((nextRegion: string) => {
    if (!STREAMING_REGIONS.some(([id]) => id === nextRegion)) return;
    setRegionState(nextRegion);
    window.localStorage.setItem(STREAMING_REGION_KEY, nextRegion);
  }, []);

  const value = useMemo(
    () => ({
      region,
      setRegion
    }),
    [region, setRegion]
  );

  return (
    <WatchProviderContext.Provider value={value}>
      {children}
    </WatchProviderContext.Provider>
  );
}
