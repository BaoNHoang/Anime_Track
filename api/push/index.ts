import type { ServerResponse } from "node:http";
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

type SubscriptionInput = { endpoint?: unknown; expirationTime?: unknown; keys?: unknown };

function subscriptionInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "A push subscription is required.");
  const input = value as SubscriptionInput;
  const keys = input.keys;
  if (typeof input.endpoint !== "string" || input.endpoint.length > 2048 || !/^https:\/\//.test(input.endpoint) || !keys || typeof keys !== "object" || Array.isArray(keys)) {
    throw new ApiError(400, "The push subscription is invalid.");
  }
  const candidate = keys as { p256dh?: unknown; auth?: unknown };
  if (typeof candidate.p256dh !== "string" || candidate.p256dh.length < 20 || candidate.p256dh.length > 256 || typeof candidate.auth !== "string" || candidate.auth.length < 8 || candidate.auth.length > 128) {
    throw new ApiError(400, "The push subscription keys are invalid.");
  }
  return { endpoint: input.endpoint, expirationTime: typeof input.expirationTime === "number" ? input.expirationTime : null, p256dh: candidate.p256dh, auth: candidate.auth };
}

async function publicKey() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!url) throw new ApiError(503, "Push notifications are not configured.");
  const response = await fetch(`${url}/functions/v1/release-push?mode=public`, { signal: AbortSignal.timeout(10_000) });
  const value = await response.json().catch(() => ({})) as { publicKey?: unknown };
  if (!response.ok || typeof value.publicKey !== "string" || value.publicKey.length < 20) throw new ApiError(503, "Push notifications are not configured.");
  return value.publicKey;
}

export default async function handler(request: ApiRequest, response: ServerResponse) {
  try {
    requireMethod(request, ["GET", "PUT", "DELETE"]);
    if (request.method === "GET") {
      sendJson(response, 200, { publicKey: await publicKey() });
      return;
    }
    requireSameOrigin(request);
    const auth = await authenticateRequest(request, response);
    requireExpectedUser(request, auth.user.id);
    await enforceAuthRateLimit(request, "push-subscription", { limit: 20, ipLimit: 60, windowSeconds: 60, subject: auth.user.id });
    const input = subscriptionInput(await readJson(request, 8 * 1024));
    if (request.method === "DELETE") {
      const { error } = await auth.client.from("push_subscriptions").delete().eq("user_id", auth.user.id).eq("endpoint", input.endpoint);
      if (error) throw new ApiError(502, "The device could not be removed.");
      sendJson(response, 200, { removed: true });
      return;
    }
    const { error } = await auth.client.from("push_subscriptions").upsert({
      user_id: auth.user.id, endpoint: input.endpoint, expiration_time: input.expirationTime, p256dh: input.p256dh, auth: input.auth, updated_at: new Date().toISOString()
    }, { onConflict: "endpoint" });
    if (error) throw new ApiError(502, "The device could not be saved.");
    sendJson(response, 200, { saved: true });
  } catch (error) {
    sendError(response, error);
  }
}
