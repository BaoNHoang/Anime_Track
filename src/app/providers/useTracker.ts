import { useContext } from "react";
import { TrackerContext } from "./trackerContext";

export function useTracker() {
  const context = useContext(TrackerContext);
  if (!context) {
    throw new Error("useTracker must be used inside TrackerProvider");
  }
  return context;
}
