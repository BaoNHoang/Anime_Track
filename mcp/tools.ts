import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { dedupeAnimeById } from "../src/domain/anime/dedupe";
import type { Anime } from "../src/domain/anime/types";
import {
  TRACKING_STATUSES,
  type TrackedAnime
} from "../src/domain/tracker/types";
import {
  getAnimeById,
  getCurrentSeason,
  getTopAnime,
  searchAnime
} from "../src/services/jikan/animeService";
import { getNewsForAnime } from "../src/services/jikan/newsService";
import { authenticateToken, type AuthenticatedUser } from "./auth";
import type { McpConfig } from "./config";
import { McpLibraryRepository } from "./libraryRepository";
import { rankRecommendationCandidates } from "./recommendations";

const noAuthSecurity = [{ type: "noauth" }] as const;
const oauthSecurity = [
  { type: "oauth2", scopes: ["openid", "email"] }
] as const;

function compactAnime(anime: Anime, includeSynopsis = false) {
  return {
    anime_id: anime.id,
    title: anime.titleEnglish || anime.title,
    original_title: anime.title,
    type: anime.type,
    episodes: anime.episodes,
    airing_status: anime.status,
    score: anime.score,
    year: anime.year,
    season: anime.season,
    genres: anime.genres,
    studios: anime.studios,
    broadcast: anime.broadcast?.label,
    synopsis: includeSynopsis ? anime.synopsis : undefined,
    image_url: anime.largeImageUrl,
    myanimelist_url: anime.url,
    trailer_url: anime.trailerUrl
  };
}

function compactTrackedAnime(item: TrackedAnime) {
  return {
    ...compactAnime(item.anime),
    tracking_status: item.status,
    progress: item.progress,
    user_score: item.userScore,
    notes: item.notes,
    added_at: item.addedAt,
    updated_at: item.updatedAt
  };
}

function success(
  data: Record<string, unknown>,
  message?: string
): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: message ?? JSON.stringify(data, null, 2)
      }
    ],
    structuredContent: data
  };
}

function failure(error: unknown): CallToolResult {
  const message =
    error instanceof Error ? error.message : "The tool request failed.";
  return {
    isError: true,
    content: [{ type: "text", text: message }]
  };
}

function authRequired(config: McpConfig): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: "Connect and sign in to Banime before using this library tool."
      }
    ],
    _meta: {
      "mcp/www_authenticate": `Bearer resource_metadata="${config.protectedResourceMetadataUrl}", scope="openid email"`
    }
  };
}

export function createBanimeMcpServer(
  config: McpConfig,
  accessToken?: string
) {
  const server = new McpServer(
    { name: "banime", version: "0.1.0" },
    {
      instructions:
        "Use the Jikan tools to find anime IDs before changing the user's Banime library. Confirm the intended title and status before destructive updates or removal."
    }
  );
  let authPromise: Promise<AuthenticatedUser | undefined> | undefined;

  const getAuthenticatedUser = () => {
    if (!accessToken) return Promise.resolve(undefined);
    authPromise ??= authenticateToken(config, accessToken);
    return authPromise;
  };

  server.registerTool(
    "search_anime",
    {
      title: "Search anime",
      description:
        "Search Jikan/MyAnimeList for anime. Use this first to resolve a title to an anime_id before adding or updating a library entry.",
      inputSchema: z.object({
        query: z.string().trim().min(2).max(120),
        limit: z.number().int().min(1).max(20).default(10)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: { securitySchemes: noAuthSecurity }
    },
    async ({ query, limit }) => {
      try {
        const page = await searchAnime(query);
        const results = page.items.slice(0, limit).map((anime) =>
          compactAnime(anime)
        );
        return success(
          { query, count: results.length, results },
          `Found ${results.length} anime for "${query}".\n${JSON.stringify(
            results,
            null,
            2
          )}`
        );
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "get_anime_details",
    {
      title: "Get anime details",
      description:
        "Get current catalog details, synopsis, broadcast information, genres, studios, trailer, and MyAnimeList link for one anime_id.",
      inputSchema: z.object({
        anime_id: z.number().int().positive()
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: { securitySchemes: noAuthSecurity }
    },
    async ({ anime_id }) => {
      try {
        const anime = await getAnimeById(anime_id);
        return success({ anime: compactAnime(anime, true) });
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "get_anime_news",
    {
      title: "Get anime news",
      description:
        "Get recent MyAnimeList news articles for one anime_id. Resolve the title with search_anime first when needed.",
      inputSchema: z.object({
        anime_id: z.number().int().positive(),
        limit: z.number().int().min(1).max(20).default(10)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: { securitySchemes: noAuthSecurity }
    },
    async ({ anime_id, limit }) => {
      try {
        const anime = await getAnimeById(anime_id);
        const articles = await getNewsForAnime(
          anime.id,
          anime.titleEnglish || anime.title,
          anime.largeImageUrl
        );
        const news = articles.slice(0, limit).map((article) => ({
          title: article.title,
          published_at: article.publishedAt,
          author: article.author,
          excerpt: article.excerpt,
          comments: article.comments,
          url: article.url
        }));
        return success({
          anime: compactAnime(anime),
          count: news.length,
          news
        });
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "get_library",
    {
      title: "Get Banime library",
      description:
        "Read the signed-in user's Banime library. Filter by tracking status or title text when the user asks about their list.",
      inputSchema: z.object({
        status: z.enum(TRACKING_STATUSES).optional(),
        search: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(100).default(50)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: { securitySchemes: oauthSecurity }
    },
    async ({ status, search, limit }) => {
      try {
        const auth = await getAuthenticatedUser();
        if (!auth) return authRequired(config);
        const repository = new McpLibraryRepository(
          auth.client,
          auth.userId
        );
        const items = await repository.getAll({ status, search, limit });
        return success({
          count: items.length,
          items: items.map(compactTrackedAnime)
        });
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "add_to_library",
    {
      title: "Add anime to Banime",
      description:
        "Add one resolved anime_id to the signed-in user's Banime library. This does not overwrite an entry that is already tracked.",
      inputSchema: z.object({
        anime_id: z.number().int().positive(),
        status: z.enum(TRACKING_STATUSES).default("plan_to_watch")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: { securitySchemes: oauthSecurity }
    },
    async ({ anime_id, status }) => {
      try {
        const auth = await getAuthenticatedUser();
        if (!auth) return authRequired(config);
        const anime = await getAnimeById(anime_id);
        const repository = new McpLibraryRepository(
          auth.client,
          auth.userId
        );
        const result = await repository.add(anime, status);
        return success({
          created: result.created,
          item: compactTrackedAnime(result.item)
        });
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "update_library_item",
    {
      title: "Update Banime library item",
      description:
        "Update status, episode progress, personal score, or notes for an anime already in the signed-in user's library.",
      inputSchema: z
        .object({
          anime_id: z.number().int().positive(),
          status: z.enum(TRACKING_STATUSES).optional(),
          progress: z.number().int().min(0).optional(),
          user_score: z.number().min(0).max(10).nullable().optional(),
          notes: z.string().max(2000).optional()
        })
        .refine(
          ({ status, progress, user_score, notes }) =>
            status !== undefined ||
            progress !== undefined ||
            user_score !== undefined ||
            notes !== undefined,
          { message: "Provide at least one field to update." }
        ),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: { securitySchemes: oauthSecurity }
    },
    async ({ anime_id, status, progress, user_score, notes }) => {
      try {
        const auth = await getAuthenticatedUser();
        if (!auth) return authRequired(config);
        const repository = new McpLibraryRepository(
          auth.client,
          auth.userId
        );
        const item = await repository.update(anime_id, {
          status,
          progress,
          userScore: user_score,
          notes
        });
        if (!item) {
          return failure(
            new Error(
              "That anime is not in the library. Add it before updating it."
            )
          );
        }
        return success({ updated: true, item: compactTrackedAnime(item) });
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "remove_from_library",
    {
      title: "Remove anime from Banime",
      description:
        "Permanently remove one anime_id from the signed-in user's Banime library. Use only after the user clearly asks to remove it.",
      inputSchema: z.object({
        anime_id: z.number().int().positive()
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: { securitySchemes: oauthSecurity }
    },
    async ({ anime_id }) => {
      try {
        const auth = await getAuthenticatedUser();
        if (!auth) return authRequired(config);
        const repository = new McpLibraryRepository(
          auth.client,
          auth.userId
        );
        const removed = await repository.remove(anime_id);
        return success({ anime_id, removed });
      } catch (error) {
        return failure(error);
      }
    }
  );

  server.registerTool(
    "get_recommendation_candidates",
    {
      title: "Recommend anime from Banime",
      description:
        "Return ranked anime candidates based on the signed-in user's scores, completed/watching titles, preferred genres, and studios. Excludes anime already in the library.",
      inputSchema: z.object({
        genres: z.array(z.string().trim().min(1)).max(5).optional(),
        type: z.string().trim().max(40).optional(),
        min_score: z.number().min(0).max(10).optional(),
        year_from: z.number().int().min(1900).max(2100).optional(),
        limit: z.number().int().min(1).max(20).default(10)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: { securitySchemes: oauthSecurity }
    },
    async ({ genres, type, min_score, year_from, limit }) => {
      try {
        const auth = await getAuthenticatedUser();
        if (!auth) return authRequired(config);
        const repository = new McpLibraryRepository(
          auth.client,
          auth.userId
        );
        const [library, popular, current] = await Promise.all([
          repository.getAll({ limit: 100 }),
          getTopAnime("bypopularity"),
          getCurrentSeason()
        ]);
        const candidates = dedupeAnimeById([
          ...current.items,
          ...popular.items
        ]);
        const ranked = rankRecommendationCandidates(
          library,
          candidates,
          {
            genres,
            type,
            minScore: min_score,
            yearFrom: year_from
          },
          limit
        ).map((item) => ({
          ...compactAnime(item.anime, true),
          match_score: Number(item.matchScore.toFixed(2)),
          match_reasons: item.reasons
        }));

        return success({
          based_on_library_titles: library.length,
          count: ranked.length,
          recommendations: ranked
        });
      } catch (error) {
        return failure(error);
      }
    }
  );

  return server;
}
