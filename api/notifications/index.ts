import type { ServerResponse } from "node:http";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApiError,
  enforceAuthRateLimit,
  readJson,
  requireExpectedUser,
  requireMethod,
  requireSameOrigin,
  sendError,
  sendJson,
  type ApiRequest
} from "../_lib/http.js";
import {
  notificationId,
  notificationSync
} from "../_lib/notificationValidation.js";
import { authenticateRequest } from "../_lib/supabase.js";

async function loadState(client: SupabaseClient, userId: string) {
  const [notificationResult, cursorResult] = await Promise.all([
    client
      .from("release_notifications")
      .select(
        "notification_id,notification_type,anime_id,title,image_url,released_at,tracking_status,episode_number,source_anime_id,source_title,premiere_at"
      )
      .eq("user_id", userId)
      .order("released_at", { ascending: false })
      .limit(100),
    client
      .from("release_notification_cursors")
      .select("last_checked_at,seen_season_ids")
      .eq("user_id", userId)
      .maybeSingle()
  ]);
  if (notificationResult.error || cursorResult.error) {
    throw new ApiError(502, "Notifications could not be loaded.");
  }
  return {
    lastCheckedAt: cursorResult.data?.last_checked_at ?? undefined,
    notifications: (notificationResult.data ?? []).map((row) => ({
      id: row.notification_id,
      kind: row.notification_type,
      animeId: row.anime_id,
      title: row.title,
      imageUrl: row.image_url,
      releasedAt: row.released_at,
      trackingStatus: row.tracking_status,
      episodeNumber: row.episode_number ?? undefined,
      sourceAnimeId: row.source_anime_id ?? undefined,
      sourceTitle: row.source_title ?? undefined,
      premiereAt: row.premiere_at ?? undefined
    })),
    seenSeasonIds: cursorResult.data?.seen_season_ids ?? []
  };
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse
) {
  try {
    requireMethod(request, ["GET", "PUT", "DELETE"]);
    if (request.method !== "GET") requireSameOrigin(request);
    const auth = await authenticateRequest(request, response);

    if (request.method === "GET") {
      sendJson(response, 200, await loadState(auth.client, auth.user.id));
      return;
    }

    requireExpectedUser(request, auth.user.id);
    await enforceAuthRateLimit(request, "notification-write", {
      limit: 120,
      ipLimit: 360,
      windowSeconds: 60,
      subject: auth.user.id
    });

    if (request.method === "DELETE") {
      const url = new URL(request.url ?? "/api/notifications", "http://localhost");
      const requestedId = url.searchParams.get("id");
      let query = auth.client
        .from("release_notifications")
        .delete()
        .eq("user_id", auth.user.id);
      if (requestedId !== null) {
        query = query.eq("notification_id", notificationId(requestedId));
      }
      const { error } = await query;
      if (error) throw new ApiError(502, "Notifications could not be cleared.");
      sendJson(response, 200, await loadState(auth.client, auth.user.id));
      return;
    }

    const input = notificationSync(await readJson(request, 96 * 1024));
    if (input.notifications.length) {
      const { error } = await auth.client
        .from("release_notifications")
        .upsert(
          input.notifications.map((notification) => ({
            user_id: auth.user.id,
            anime_id: notification.animeId,
            notification_id: notification.id,
            notification_type: notification.kind,
            title: notification.title,
            image_url: notification.imageUrl,
            released_at: notification.releasedAt,
            tracking_status: notification.trackingStatus,
            episode_number: notification.episodeNumber ?? null,
            source_anime_id: notification.sourceAnimeId ?? null,
            source_title: notification.sourceTitle ?? null,
            premiere_at: notification.premiereAt ?? null,
            updated_at: new Date().toISOString()
          })),
          { onConflict: "user_id,notification_id" }
        );
      if (error) throw new ApiError(502, "Notifications could not be saved.");
    }
    if (input.removedNotificationIds.length) {
      const { error } = await auth.client
        .from("release_notifications")
        .delete()
        .eq("user_id", auth.user.id)
        .in("notification_id", input.removedNotificationIds);
      if (error) throw new ApiError(502, "Old notifications could not be removed.");
    }
    const { error: cursorError } = await auth.client
      .from("release_notification_cursors")
      .upsert(
        {
          user_id: auth.user.id,
          last_checked_at: input.lastCheckedAt,
          seen_season_ids: input.seenSeasonIds,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    if (cursorError) {
      throw new ApiError(502, "Notification check time could not be saved.");
    }
    sendJson(response, 200, await loadState(auth.client, auth.user.id));
  } catch (error) {
    sendError(response, error);
  }
}
