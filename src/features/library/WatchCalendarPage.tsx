import { useMemo, useState } from "react";
import { useTracker } from "../../app/providers/useTracker";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { watchCalendar } from "../../domain/anime/calendar";
import type { TrackedAnime } from "../../domain/tracker/types";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Shuffle
} from "../../components/OwnedIcons";
import { LibraryTools } from "./LibraryTools";

const dayHeading = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric"
});

function animeTitle(item: TrackedAnime) {
  return item.anime.titleEnglish || item.anime.title;
}

export function WatchCalendarPage() {
  const { items, isReady, setEpisodeWatched } = useTracker();
  const { openAnime } = useAnimePanel();
  const [offset, setOffset] = useState(0);
  const [pick, setPick] = useState<TrackedAnime>();
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() + offset);
    return value;
  }, [offset]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      return date;
    }),
    [today]
  );
  const end = new Date(today);
  end.setDate(end.getDate() + 7);
  const events = watchCalendar(items, today, end);
  const eventsByDay = new Map<string, typeof events>();
  for (const event of events) {
    const key = event.at.toDateString();
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  }
  const watchable = items.filter(
    (item) => item.status === "watching" || item.status === "plan_to_watch"
  );
  const active = items.filter((item) => item.status === "watching");

  function pickForTonight() {
    setPick(
      watchable.length
        ? watchable[Math.floor(Math.random() * watchable.length)]
        : undefined
    );
  }

  return (
    <div className="page-stack watch-planner">
      <header className="watch-planner__header">
        <div>
          <h1>Watch planner</h1>
          <p>
            Your next seven days of anime, in {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
        </div>
        <button className="button" onClick={pickForTonight} disabled={!watchable.length}>
          <Shuffle size={16} /> Pick something for tonight
        </button>
      </header>

      <LibraryTools />

      {pick && (
        <section className="watch-planner__pick" aria-live="polite">
          {pick.anime.imageUrl && <img src={pick.anime.imageUrl} alt="" />}
          <div>
            <span>Tonight&apos;s pick</span>
            <h2>{animeTitle(pick)}</h2>
            <p>
              {pick.status === "watching"
                ? `Continue with episode ${pick.progress + 1}.`
                : "A title from your plan-to-watch list."}
            </p>
          </div>
          <button className="button" onClick={() => openAnime(pick.anime)}>
            Open details <ChevronRight size={16} />
          </button>
        </section>
      )}

      <section className="watch-planner__overview" aria-label="Planner summary">
        <div>
          <CalendarDays size={18} />
          <span><strong>{events.length}</strong> scheduled broadcasts this week</span>
        </div>
        <div>
          <PlayCircle size={18} />
          <span><strong>{active.length}</strong> titles in progress</span>
        </div>
        <p>Broadcast times are weekly estimates. Streaming releases, breaks, and delays can differ.</p>
      </section>

      <div className="watch-planner__controls" aria-label="Calendar range">
        <button className="button button--ghost" onClick={() => setOffset((value) => value - 7)}>
          <ChevronLeft size={16} /> Previous week
        </button>
        <button className="button button--ghost" onClick={() => setOffset(0)}>Today</button>
        <button className="button button--ghost" onClick={() => setOffset((value) => value + 7)}>
          Next week <ChevronRight size={16} />
        </button>
        <span>{dayHeading.format(today)} – {dayHeading.format(days[6])}</span>
      </div>

      {!isReady ? (
        <p role="status">Loading your watch planner…</p>
      ) : (
        <section className="watch-planner__week" aria-label="Seven day watch plan">
          {days.map((day, index) => {
            const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
            return (
              <section className="watch-planner__day" key={day.toISOString()}>
                <h2>{index === 0 && offset === 0 ? "Today" : day.toLocaleDateString(undefined, { weekday: "long" })}</h2>
                <time dateTime={day.toISOString()}>{dayHeading.format(day)}</time>
                {dayEvents.length ? (
                  <div>
                    {dayEvents.map(({ item, at, premiere }) => (
                      <article key={`${item.anime.id}-${at.toISOString()}`}>
                        <button onClick={() => openAnime(item.anime)}>
                          {item.anime.imageUrl ? <img src={item.anime.imageUrl} alt="" loading="lazy" /> : <span className="watch-planner__poster-fallback" />}
                          <span>
                            <strong>{animeTitle(item)}</strong>
                            <small>{premiere ? "Premiere" : "Scheduled broadcast"}</small>
                            <time dateTime={at.toISOString()}>{at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</time>
                          </span>
                        </button>
                      </article>
                    ))}
                  </div>
                ) : <p>No planned broadcasts</p>}
              </section>
            );
          })}
        </section>
      )}

      {active.length > 0 && (
        <section className="watch-planner__continue" aria-labelledby="continue-title">
          <div>
            <h2 id="continue-title">Continue watching</h2>
            <p>Log an episode without leaving your plan.</p>
          </div>
          <div>
            {active.slice(0, 4).map((item) => {
              const complete = Boolean(item.anime.episodes && item.progress >= item.anime.episodes);
              return (
                <article key={item.anime.id}>
                  {item.anime.imageUrl && <img src={item.anime.imageUrl} alt="" loading="lazy" />}
                  <div>
                    <button onClick={() => openAnime(item.anime)}>{animeTitle(item)}</button>
                    <span>{item.progress} / {item.anime.episodes ?? "?"} episodes</span>
                  </div>
                  <button
                    className="button button--compact"
                    disabled={complete}
                    onClick={() => setEpisodeWatched(item.anime.id, item.progress + 1, true)}
                  >
                    <PlayCircle size={15} /> {complete ? "Complete" : `Log ep. ${item.progress + 1}`}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!events.length && isReady && !watchable.length && (
        <section className="empty-state watch-planner__empty">
          <CalendarDays size={26} />
          <h2>Your watch week starts with a title.</h2>
          <p>Add currently airing or upcoming anime to your library to see their schedule here.</p>
        </section>
      )}
    </div>
  );
}
