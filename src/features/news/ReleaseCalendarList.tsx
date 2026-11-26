import { CalendarDays, ExternalLink } from "../../components/OwnedIcons";

interface ReleaseCalendarSource {
  name: string;
  url: string;
  description: string;
  region?: string;
}

export function ReleaseCalendarList({ sources }: { sources: readonly ReleaseCalendarSource[] }) {
  return <div className="news-resource-list">{sources.map((source) => (
    <article key={source.url}>
      <CalendarDays size={24} />
      <div><h3>{source.name}</h3><p>{source.description}</p>{source.region && <small>{source.region}</small>}</div>
      <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Open ${source.name} release calendar`}>Open calendar <ExternalLink size={14} /></a>
    </article>
  ))}</div>;
}
