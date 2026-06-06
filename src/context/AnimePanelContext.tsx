import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { Anime } from "../domain/anime/types";

interface AnimePanelContextValue {
  selectedAnime?: Anime;
  openAnime: (anime: Anime) => void;
  closeAnime: () => void;
}

const AnimePanelContext = createContext<AnimePanelContextValue | undefined>(
  undefined
);

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

export function useAnimePanel() {
  const context = useContext(AnimePanelContext);
  if (!context) {
    throw new Error("useAnimePanel must be used inside AnimePanelProvider");
  }
  return context;
}
