import { FIGURE_RELEASE_SOURCES } from "../../domain/news/releaseSources";
import { ReleaseCalendarList } from "./ReleaseCalendarList";

export function FigureReleases() {
  return <section className="page-stack" aria-label="Official figure release calendars">
    <ReleaseCalendarList sources={FIGURE_RELEASE_SOURCES} />
  </section>;
}
