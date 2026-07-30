import { createContext } from "react";
import type { Anime } from "../../domain/anime/types";

export interface AnimePanelContextValue {
  selectedAnime?: Anime;
  openAnime: (anime: Anime) => void;
  closeAnime: () => void;
}

export const AnimePanelContext = createContext<
  AnimePanelContextValue | undefined
>(undefined);
