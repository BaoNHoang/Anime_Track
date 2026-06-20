import { useContext } from "react";
import { WatchProviderContext } from "../context/watchProviderContext";

export function useWatchProvider() {
  const context = useContext(WatchProviderContext);
  if (!context) {
    throw new Error("useWatchProvider must be used inside WatchProvider");
  }
  return context;
}
