import { useMemo, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useTracker } from "../../app/providers/useTracker";
import { Share2, Sparkles } from "../../components/OwnedIcons";
import {
  availableReviewYears,
  createYearInReview,
  parseSharedYearInReview,
  serializeYearInReview
} from "../../domain/tracker/yearInReview";
import { useLocalProfile } from "../../hooks/useLocalProfile";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function YearInReviewPage() {
  const [searchParams] = useSearchParams();
  const shared = useMemo(
    () => parseSharedYearInReview(searchParams),
    [searchParams]
  );
  const { items, isReady } = useTracker();
  const { configured, initialized, user } = useCloudAuth();
  const { profile } = useLocalProfile();
  const years = useMemo(() => availableReviewYears(items), [items]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const personalReview = useMemo(
    () => createYearInReview(items, selectedYear),
    [items, selectedYear]
  );
  const review = shared?.review ?? personalReview;
  const username = shared?.username ?? user?.username ??
    (!configured ? profile.username : undefined);
  const [shareMessage, setShareMessage] = useState("");
  const maxMonth = Math.max(1, ...review.monthlyEpisodes);
  const canViewPersonal = initialized && isReady && (!configured || Boolean(user));

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = serializeYearInReview(review, username).toString();
    const payload = {
      title: `${username ? `${username}'s ` : ""}${review.year} Banime recap`,
      text: `${review.episodesWatched} episodes watched in ${review.year}.`,
      url: url.toString()
    };
    try {
      const nativeShare = Reflect.get(navigator, "share") as
        | ((data: ShareData) => Promise<void>)
        | undefined;
      if (nativeShare) {
        await nativeShare.call(navigator, payload);
        setShareMessage("Recap shared.");
      } else {
        await navigator.clipboard.writeText(payload.url);
        setShareMessage("Share link copied.");
      }
    } catch {
      setShareMessage("");
    }
  };

  if (!shared && !canViewPersonal) {
    return (
      <div className="year-review year-review--empty">
        <Sparkles size={28} />
        <h1>Your year in anime</h1>
        <p>Sign in to turn your dated episode history into an annual recap.</p>
        <Link className="button" to="/account?mode=sign_in">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="year-review">
      <header className="year-review__header">
        <div>
          <span>{shared ? "Shared Banime recap" : "Your year in anime"}</span>
          <h1>{review.year}{username ? ` · ${username}` : ""}</h1>
        </div>
        <div className="year-review__actions">
          {!shared && (
            <label>
              <span className="visually-hidden">Recap year</span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {years.map((year) => (
                  <option value={year} key={year}>{year}</option>
                ))}
              </select>
            </label>
          )}
          <button
            className="button button--ghost"
            type="button"
            onClick={() => void share()}
          >
            <Share2 size={16} /> Share recap
          </button>
        </div>
      </header>

      <section className="year-review__lead" aria-label={`${review.year} watch totals`}>
        <div><strong>{review.episodesWatched}</strong><span>episodes dated</span></div>
        <div><strong>{Math.round(review.minutesWatched / 60)}</strong><span>hours watched</span></div>
        <div><strong>{review.completedTitles}</strong><span>titles completed</span></div>
        <div><strong>{review.completionRate}%</strong><span>completion rate</span></div>
      </section>

      <section className="year-review__strip">
        <div className="year-review__section-title">
          <div><Sparkles size={16} /><h2>Watch strip</h2></div>
          <span>{review.activeTitles} active title{review.activeTitles === 1 ? "" : "s"}</span>
        </div>
        <div className="year-review__months">
          {review.monthlyEpisodes.map((count, index) => (
            <div key={MONTHS[index]}>
              <span className="year-review__bar-track">
                <span
                  style={{
                    "--bar-height": count
                      ? `${Math.max(4, (count / maxMonth) * 100)}%`
                      : "0%"
                  } as CSSProperties}
                />
              </span>
              <strong>{count}</strong>
              <small>{MONTHS[index]}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="year-review__favorites">
        <section>
          <h2>Genres you lived in</h2>
          {review.favoriteGenres.length ? review.favoriteGenres.map((item, index) => (
            <div key={item.name}>
              <span>{index + 1}</span><strong>{item.name}</strong>
              <small>{item.count} episodes</small>
            </div>
          )) : <p>Add watch dates to reveal your top genres.</p>}
        </section>
        <section>
          <h2>Studios on repeat</h2>
          {review.favoriteStudios.length ? review.favoriteStudios.map((item, index) => (
            <div key={item.name}>
              <span>{index + 1}</span><strong>{item.name}</strong>
              <small>{item.count} episodes</small>
            </div>
          )) : <p>Add watch dates to reveal your top studios.</p>}
        </section>
      </div>
      {!shared && (
        <p className="year-review__note">
          Only episodes with watch dates count toward monthly and watch-time totals.
        </p>
      )}
      {shareMessage && (
        <p className="form-message form-message--success" role="status">
          {shareMessage}
        </p>
      )}
    </div>
  );
}
