import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type TrackedRow = { user_id: string; item: Record<string, unknown>; tracking_status: string };
type Cursor = { user_id: string; last_checked_at: string };
type Subscription = { endpoint: string; p256dh: string; auth: string };

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const titleOf = (anime: Record<string, unknown>) => String(anime.titleEnglish || anime.title || "Anime");

function nextAt(anime: Record<string, unknown>, from: Date) {
  const broadcast = anime.broadcast as Record<string, unknown> | undefined;
  const day = typeof broadcast?.day === "string" ? broadcast.day.replace(/s$/i, "").toLowerCase() : "";
  const time = typeof broadcast?.time === "string" ? broadcast.time : "";
  const timeZone = typeof broadcast?.timezone === "string" ? broadcast.timezone : "";
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDay = days.indexOf(day);
  const [hour, minute] = time.split(":").map(Number);
  if (anime.status !== "Currently Airing" || targetDay < 0 || !Number.isInteger(hour) || !Number.isInteger(minute) || !timeZone) return undefined;
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", year: "numeric", month: "numeric", day: "numeric", hourCycle: "h23" }).formatToParts(from);
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    const weekday = days.indexOf((part("weekday") ?? "").toLowerCase());
    const year = Number(part("year")); const month = Number(part("month")); const date = Number(part("day"));
    if (weekday < 0 || !year || !month || !date) return undefined;
    let offset = (targetDay - weekday + 7) % 7;
    const candidate = () => {
      const wall = Date.UTC(year, month - 1, date + offset, hour, minute);
      const zoneParts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }).formatToParts(new Date(wall));
      const value = (type: string) => Number(zoneParts.find((item) => item.type === type)?.value);
      return new Date(wall - (Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second")) - wall));
    };
    let result = candidate();
    if (result <= from) { offset += 7; result = candidate(); }
    return result;
  } catch { return undefined; }
}

function releasedEpisodes(row: TrackedRow, since: Date, now: Date) {
  const item = row.item; const anime = item.anime as Record<string, unknown> | undefined;
  if (!anime || (row.tracking_status !== "watching" && row.tracking_status !== "plan_to_watch")) return [];
  const preference = item.releaseNotificationMode === "finale_only" || item.releaseNotificationMode === "dubbed_only" ? item.releaseNotificationMode : "every_episode";
  if (preference === "dubbed_only" && !/\b(?:english\s+)?dub(?:bed)?\b/i.test(String((anime.broadcast as Record<string, unknown> | undefined)?.label ?? ""))) return [];
  const start = typeof anime.startDate === "string" ? new Date(anime.startDate) : undefined;
  if (!start || Number.isNaN(start.getTime())) return [];
  const first = nextAt(anime, new Date(start.getTime() - 1));
  if (!first) return [];
  const history = Array.isArray(item.episodeHistory) ? item.episodeHistory : undefined;
  const progress = Number(item.progress) || 0;
  const max = Number(anime.episodes) || Infinity;
  const results: Array<{ id: string; animeId: number; title: string; imageUrl: string; releasedAt: string; episode: number }> = [];
  let cursor = since;
  for (let count = 0; count < 100; count += 1) {
    const release = nextAt(anime, cursor);
    if (!release || release > now) break;
    const episode = Math.round((release.getTime() - first.getTime()) / 604800000) + 1;
    cursor = new Date(release.getTime() + 1);
    if (episode > max) break;
    const watched = history ? history.some((entry) => typeof entry === "object" && entry !== null && (entry as { episode?: unknown }).episode === episode) : progress >= episode;
    if (watched || (preference === "finale_only" && episode !== max)) continue;
    results.push({ id: `${anime.id}:episode:${episode}`, animeId: Number(anime.id), title: titleOf(anime), imageUrl: String(anime.imageUrl ?? ""), releasedAt: release.toISOString(), episode });
  }
  return results.filter((entry) => Number.isInteger(entry.animeId) && entry.animeId > 0);
}

async function vapid(client: ReturnType<typeof createClient>) {
  const existing = await client.from("push_vapid_keys").select("public_key,private_key").eq("id", true).maybeSingle();
  if (existing.data) return { publicKey: existing.data.public_key, privateKey: existing.data.private_key };
  const generated = webpush.generateVAPIDKeys();
  await client.from("push_vapid_keys").insert({ id: true, public_key: generated.publicKey, private_key: generated.privateKey });
  const saved = await client.from("push_vapid_keys").select("public_key,private_key").eq("id", true).single();
  if (saved.error) throw saved.error;
  return { publicKey: saved.data.public_key, privateKey: saved.data.private_key };
}

Deno.serve(async (request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !url) return json({ error: "Server configuration is unavailable." }, 503);
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  try {
    const keys = await vapid(client);
    if (new URL(request.url).searchParams.get("mode") === "public" && request.method === "GET") return json({ publicKey: keys.publicKey });
    const settings = await client.from("push_delivery_settings").select("job_secret").eq("id", true).single();
    if (settings.error || request.headers.get("x-banime-push-job") !== settings.data.job_secret) return json({ error: "Not authorized." }, 401);
    webpush.setVapidDetails("mailto:security@banime.app", keys.publicKey, keys.privateKey);
    const now = new Date();
    const [tracked, cursors] = await Promise.all([
      client.from("tracked_anime").select("user_id,item,tracking_status").in("tracking_status", ["watching", "plan_to_watch"]).limit(5000),
      client.from("release_notification_cursors").select("user_id,last_checked_at")
    ]);
    if (tracked.error || cursors.error) throw tracked.error ?? cursors.error;
    const cursorByUser = new Map((cursors.data as Cursor[]).map((cursor) => [cursor.user_id, cursor.last_checked_at]));
    const created: Array<{ userId: string; id: string; title: string; episode: number; animeId: number }> = [];
    for (const row of (tracked.data as TrackedRow[])) {
      const last = cursorByUser.get(row.user_id); if (!last) continue;
      for (const episode of releasedEpisodes(row, new Date(last), now)) {
        const inserted = await client.from("release_notifications").upsert({ user_id: row.user_id, anime_id: episode.animeId, notification_id: episode.id, notification_type: "episode", title: episode.title, image_url: episode.imageUrl, released_at: episode.releasedAt, tracking_status: row.tracking_status, episode_number: episode.episode }, { onConflict: "user_id,notification_id", ignoreDuplicates: true }).select("notification_id");
        if (!inserted.error && inserted.data?.length) created.push({ userId: row.user_id, id: episode.id, title: episode.title, episode: episode.episode, animeId: episode.animeId });
      }
    }
    for (const userId of new Set((tracked.data as TrackedRow[]).map((row) => row.user_id))) await client.from("release_notification_cursors").upsert({ user_id: userId, last_checked_at: now.toISOString(), updated_at: now.toISOString() });
    for (const release of created) {
      const subscriptions = await client.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", release.userId);
      await Promise.all((subscriptions.data as Subscription[] ?? []).map(async (subscription) => {
        try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: release.title, body: `Episode ${release.episode} has aired.`, url: `/notifications`, tag: release.id })); }
        catch (error) { const status = (error as { statusCode?: number }).statusCode; if (status === 404 || status === 410) await client.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint); }
      }));
    }
    return json({ delivered: created.length });
  } catch (error) { console.error("release-push failed", error instanceof Error ? error.message : "unknown"); return json({ error: "Push delivery failed." }, 500); }
});
