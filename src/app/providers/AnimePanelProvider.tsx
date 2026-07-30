import { useMemo, useState, type PropsWithChildren } from "react";
import type { Anime } from "../../domain/anime/types";
import { AnimePanelContext } from "./animePanelContext";

export function AnimePanelProvider({ children }: PropsWithChildren) {
  const [selectedAnime, setSelectedAnime] = useState<Anime>();
  const value = useMemo(
    () => ({
      selectedAnime,
      openAnime: setSelectedAnime,
      closeAnime: () => setSelectedAnime(undefined)
    }),
    [selectedAnime]
  );

  return (
    <AnimePanelContext.Provider value={value}>
      {children}
    </AnimePanelContext.Provider>
  );
}
