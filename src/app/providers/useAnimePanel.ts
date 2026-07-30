import { useContext } from "react";
import { AnimePanelContext } from "./animePanelContext";

export function useAnimePanel() {
  const context = useContext(AnimePanelContext);
  if (!context) {
    throw new Error("useAnimePanel must be used inside AnimePanelProvider");
  }
  return context;
}
