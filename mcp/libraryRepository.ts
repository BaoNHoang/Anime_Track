import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TrackedAnime,
  TrackingStatus
} from "../src/domain/tracker/types";
import type { Anime } from "../src/domain/anime/types";

interface LibraryQuery {
  status?: TrackingStatus;
  search?: string;
  limit: number;
}

export interface LibraryUpdates {
  status?: TrackingStatus;
  progress?: number;
  userScore?: number | null;
  notes?: string;
}

export function applyLibraryUpdates(
  existing: TrackedAnime,
  updates: LibraryUpdates,
  updatedAt = new Date().toISOString()
): TrackedAnime {
  const requestedProgress = updates.progress ?? existing.progress;
  const progress = Math.max(
    0,
    Math.min(
      requestedProgress,
      existing.anime.episodes ?? Number.MAX_SAFE_INTEGER
    )
  );

  return {
    ...existing,
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    ...(updates.userScore !== undefined
      ? { userScore: updates.userScore ?? undefined }
      : {}),
    progress,
    updatedAt
  };
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

export class McpLibraryRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string
  ) {}

  async getAll(query: LibraryQuery): Promise<TrackedAnime[]> {
    let request = this.client
      .from("tracked_anime")
      .select("item")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false })
      .limit(query.limit);

    if (query.status) {
      request = request.eq("tracking_status", query.status);
    }
    if (query.search?.trim()) {
      request = request.ilike("anime_title", `%${query.search.trim()}%`);
    }

    const { data, error } = await request;
    if (error) throw error;
    return (data ?? []).map((row) => row.item as TrackedAnime);
  }

  async getByAnimeId(animeId: number): Promise<TrackedAnime | undefined> {
    const { data, error } = await this.client
      .from("tracked_anime")
      .select("item")
      .eq("user_id", this.userId)
      .eq("anime_id", animeId)
      .maybeSingle();

    if (error) throw error;
    return data?.item as TrackedAnime | undefined;
  }

  async add(
    anime: Anime,
    status: TrackingStatus
  ): Promise<{ item: TrackedAnime; created: boolean }> {
    const existing = await this.getByAnimeId(anime.id);
    if (existing) return { item: existing, created: false };

    const now = new Date().toISOString();
    const item: TrackedAnime = {
      anime,
      status,
      progress: 0,
      notes: "",
      addedAt: now,
      updatedAt: now
    };
    const { error } = await this.client
      .from("tracked_anime")
      .insert(toCloudRow(this.userId, item));

    if (error) throw error;
    return { item, created: true };
  }

  async update(
    animeId: number,
    updates: LibraryUpdates
  ): Promise<TrackedAnime | undefined> {
    const existing = await this.getByAnimeId(animeId);
    if (!existing) return undefined;

    const item = applyLibraryUpdates(existing, updates);
    const { error } = await this.client
      .from("tracked_anime")
      .upsert(toCloudRow(this.userId, item), {
        onConflict: "user_id,anime_id"
      });

    if (error) throw error;
    return item;
  }

  async remove(animeId: number): Promise<boolean> {
    const existing = await this.getByAnimeId(animeId);
    if (!existing) return false;

    const { error } = await this.client
      .from("tracked_anime")
      .delete()
      .eq("user_id", this.userId)
      .eq("anime_id", animeId);

    if (error) throw error;
    return true;
  }
}
