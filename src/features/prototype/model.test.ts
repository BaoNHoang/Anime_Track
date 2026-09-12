import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEntry, emptyState, logEpisode, loadPrototype } from './model';
import type { Anime } from '../../domain/anime/types';
const anime: Anime = { id: 1, title: 'Test title', imageUrl: '', largeImageUrl: '', synopsis: '', episodes: 2, status: 'Finished Airing', type: 'TV', genres: [], studios: [], url: '' };
describe('prototype episode logging', () => {
    it('starts a planned title, records the watch date and completes at the episode total', () => {
        const initial = { ...emptyState, items: [createEntry(anime)] };
        const first = logEpisode(initial, anime.id);
        expect(first.items[0].status).toBe('watching');
        expect(first.items[0].progress).toBe(1);
        expect(first.sessions).toHaveLength(1);
        expect(Number.isFinite(Date.parse(first.sessions[0].at))).toBe(true);
        expect(initial.items[0].progress).toBe(0);
        const completed = logEpisode(first, anime.id);
        expect(completed.items[0].status).toBe('completed');
        expect(completed.items[0].progress).toBe(2);
        expect(logEpisode(completed, anime.id)).toBe(completed);
    });
    it('does not mutate unrelated titles or log removed titles', () => {
        const initial = { ...emptyState, items: [createEntry(anime)] };
        expect(logEpisode(initial, 999)).toBe(initial);
    });
});

describe('prototype persistence', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('keeps sample progress and later episode logs across reloads', () => {
        const item = { ...createEntry({ ...anime, episodes: 12 }), progress: 3 };
        const saved = logEpisode({ ...emptyState, items: [item] }, anime.id);
        vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(saved), setItem: vi.fn() });
        const loaded = loadPrototype();
        expect(loaded.items[0].progress).toBe(4);
        expect(loaded.sessions[0].episode).toBe(4);
    });
    it('preserves empty-library preferences', () => {
        vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ ...emptyState, goal: 14, theme: 'dark' }), setItem: vi.fn() });
        expect(loadPrototype()).toMatchObject({ items: [], goal: 14, theme: 'dark' });
    });
});
