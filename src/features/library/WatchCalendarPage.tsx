import { useState } from "react";
import { useTracker } from "../../app/providers/useTracker";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { watchCalendar } from "../../domain/anime/calendar";
import { LibraryTools } from "./LibraryTools";

export function WatchCalendarPage() {
  const { items, isReady } = useTracker();
  const { openAnime } = useAnimePanel();
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState(7);
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + offset);
  const end = new Date(start); end.setDate(end.getDate() + days);
  const events = watchCalendar(items, start, end);
  return <div className="page-stack"><h1>Watch calendar</h1><LibraryTools />
    <p>Upcoming broadcasts and premieres for your library, in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Weekly times are estimates; delays and breaks may differ.</p>
    <div className="filter-chips">
      <button onClick={() => setOffset(offset - days)}>Previous</button>
      <button onClick={() => setOffset(0)}>Today</button>
      <button onClick={() => setOffset(offset + days)}>Next</button>
      <label>View <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setOffset(0); }}>
        <option value={7}>7 days</option><option value={30}>30 days</option>
      </select></label>
    </div>
    <h2>{start.toLocaleDateString()} – {new Date(end.getTime() - 1).toLocaleDateString()}</h2>
    {!isReady ? <p role="status">Loading library…</p> : events.length ? <section className="notification-list">
      {events.map(({ item, at, premiere }) => <article className="notification-item" key={item.anime.id + at.toISOString()}>
        <button className="notification-item__anime" onClick={() => openAnime(item.anime)}>
          <span className="notification-item__poster">{item.anime.imageUrl && <img src={item.anime.imageUrl} alt="" loading="lazy" />}</span>
          <span className="notification-item__copy"><strong>{item.anime.titleEnglish || item.anime.title}</strong>
            <span>{premiere ? "Premiere" : "Scheduled broadcast"}</span>
            <time dateTime={at.toISOString()}>{at.toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
          </span>
        </button>
      </article>)}
    </section> : <p>No scheduled releases in this range. Add airing or upcoming titles with known broadcast dates to your library.</p>}
  </div>;
}
