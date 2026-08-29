import { Check, Plus } from "../../components/OwnedIcons";
import { useState } from "react";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import type { TrackedAnime } from "../../domain/tracker/types";
import { nextEpisodeNumber } from "../../domain/tracker/episodes";

function relativeTime(value: string, now: number) {
  const elapsedSeconds = Math.max(0, (now - Date.parse(value)) / 1000);
  if (elapsedSeconds < 60) return "Just now";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60]
  ];
  const [unit, seconds] = units.find(([, size]) => elapsedSeconds >= size) ?? units.at(-1)!;
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    -Math.floor(elapsedSeconds / seconds),
    unit
  );
}

function activityText(item: TrackedAnime) {
  const title = item.anime.titleEnglish || item.anime.title;
  if (item.status === "completed") return `Completed ${title}`;
  if (item.status === "plan_to_watch") return `Plans to watch ${title}`;
  if (item.status === "on_hold") return `Paused ${title}`;
  if (item.status === "dropped") return `Dropped ${title}`;
  return item.progress > 0
    ? `Watched episode ${item.progress} of ${title}`
    : `Started watching ${title}`;
}

function ActivityItem({ item, now }: { item: TrackedAnime; now: number }) {
  const { openAnime } = useAnimePanel();
  const { setEpisodeWatched } = useTracker();
  const total = item.anime.episodes;
  const isComplete = Boolean(total && item.progress >= total);
  const nextEpisode = nextEpisodeNumber(item);

  return (
    <article className="activity-item">
      <button className="activity-item__poster" onClick={() => openAnime(item.anime)}>
        {item.anime.imageUrl ? <img src={item.anime.imageUrl} alt="" /> : <span />}
      </button>
      <button className="activity-item__copy" onClick={() => openAnime(item.anime)}>
        <strong>{activityText(item)}</strong>
        <time dateTime={item.updatedAt}>{relativeTime(item.updatedAt, now)}</time>
      </button>
      {item.status === "watching" && (
        <button
          className="activity-item__update"
          type="button"
          aria-label={isComplete ? "Completed" : `Mark episode ${nextEpisode} watched`}
          title={isComplete ? "Completed" : "Add one episode"}
          disabled={isComplete}
          onClick={() =>
            setEpisodeWatched(
              item.anime.id,
              nextEpisode ?? item.progress + 1,
              true,
              new Date().toISOString().slice(0, 10)
            )
          }
        >
          {isComplete ? <Check size={16} /> : <Plus size={16} />}
        </button>
      )}
    </article>
  );
}

export function RecentActivity() {
  const { items } = useTracker();
  const [now] = useState(() => Date.now());
  const recent = [...items]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 12);

  if (!recent.length) {
    return (
      <div className="empty-inline">
        <div>
          <strong>Your activity will appear here.</strong>
          <p>Add an anime to start building your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-grid">
      {recent.map((item) => <ActivityItem item={item} now={now} key={item.anime.id} />)}
    </div>
  );
}
