import { useEffect, useState } from "react";
import { useTracker } from "../app/providers/useTracker";
import { X } from "./OwnedIcons";

export function EpisodeUndoToast() {
  const { episodeUndo, undoEpisode, dismissEpisodeUndo } = useTracker();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const token = episodeUndo?.token;
  useEffect(() => {
    if (token === undefined || hovered || focused) return;
    const timer = window.setTimeout(dismissEpisodeUndo, 8000);
    return () => window.clearTimeout(timer);
  }, [dismissEpisodeUndo, focused, hovered, token]);

  if (!episodeUndo) return null;
  return (
    <div className="episode-undo-toast"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <span role="status">{episodeUndo.message}</span>
      <button type="button" onClick={undoEpisode}>Undo</button>
      <button type="button" className="episode-undo-toast__dismiss" aria-label="Dismiss episode update" onClick={dismissEpisodeUndo}>
        <X size={16} />
      </button>
    </div>
  );
}
