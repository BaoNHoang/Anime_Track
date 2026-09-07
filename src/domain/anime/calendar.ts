import type { TrackedAnime } from "../tracker/types";
import { getNextAiringAt } from "./airing";

export function watchCalendar(items: TrackedAnime[], start: Date, end: Date) {
  return items.flatMap((item) => {
    if (item.status === "dropped" || item.status === "completed") return [];
    const events: { item: TrackedAnime; at: Date; premiere: boolean }[] = [];
    const premiere = item.anime.startDate ? new Date(item.anime.startDate) : undefined;
    if (item.anime.status === "Not yet aired") {
      if (premiere && premiere >= start && premiere < end) events.push({ item, at: premiere, premiere: true });
      return events;
    }
    let cursor = new Date(Math.max(start.getTime() - 1, (premiere?.getTime() || 0) - 1));
    for (let index = 0; index < 6; index++) {
      const at = getNextAiringAt(item.anime, cursor);
      if (!at || at >= end) break;
      // Broadcast data describes weekly estimates, not confirmed episode releases.
      events.push({ item, at, premiere: false });
      cursor = new Date(at.getTime() + 1);
    }
    return events;
  }).sort((a, b) => a.at.getTime() - b.at.getTime());
}
