import type { ServerResponse } from "node:http";
import { parseLibraryImport } from "../../src/domain/tracker/import.js";
import type { TrackedAnime } from "../../src/domain/tracker/types.js";
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
import { authenticateRequest } from "../_lib/supabase.js";

function toCloudRow(userId: string, item: TrackedAnime) {
  return {
    user_id: userId,
    anime_id: item.anime.id,
    item,
    tracking_status: item.status,
    anime_title: item.anime.titleEnglish || item.anime.title,
    anime_type: item.anime.type,
    user_score: item.userScore ?? null,
    progress: item.progress,
    added_at: item.addedAt,
    updated_at: item.updatedAt
  };
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse
) {
  try {
    requireMethod(request, ["GET", "PUT"]);
    if (request.method === "PUT") requireSameOrigin(request);
    const auth = await authenticateRequest(request, response);

    if (request.method === "GET") {
      const { data, error } = await auth.client
        .from("tracked_anime")
        .select("item")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false });
      if (error) throw new ApiError(502, "Cloud library could not be loaded.");
      sendJson(response, 200, {
        items: (data ?? []).map((row) => row.item)
      });
      return;
    }

    requireExpectedUser(request, auth.user.id);
    await enforceAuthRateLimit(request, "library-write", {
      limit: 60,
      ipLimit: 180,
      windowSeconds: 60,
      subject: auth.user.id
    });
    const body = await readJson(request, 512 * 1024);
    const source = Array.isArray(body)
      ? body
      : typeof body === "object" && body !== null && "items" in body
        ? (body as { items?: unknown }).items
        : undefined;
    if (Array.isArray(source) && source.length > 100) {
      throw new ApiError(413, "Cloud sync batches cannot exceed 100 items.");
    }
    const items = parseLibraryImport(body);
    const { error } = await auth.client
      .from("tracked_anime")
      .upsert(
        items.map((item) => toCloudRow(auth.user.id, item)),
        { onConflict: "user_id,anime_id" }
      );
    if (error) throw new ApiError(502, "Cloud library could not be saved.");
    sendJson(response, 200, { saved: items.length });
  } catch (error) {
    sendError(response, error);
  }
}
