import { describe, expect, it } from 'vitest';
import { createEntry, emptyState, logEpisode } from './model';
import type { Anime } from '../../domain/anime/types';
const anime: Anime = { id: 1, title: 'Test title', imageUrl: '', largeImageUrl: '', synopsis: '', episodes: 2, status: 'Finished Airing', type: 'TV', genres: [], studios: [], url: '' };
describe('prototype episode logging', () => {
    it('starts a planned title, records the watch date and completes at the episode total', () => {
        const initial = { ...emptyState, items: [createEntry(anime)] };
        const first = logEpisode(initial, anime.id);
        expect(first.items[0].status).toBe('watching');
        expect(first.items[0].progress).toBe(1);
        expect(first.sessions).toHaveLength(1);
        expect(first.items[0].episodeHistory?.[0].watchedAt).toBe(first.sessions[0].at);
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
