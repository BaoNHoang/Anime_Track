import type { Anime } from '../../domain/anime/types';
import type { TrackedAnime } from '../../domain/tracker/types';
import { parseLibraryImport } from '../../domain/tracker/import';
export const PROTOTYPE_KEY = 'banime:prototype:next:v1';
export interface PrototypeState {
    items: TrackedAnime[];
    goal: number;
    theme: 'light' | 'dark';
    sessions: {
        animeId: number;
        episode: number;
        at: string;
    }[];
}
export const emptyState: PrototypeState = { items: [], goal: 7, theme: 'light', sessions: [] };
export function loadPrototype(): PrototypeState {
    try {
        const raw = localStorage.getItem(PROTOTYPE_KEY);
        if (!raw)
            return emptyState;
        try {
            const data = JSON.parse(raw);
            const items = Array.isArray(data.items) && data.items.length === 0 ? [] : parseLibraryImport({ items: data.items });
            const sessions = Array.isArray(data.sessions) ? data.sessions.filter((entry: unknown) => {
                if (!entry || typeof entry !== 'object')
                    return false;
                const event = entry as PrototypeState['sessions'][number];
                return Number.isInteger(event.animeId) && event.animeId > 0 && Number.isInteger(event.episode) && event.episode > 0 && typeof event.at === 'string' && Number.isFinite(Date.parse(event.at));
            }).slice(-10000) : [];
            return { items, sessions, theme: data.theme === 'dark' ? 'dark' : 'light', goal: [3, 5, 7, 10, 14, 21].includes(data.goal) ? data.goal : 7 };
        }
        catch {
            localStorage.setItem(`${PROTOTYPE_KEY}:recovery`, raw);
            return emptyState;
        }
    }
    catch {
        return emptyState;
    }
}
export function title(anime: Anime) { return anime.titleEnglish || anime.title; }
export function createEntry(anime: Anime): TrackedAnime {
    const now = new Date().toISOString();
    return { anime, status: 'plan_to_watch', progress: 0, notes: '', addedAt: now, updatedAt: now };
}
export function logEpisode(state: PrototypeState, id: number): PrototypeState {
    const item = state.items.find((entry) => entry.anime.id === id);
    if (!item || (item.anime.episodes && item.progress >= item.anime.episodes))
        return state;
    const progress = item.progress + 1;
    const at = new Date().toISOString();
    return { ...state, items: state.items.map((entry) => entry === item ? {
            ...entry, progress, status: progress === item.anime.episodes ? 'completed' : 'watching',
            episodeHistory: [...(entry.episodeHistory ?? []), { episode: progress, watchedAt: at }], updatedAt: at
        } : entry), sessions: [...state.sessions, { animeId: id, episode: progress, at }].slice(-10000) };
}
