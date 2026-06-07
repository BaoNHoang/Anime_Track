import type { TrackedAnime } from "../../domain/tracker/types";
import { getSupabaseClient } from "./client";

async function getClient() {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }
  return client;
}

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

export const trackerCloudRepository = {
  async getAll(userId: string): Promise<TrackedAnime[]> {
    const client = await getClient();
    const { data, error } = await client
      .from("tracked_anime")
      .select("item")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => row.item as TrackedAnime);
  },

  async upsert(userId: string, item: TrackedAnime): Promise<void> {
    const client = await getClient();
    const { error } = await client
      .from("tracked_anime")
      .upsert(toCloudRow(userId, item), {
        onConflict: "user_id,anime_id"
      });

    if (error) throw error;
  },

  async upsertMany(userId: string, items: TrackedAnime[]): Promise<void> {
    if (!items.length) return;
    const client = await getClient();
    const { error } = await client
      .from("tracked_anime")
      .upsert(
        items.map((item) => toCloudRow(userId, item)),
        { onConflict: "user_id,anime_id" }
      );

    if (error) throw error;
  },

  async remove(userId: string, animeId: number): Promise<void> {
    const client = await getClient();
    const { error } = await client
      .from("tracked_anime")
      .delete()
      .eq("user_id", userId)
      .eq("anime_id", animeId);

    if (error) throw error;
  }
};
