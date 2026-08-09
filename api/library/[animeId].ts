import type { ServerResponse } from "node:http";
import {
  ApiError,
  enforceAuthRateLimit,
  requireExpectedUser,
  requireMethod,
  requireSameOrigin,
  routeParameter,
  sendError,
  sendJson,
  type ApiRequest
} from "../_lib/http.js";
import { authenticateRequest } from "../_lib/supabase.js";

export default async function handler(
  request: ApiRequest,
  response: ServerResponse
) {
  try {
    requireMethod(request, "DELETE");
    requireSameOrigin(request);
    const rawId = routeParameter(request, "animeId");
    const animeId = Number(rawId);
    if (
      !Number.isInteger(animeId) ||
      animeId < 1 ||
      animeId > 10_000_000
    ) {
      throw new ApiError(400, "Anime ID is invalid.");
    }
    const auth = await authenticateRequest(request, response);
    requireExpectedUser(request, auth.user.id);
    await enforceAuthRateLimit(request, "library-write", {
      limit: 60,
      ipLimit: 180,
      windowSeconds: 60,
      subject: auth.user.id
    });
    const { error } = await auth.client
      .from("tracked_anime")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("anime_id", animeId);
    if (error) throw new ApiError(502, "Cloud library could not be updated.");
    sendJson(response, 200, { removed: animeId });
  } catch (error) {
    sendError(response, error);
  }
}
