import { Bell, Check, CheckCircle2, Smartphone } from "../../components/OwnedIcons";
import { useEffect, useState } from "react";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useNotifications } from "../../app/providers/useNotifications";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import type { ReleaseNotification } from "../../domain/notifications/releaseNotifications";
import { disablePushNotifications, enablePushNotifications, getPushCapability, type PushCapability } from "../../services/push/pushSubscription";

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
    error,
    refresh,
    clearNotification,
    clearAllNotifications
  } = useNotifications();
  const { openAnime } = useAnimePanel();
  const { getTracked, items } = useTracker();
  const { configured, user } = useCloudAuth();
  const missingSchedules = items.filter((item) =>
    item.status === "watching" && (!item.anime.broadcast?.day || !item.anime.broadcast?.time)
  ).length;
  const [pushCapability, setPushCapability] = useState<PushCapability>("unsupported");
  const [pushMessage, setPushMessage] = useState<string>();
  const [pushSaving, setPushSaving] = useState(false);

  useEffect(() => {
    void getPushCapability().then(setPushCapability).catch(() => setPushCapability("unsupported"));
  }, []);

  const updatePush = async () => {
    if (!user) return;
    setPushSaving(true);
    setPushMessage(undefined);
    try {
      if (pushCapability === "enabled") {
        await disablePushNotifications(user.id);
        setPushCapability(await getPushCapability());
      } else {
        await enablePushNotifications(user.id);
        setPushCapability(await getPushCapability());
      }
    } catch (failure) {
      setPushMessage(failure instanceof Error ? failure.message : "Push notifications could not be updated.");
      setPushCapability(await getPushCapability().catch((): PushCapability => "unsupported"));
    } finally {
      setPushSaving(false);
    }
  };

  const openNotificationAnime = (notification: ReleaseNotification) => {
    const tracked = getTracked(notification.animeId);
    openAnime(tracked?.anime ?? {
      id: notification.animeId,
      title: notification.title,
      imageUrl: notification.imageUrl,
      largeImageUrl: notification.imageUrl,
      synopsis: "",
      status: notification.kind === "season" ? "Not yet aired" : "Currently Airing",
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
      <section className="push-control" aria-labelledby="push-title">
        <span className="push-control__icon"><Smartphone size={19} /></span>
        <div>
          <h2 id="push-title">Device notifications</h2>
          <p>{!configured ? "Device notifications require a Banime account because subscriptions follow your account across devices." : pushCapability === "enabled" ? "This browser receives episode-release alerts, even when Banime is closed." : pushCapability === "denied" ? "Browser notifications are blocked for Banime. Change the site permission in your browser settings to enable them." : pushCapability === "unsupported" ? "This browser does not support web push notifications." : "Get episode-release alerts on this browser or installed Banime app, even while it is closed."}</p>
          {configured && user && pushCapability !== "unsupported" && pushCapability !== "denied" && <button className="button button--compact" type="button" onClick={() => void updatePush()} disabled={pushSaving}>{pushSaving ? "Saving…" : pushCapability === "enabled" ? "Turn off on this device" : "Enable device notifications"}</button>}
          {pushMessage && <p className="form-message form-message--error" role="alert">{pushMessage}</p>}
        </div>
      </section>
      <p>Episode times are estimated from broadcast schedules. Device alerts follow each title’s episode/finale/dub preference.</p>
      <button className="button button--compact" onClick={() => void refresh()}>Check now</button>
      {error && <p role="alert">{error}</p>}
      {missingSchedules > 0 && <p>{missingSchedules} watching titles have no broadcast schedule available. They cannot generate scheduled episode alerts.</p>}

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
                    {notification.kind === "season"
                      ? `A new season related to ${notification.sourceTitle ?? "your library"} was announced.`
                      : notification.episodeNumber
                        ? `Episode ${notification.episodeNumber} has aired.`
                        : "A new scheduled episode has aired."}
                  </span>
                  <time dateTime={notification.premiereAt ?? notification.releasedAt}>
                    {notification.kind === "season" && notification.premiereAt
                      ? `Premieres ${releaseTimeFormatter.format(new Date(notification.premiereAt))}`
                      : notification.kind === "season"
                        ? `Announced ${releaseTimeFormatter.format(new Date(notification.releasedAt))}`
                        : releaseTimeFormatter.format(new Date(notification.releasedAt))}
                  </time>
                </span>
              </button>
              <button
                className="notification-item__clear"
                type="button"
                onClick={() => clearNotification(notification.id)}
                aria-label={`Clear ${notification.title}${notification.episodeNumber ? ` episode ${notification.episodeNumber}` : ""} notification`}
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
            New episode numbers and upcoming seasons related to your library will appear here.
          </p>
        </section>
      )}
    </div>
  );
}
