import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type TrackedRow = { user_id: string; item: Record<string, unknown>; tracking_status: string };
type Cursor = { user_id: string; last_checked_at: string; seen_season_ids?: unknown };
type Subscription = { endpoint: string; p256dh: string; auth: string };
type Delivery = { userId: string; id: string; title: string; body: string; animeId: number };

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const titleOf = (anime: Record<string, unknown>) => String(anime.titleEnglish || anime.title || "Anime");

async function loadTrackedRows(client: ReturnType<typeof createClient>) {
  const rows: TrackedRow[] = [];
  const pageSize = 1_000;
  for (let start = 0; start < 10_000; start += pageSize) {
    const page = await client
      .from("tracked_anime")
      .select("user_id,item,tracking_status")
      .range(start, start + pageSize - 1);
    if (page.error) throw page.error;
    const values = page.data as TrackedRow[];
    rows.push(...values);
    if (values.length < pageSize) break;
  }
  return rows;
}

async function tenrai(path: string) {
  const response = await fetch(`https://api.tenrai.org/v1${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) throw new Error(`Tenrai returned ${response.status}`);
  return await response.json() as { data?: unknown };
}

function seenSeasonIds(value: unknown) {
  return new Set(Array.isArray(value)
    ? value.filter((id): id is number => Number.isInteger(id) && id > 0 && id <= 10_000_000)
    : []);
}

function isUpcomingSeason(anime: Record<string, unknown>, now: Date) {
  if (/not yet aired|upcoming/i.test(String(anime.status ?? ""))) return true;
  const start = typeof (anime.aired as Record<string, unknown> | undefined)?.from === "string"
    ? (anime.aired as Record<string, unknown>).from as string : undefined;
  return Boolean(start && !Number.isNaN(Date.parse(start)) && Date.parse(start) > now.getTime());
}

async function createSeasonNotifications(
  client: ReturnType<typeof createClient>,
  rows: TrackedRow[],
  cursors: Map<string, Cursor>,
  now: Date
) {
  const deliveries: Delivery[] = [];
  const seenUpdates = new Map<string, number[]>();
  const period = Math.floor(now.getTime() / (15 * 60 * 1000));
  const byUser = new Map<string, TrackedRow[]>();
  for (const row of rows) {
    if (row.tracking_status === "dropped") continue;
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
  }

  for (const [userId, sources] of byUser) {
    const seen = seenSeasonIds(cursors.get(userId)?.seen_season_ids);
    const trackedIds = new Set(sources.map((row) => Number((row.item.anime as Record<string, unknown> | undefined)?.id)));
    const offset = (period * 3) % sources.length;
    const batch = [...sources.slice(offset), ...sources.slice(0, offset)].slice(0, 3);
    for (const source of batch) {
      const sourceAnime = source.item.anime as Record<string, unknown> | undefined;
      const sourceId = Number(sourceAnime?.id);
      if (!sourceAnime || !Number.isInteger(sourceId) || sourceId <= 0) continue;
      try {
        const relations = await tenrai(`/anime/${sourceId}/relations`);
        const sequelIds = Array.isArray(relations.data)
          ? relations.data.flatMap((relation) => {
            if (!relation || typeof relation !== "object" || String((relation as Record<string, unknown>).relation).toLowerCase() !== "sequel") return [];
            const entries = (relation as Record<string, unknown>).entry;
            return Array.isArray(entries) ? entries : [];
          }).filter((entry) => entry && typeof entry === "object" && String((entry as Record<string, unknown>).type).toLowerCase() === "anime")
            .map((entry) => Number((entry as Record<string, unknown>).mal_id))
            .filter((id) => Number.isInteger(id) && id > 0 && id <= 10_000_000)
          : [];
        for (const sequelId of sequelIds) {
          if (seen.has(sequelId) || trackedIds.has(sequelId)) { seen.add(sequelId); continue; }
          const response = await tenrai(`/anime/${sequelId}/full`);
          const sequel = response.data as Record<string, unknown> | undefined;
          if (!sequel || !isUpcomingSeason(sequel, now)) continue;
          if (!["TV", "ONA"].includes(String(sequel.type ?? ""))) { seen.add(sequelId); continue; }
          seen.add(sequelId);
          const aired = sequel.aired as Record<string, unknown> | undefined;
          const premiere = typeof aired?.from === "string" && !Number.isNaN(Date.parse(aired.from)) ? aired.from : null;
          const title = String(sequel.title_english || sequel.title || "New season");
          const imageUrl = String((((sequel.images as Record<string, unknown> | undefined)?.jpg as Record<string, unknown> | undefined)?.image_url) ?? "");
          const notificationId = `season:${sourceId}:${sequelId}`;
          const inserted = await client.from("release_notifications").upsert({ user_id: userId, anime_id: sequelId, notification_id: notificationId, notification_type: "season", title, image_url: imageUrl, released_at: now.toISOString(), tracking_status: source.tracking_status, source_anime_id: sourceId, source_title: titleOf(sourceAnime), premiere_at: premiere }, { onConflict: "user_id,notification_id", ignoreDuplicates: true }).select("notification_id");
          if (inserted.error) throw inserted.error;
          if (inserted.data?.length) deliveries.push({ userId, id: notificationId, title, body: `A new season related to ${titleOf(sourceAnime)} is coming.`, animeId: sequelId });
        }
      } catch (error) {
        console.error("season notification scan failed", { userId, sourceId, message: error instanceof Error ? error.message : "unknown" });
      }
    }
    seenUpdates.set(userId, [...seen].slice(-500));
  }
  return { deliveries, seenUpdates };
}

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
  // Without an authoritative schedule, do not claim an episode number or
  // finale. A generic release notice is more honest and still useful.
  if (preference === "finale_only") return [];
  if (preference === "dubbed_only" && !/\b(?:english\s+)?dub(?:bed)?\b/i.test(String((anime.broadcast as Record<string, unknown> | undefined)?.label ?? ""))) return [];
  const results: Array<{ id: string; animeId: number; title: string; imageUrl: string; releasedAt: string; episode?: number }> = [];
  let cursor = since;
  for (let count = 0; count < 100; count += 1) {
    const release = nextAt(anime, cursor);
    if (!release || release > now) break;
    cursor = new Date(release.getTime() + 1);
    results.push({ id: `${anime.id}:release:${release.toISOString()}`, animeId: Number(anime.id), title: titleOf(anime), imageUrl: String(anime.imageUrl ?? ""), releasedAt: release.toISOString() });
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
    const [trackedRows, cursors] = await Promise.all([
      loadTrackedRows(client),
      client.from("release_notification_cursors").select("user_id,last_checked_at,seen_season_ids")
    ]);
    if (cursors.error) throw cursors.error;
    const cursorByUser = new Map((cursors.data as Cursor[]).map((cursor) => [cursor.user_id, cursor]));
    const created: Delivery[] = [];
    const failedUsers = new Set<string>();
    let checkedRows = 0;
    let scheduledRows = 0;
    const activeRows = trackedRows.filter((row) => row.tracking_status === "watching" || row.tracking_status === "plan_to_watch");
    for (const row of trackedRows) {
      const cursor = cursorByUser.get(row.user_id); if (!cursor) continue;
      const last = cursor.last_checked_at;
      checkedRows += 1;
      const episodes = releasedEpisodes(row, new Date(last), now);
      if (episodes.length) scheduledRows += 1;
      for (const episode of episodes) {
        const inserted = await client.from("release_notifications").upsert({ user_id: row.user_id, anime_id: episode.animeId, notification_id: episode.id, notification_type: "episode", title: episode.title, image_url: episode.imageUrl, released_at: episode.releasedAt, tracking_status: row.tracking_status, episode_number: episode.episode ?? null }, { onConflict: "user_id,notification_id", ignoreDuplicates: true }).select("notification_id");
        if (inserted.error) {
          failedUsers.add(row.user_id);
          console.error("release notification upsert failed", { userId: row.user_id, code: inserted.error.code });
        } else if (inserted.data?.length) created.push({ userId: row.user_id, id: episode.id, title: episode.title, body: episode.episode ? `Episode ${episode.episode} has aired.` : "A new episode has aired.", animeId: episode.animeId });
      }
    }
    const seasons = await createSeasonNotifications(client, trackedRows, cursorByUser, now);
    created.push(...seasons.deliveries);
    for (const userId of new Set(trackedRows.map((row) => row.user_id))) {
      if (failedUsers.has(userId)) continue;
      const saved = await client.from("release_notification_cursors").upsert({ user_id: userId, last_checked_at: now.toISOString(), seen_season_ids: seasons.seenUpdates.get(userId) ?? cursorByUser.get(userId)?.seen_season_ids ?? [], updated_at: now.toISOString() });
      if (saved.error) {
        failedUsers.add(userId);
        console.error("release cursor update failed", { userId, code: saved.error.code });
      }
    }
    for (const release of created) {
      const subscriptions = await client.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", release.userId);
      await Promise.all((subscriptions.data as Subscription[] ?? []).map(async (subscription) => {
        try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: release.title, body: release.body, url: `/notifications`, tag: release.id })); }
        catch (error) { const status = (error as { statusCode?: number }).statusCode; if (status === 404 || status === 410) await client.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint); }
      }));
    }
    return json({ delivered: created.length, checkedRows, scheduledRows, seasonAlerts: seasons.deliveries.length, failedUsers: failedUsers.size });
  } catch (error) { console.error("release-push failed", error instanceof Error ? error.message : "unknown"); return json({ error: "Push delivery failed." }, 500); }
});
