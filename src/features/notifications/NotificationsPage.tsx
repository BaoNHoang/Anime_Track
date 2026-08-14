import { Bell, Check, CheckCircle2 } from "../../components/OwnedIcons";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useNotifications } from "../../app/providers/useNotifications";
import { useTracker } from "../../app/providers/useTracker";
import type { ReleaseNotification } from "../../domain/notifications/releaseNotifications";

const releaseTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    clearNotification,
    clearAllNotifications
  } = useNotifications();
  const { openAnime } = useAnimePanel();
  const { getTracked } = useTracker();

  const openNotificationAnime = (notification: ReleaseNotification) => {
    const tracked = getTracked(notification.animeId);
    openAnime(tracked?.anime ?? {
      id: notification.animeId,
      title: notification.title,
      imageUrl: notification.imageUrl,
      largeImageUrl: notification.imageUrl,
      synopsis: "",
      status: "Currently Airing",
      type: "Anime",
      genres: [],
      studios: [],
      url: ""
    });
  };

  return (
    <div className="notification-page">
      <header className="notification-page__toolbar">
        <div className="notification-page__title">
          <span aria-hidden="true"><Bell size={21} /></span>
          <div>
            <h1>Notifications</h1>
            <p>
              {unreadCount
                ? `${unreadCount} new release${unreadCount === 1 ? "" : "s"}`
                : "You are caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            className="button button--ghost button--compact"
            type="button"
            onClick={clearAllNotifications}
          >
            <CheckCircle2 size={16} /> Clear all
          </button>
        )}
      </header>

      {notifications.length > 0 ? (
        <section className="notification-list" aria-label="New anime releases">
          {notifications.map((notification) => (
            <article className="notification-item" key={notification.id}>
              <button
                className="notification-item__anime"
                type="button"
                onClick={() => openNotificationAnime(notification)}
              >
                <span className="notification-item__poster">
                  {notification.imageUrl ? (
                    <img src={notification.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <Bell size={20} />
                  )}
                </span>
                <span className="notification-item__copy">
                  <strong>{notification.title}</strong>
                  <span>
                    {notification.trackingStatus === "watching"
                      ? "A new scheduled episode has aired."
                      : "A planned title has a new scheduled episode."}
                  </span>
                  <time dateTime={notification.releasedAt}>
                    {releaseTimeFormatter.format(new Date(notification.releasedAt))}
                  </time>
                </span>
              </button>
              <button
                className="notification-item__clear"
                type="button"
                onClick={() => clearNotification(notification.id)}
                aria-label={`Clear ${notification.title} notification`}
                title="Mark as cleared"
              >
                <Check size={18} />
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="notification-empty">
          <span aria-hidden="true"><CheckCircle2 size={28} /></span>
          <h2>No new releases</h2>
          <p>
            New episodes for anime you are watching or planning will appear here.
          </p>
        </section>
      )}
    </div>
  );
}
