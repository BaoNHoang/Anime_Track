import { FIGURE_RELEASE_SOURCES } from "../../domain/news/releaseSources";
import { CalendarDays, ExternalLink } from "../../components/OwnedIcons";

export function FigureReleases() {
  return <section className="page-stack" aria-label="Official figure release calendars">
    <p className="news-tab-note">Check upcoming figures, shipping dates, and preorder updates directly with the manufacturers. Dates and availability vary by region.</p>
    <div className="news-resource-list">{FIGURE_RELEASE_SOURCES.map((source) => (
      <article key={source.url}>
        <CalendarDays size={24} />
        <div><h3>{source.name}</h3><p>{source.description}</p><small>{source.region}</small></div>
        <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Open ${source.name} release calendar`}>Open calendar <ExternalLink size={14} /></a>
      </article>
    ))}</div>
  </section>;
}
