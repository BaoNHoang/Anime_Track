import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { getCurrentSeason, getTopAnime, searchAnime } from '../../services/tenrai/animeService';
import { getNextAiringAt } from '../../domain/anime/airing';
import type { Anime } from '../../domain/anime/types';
import { STATUS_LABELS, TRACKING_STATUSES, type TrackedAnime } from '../../domain/tracker/types';
import { Compass, LibraryBig, LayoutDashboard, Play, Plus, Search, Moon, Sun, Download, Check, X, ChevronRight, Heart, RefreshCw } from '../../components/OwnedIcons';
import { createEntry, loadPrototype, logEpisode, PROTOTYPE_KEY, title, type PrototypeState } from './model';
import './prototype.css';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15 * 60 * 1000 } } });
const tabs = ['Today', 'Discover', 'My library', 'Watch planner', 'Insights'] as const;
type Tab = typeof tabs[number];
const icons = [LayoutDashboard, Compass, LibraryBig, Play, Heart];
function Cover({ anime, onClick }: {
    anime: Anime;
    onClick: () => void;
}) {
    return <button className="nx-cover" onClick={onClick} aria-label={`Open ${title(anime)}`}>
    {anime.imageUrl ? <img src={anime.largeImageUrl || anime.imageUrl} alt="" loading="lazy"/> : <span>{title(anime)}</span>}
    {anime.score && <span className="nx-score">{anime.score.toFixed(1)}</span>}
  </button>;
}
function Workspace() {
    const [state, setState] = useState(loadPrototype);
    const [now, setNow] = useState(() => Date.now());
    const [tab, setTab] = useState<Tab>('Today');
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [genre, setGenre] = useState('All genres');
    const [source, setSource] = useState<'season' | 'popular' | 'upcoming'>('season');
    const [status, setStatus] = useState('all');
    const [sort, setSort] = useState('recent');
    const [view, setView] = useState<'grid' | 'table'>('grid');
    const [selected, setSelected] = useState<Anime>();
    const [message, setMessage] = useState('');
    const [undo, setUndo] = useState<PrototypeState>();
    const [undoAfter, setUndoAfter] = useState<PrototypeState>();
    const [storageError, setStorageError] = useState(false);
    const [pick, setPick] = useState<Anime>();
    const dialog = useRef<HTMLDialogElement>(null);
    const season = useQuery({ queryKey: ['prototype', 'season'], queryFn: ({ signal }) => getCurrentSeason(signal) });
    const catalog = useQuery({ queryKey: ['prototype', source, debounced], queryFn: ({ signal }) => debounced.trim() ? searchAnime(debounced, 1, signal) : source === 'season' ? getCurrentSeason(signal) : getTopAnime(source === 'popular' ? 'bypopularity' : 'upcoming', 1, signal) });
    useEffect(() => { const timer = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(timer); }, [search]);
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
    useEffect(() => { try {
        localStorage.setItem(PROTOTYPE_KEY, JSON.stringify(state));
    }
    catch {
        queueMicrotask(() => setStorageError(true));
    } }, [state]);
    useEffect(() => { if (selected)
        dialog.current?.showModal();
    else
        dialog.current?.close(); }, [selected]);
    const watched = state.items.filter((item) => item.status === 'watching');
    const planned = state.items.filter((item) => item.status === 'plan_to_watch');
    const episodes = state.items.reduce((sum, item) => sum + item.progress, 0);
    const weekCount = state.sessions.filter((event) => now - Date.parse(event.at) < 7 * 86400000).length;
    const catalogItems = catalog.data?.items ?? [];
    const genres = [...new Set(catalogItems.flatMap((anime) => anime.genres))].sort();
    const activeGenre = genres.includes(genre) ? genre : 'All genres';
    const found = catalogItems.filter((anime) => activeGenre === 'All genres' || anime.genres.includes(activeGenre));
    const library = state.items.filter((item) => (status === 'all' || item.status === status) && title(item.anime).toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === 'title' ? title(a.anime).localeCompare(title(b.anime)) : sort === 'score' ? (b.userScore ?? 0) - (a.userScore ?? 0) : b.updatedAt.localeCompare(a.updatedAt));
    const featured = season.data?.items.find((anime) => anime.bannerImageUrl) ?? season.data?.items[0];
    const current = selected && state.items.find((item) => item.anime.id === selected.id);
    function navigate(next: Tab) { setTab(next); setSearch(''); setGenre('All genres'); }
    function update(id: number, patch: Partial<TrackedAnime>) {
        setState((previous) => ({ ...previous, items: previous.items.map((item) => item.anime.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) }));
    }
    function add(anime: Anime) {
        setState((previous) => previous.items.some((item) => item.anime.id === anime.id) ? previous : { ...previous, items: [createEntry(anime), ...previous.items] });
        setMessage(`${title(anime)} added to your plan to watch.`);
    }
    function log(id: number) { const next = logEpisode(state, id); setUndo(state); setUndoAfter(next); setState(next); setMessage('Episode logged. Your progress is saved in this prototype.'); }
    function exportLibrary() {
        const blob = new Blob([JSON.stringify({ prototype: true, version: 1, ...state }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'banime-prototype-library.json';
        link.click();
        URL.revokeObjectURL(url);
    }
    function seedLibrary() {
        const samples = (season.data?.items ?? []).slice(0, 6).map((anime, index): TrackedAnime => ({ ...createEntry(anime), status: index < 3 ? 'watching' : 'plan_to_watch', progress: index < 3 ? Math.min(index + 1, anime.episodes ?? 3) : 0 }));
        setState((previous) => ({ ...previous, items: [...previous.items, ...samples.filter((sample) => !previous.items.some((entry) => entry.anime.id === sample.anime.id))] }));
        setMessage('Sample progress added using real catalog titles. All data stays in this prototype.');
    }
    const cards = (items: Anime[]) => <div className="nx-grid">{items.map((anime) => {
            const tracked = state.items.find((item) => item.anime.id === anime.id);
            return <article className="nx-anime" key={anime.id}><Cover anime={anime} onClick={() => setSelected(anime)}/><button className="nx-title" onClick={() => setSelected(anime)}>{title(anime)}</button><p>{anime.type} · {anime.episodes ? `${anime.episodes} episodes` : 'Episodes TBA'}</p><button className={tracked ? 'nx-added' : 'nx-add'} onClick={() => tracked ? setSelected(anime) : add(anime)}>{tracked ? <Check size={14}/> : <Plus size={14}/>}{tracked ? STATUS_LABELS[tracked.status] : 'Add to list'}</button></article>;
        })}</div>;
    return <div className={`nx-app nx-${state.theme}`}>
    <a className="nx-skip" href="#nx-main">Skip to content</a>
    <aside className="nx-sidebar"><a className="nx-brand" href="/">banime<span>next</span></a><p className="nx-sidebar-note">Your anime, in one place.</p><nav aria-label="Prototype navigation">{tabs.map((name, index) => { const Icon = icons[index]; return <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => navigate(name)}><Icon size={19}/>{name}{name === 'My library' && <span>{state.items.length}</span>}</button>; })}</nav><div className="nx-sidebar-bottom"><p>Prototype workspace</p><small>Changes are saved only in this browser. Your account library is separate.</small><a href="/?classic=1">Open original app <ChevronRight size={14}/></a></div></aside>
    <div className="nx-workspace"><header className="nx-header"><label className="nx-search"><Search size={19}/><input value={search} onChange={(event) => { setSearch(event.target.value); if (tab !== 'My library')
        setTab('Discover'); }} placeholder={tab === 'My library' ? 'Search your library' : 'Find your next anime'} aria-label="Search anime"/></label><button className="nx-icon" aria-label={`Switch to ${state.theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setState((previous) => ({ ...previous, theme: previous.theme === 'light' ? 'dark' : 'light' }))}>{state.theme === 'light' ? <Moon size={19}/> : <Sun size={19}/>}</button><span className="nx-avatar">You</span></header>
    <main id="nx-main" className="nx-main"><div className="nx-page-heading"><div><h1>{tab === 'Today' ? 'Make time for a good story.' : tab}</h1><p>{tab === 'Today' ? 'Pick up where you left off. Find something worth starting.' : tab === 'Discover' ? 'Explore the season, familiar favorites, and what comes next.' : tab === 'My library' ? 'A little less organizing. A little more watching.' : tab === 'Watch planner' ? 'A weekly view of the stories you’re following.' : 'See what your watching habits say about you.'}</p></div><span className="nx-date">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span></div>
      {storageError && <p role="alert" className="nx-notice">Browser storage is unavailable. Changes will be lost on reload; export your library before leaving.</p>}
      {message && <div className="nx-notice" role="status"><span>{message}</span>{undo && state === undoAfter && <button onClick={() => { setState(undo); setUndo(undefined); setMessage('Last change undone.'); }}>Undo</button>}<button aria-label="Dismiss message" onClick={() => { setMessage(''); setUndo(undefined); }}><X size={16}/></button></div>}
      {tab === 'Today' && <>
        <div className="nx-home-top"><section className="nx-feature">{featured && <img src={featured.bannerImageUrl || featured.largeImageUrl} alt=""/>}<div className="nx-feature-shade"/><div className="nx-feature-copy"><span>In the current season</span><h2>{featured ? title(featured) : 'Your next favorite is out there.'}</h2><p>{featured ? featured.genres.slice(0, 3).join(' · ') : 'Browse the catalog and build a watchlist that feels like you.'}</p><button className="nx-primary" onClick={() => featured ? setSelected(featured) : navigate('Discover')}>Explore this story <ChevronRight size={17}/></button></div></section><section className="nx-week"><h2>This week, at your pace.</h2><p><strong>{weekCount}</strong> of {state.goal} episodes logged</p><progress value={Math.min(weekCount, state.goal)} max={state.goal} aria-label="Weekly watch goal"/><label>Weekly goal<select value={state.goal} onChange={(event) => setState((previous) => ({ ...previous, goal: Number(event.target.value) }))}>{[3, 5, 7, 10, 14, 21].map((value) => <option key={value} value={value}>{value} episodes</option>)}</select></label><small>A gentle target, not a deadline. Last 7 days.</small></section></div>
        <div className="nx-section-heading"><h2>Continue watching</h2><button onClick={() => navigate('My library')}>Your library <ChevronRight size={16}/></button></div>
        {watched.length ? <div className="nx-continue">{watched.slice(0, 4).map((item) => <article key={item.anime.id}><Cover anime={item.anime} onClick={() => setSelected(item.anime)}/><div><button className="nx-title" onClick={() => setSelected(item.anime)}>{title(item.anime)}</button><p>{item.progress} / {item.anime.episodes ?? '?'} episodes</p><progress value={item.progress} max={item.anime.episodes ?? Math.max(12, item.progress)} aria-label={`${title(item.anime)} progress`}/><button className="nx-primary" disabled={Boolean(item.anime.episodes && item.progress >= item.anime.episodes)} onClick={() => log(item.anime.id)}><Plus size={15}/> Log episode {item.progress + 1}</button></div></article>)}</div> : <div className="nx-empty"><h3>Your next episode starts here.</h3><p>Add a title and set it to Watching, or try a sample library to explore the prototype.</p><button className="nx-primary" onClick={() => navigate('Discover')}>Find an anime</button><button disabled={!season.data} onClick={seedLibrary}>Try sample library</button></div>}
        <div className="nx-section-heading"><h2>Worth a place on your list</h2><button onClick={() => navigate('Discover')}>Explore season <ChevronRight size={16}/></button></div>{season.isPending ? <p role="status">Loading this season’s anime…</p> : season.isError ? <div className="nx-empty"><p>The catalog could not be reached.</p><button onClick={() => void season.refetch()}>Retry catalog</button></div> : cards((season.data?.items ?? []).slice(0, 6))}
      </>}
      {tab === 'Discover' && <><div className="nx-toolbar"><div className="nx-segments">{(['season', 'popular', 'upcoming'] as const).map((value) => <button key={value} aria-pressed={source === value} onClick={() => { setSource(value); setSearch(''); }}>{value === 'season' ? 'This season' : value === 'popular' ? 'All-time favorites' : 'Coming soon'}</button>)}</div><select value={activeGenre} onChange={(event) => setGenre(event.target.value)} aria-label="Filter by genre"><option>All genres</option>{genres.map((value) => <option key={value}>{value}</option>)}</select><button onClick={() => void catalog.refetch()}><RefreshCw size={15}/> Refresh</button></div>{catalog.isPending ? <p role="status">Finding stories for you…</p> : catalog.isError ? <div className="nx-empty"><h2>We couldn’t reach the catalog.</h2><p>Your prototype library is still available.</p><button onClick={() => void catalog.refetch()}>Try again</button></div> : <><p className="nx-result-count">{found.length} titles {debounced && `matching “${debounced}”`}{catalog.isFetching ? ' · Updating…' : ''}</p>{found.length ? cards(found) : <div className="nx-empty">No titles match these filters. Try another search or genre.</div>}</>}</>}
      {tab === 'My library' && <><div className="nx-toolbar"><select aria-label="Tracking status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses ({state.items.length})</option>{TRACKING_STATUSES.map((value) => <option value={value} key={value}>{STATUS_LABELS[value]} ({state.items.filter((item) => item.status === value).length})</option>)}</select><select aria-label="Sort library" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="score">My score</option></select><div className="nx-segments">{(['grid', 'table'] as const).map((value) => <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>{value === 'grid' ? 'Covers' : 'Table'}</button>)}</div><button onClick={exportLibrary}><Download size={15}/> Export</button></div>{!library.length ? <div className="nx-empty"><h2>A library waiting for its first story.</h2><p>Discover something new or clear your filters.</p><button onClick={() => navigate('Discover')}>Explore anime</button><button onClick={seedLibrary} disabled={!season.data}>Try sample library</button></div> : view === 'grid' ? cards(library.map((item) => item.anime)) : <div className="nx-table-wrap"><table><thead><tr><th>Anime</th><th>Status</th><th>Progress</th><th>My score</th><th>Quick log</th></tr></thead><tbody>{library.map((item) => <tr key={item.anime.id}><td><button className="nx-table-title" onClick={() => setSelected(item.anime)}><img src={item.anime.imageUrl} alt=""/>{title(item.anime)}</button></td><td><select aria-label={`Status for ${title(item.anime)}`} value={item.status} onChange={(event) => update(item.anime.id, { status: event.target.value as TrackedAnime['status'] })}>{TRACKING_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></td><td>{item.progress} / {item.anime.episodes ?? '?'}</td><td>{item.userScore ?? '—'}</td><td><button aria-label={`Log next episode of ${title(item.anime)}`} disabled={Boolean(item.anime.episodes && item.progress >= item.anime.episodes)} onClick={() => log(item.anime.id)}><Plus size={17}/></button></td></tr>)}</tbody></table></div>}</>}
      {tab === 'Watch planner' && <><div className="nx-planner-intro"><p>Broadcast estimates use the catalog’s weekly schedule, shown in your timezone. Streaming availability may differ.</p><button onClick={() => { const choices = planned.length ? planned : watched; setPick(choices.length ? choices[Math.floor(Math.random() * choices.length)].anime : undefined); setMessage(choices.length ? 'A pick from your watchlist is ready below.' : 'Add titles to your watchlist to get a pick.'); }}>Pick something for tonight</button></div>{pick && <div className="nx-tonight"><h2>Tonight’s pick: {title(pick)}</h2><button className="nx-primary" onClick={() => setSelected(pick)}>View your pick</button></div>}<div className="nx-planner">{Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index); const day = date.toDateString(); const entries = [...watched, ...planned].filter((item) => getNextAiringAt(item.anime)?.toDateString() === day); return <section key={day}><h2>{index === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}<span>{date.getDate()}</span></h2>{entries.map((item) => <button key={item.anime.id} onClick={() => setSelected(item.anime)}><img src={item.anime.imageUrl} alt=""/><strong>{title(item.anime)}</strong><small>{getNextAiringAt(item.anime)?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small></button>)}{!entries.length && <p>No scheduled titles</p>}</section>; })}</div><h2>On your someday list</h2>{planned.length ? cards(planned.map((item) => item.anime)) : <p>Save anime as Plan to watch to build your backlog.</p>}</>}
      {tab === 'Insights' && <><div className="nx-stats"><div><strong>{state.items.length}</strong><span>Titles in your library</span></div><div><strong>{episodes}</strong><span>Episodes watched</span></div><div><strong>{state.items.filter((item) => item.status === 'completed').length}</strong><span>Completed stories</span></div><div><strong>{weekCount}</strong><span>Episodes this week</span></div></div><div className="nx-insights"><section><h2>Your genre mix</h2><p>Genres across your saved titles.</p>{[...new Set(state.items.flatMap((item) => item.anime.genres))].map((name) => ({ name, count: state.items.filter((item) => item.anime.genres.includes(name)).length })).sort((a, b) => b.count - a.count).slice(0, 8).map(({ name, count }) => <div className="nx-bar" key={name}><span>{name}</span><progress value={count} max={Math.max(1, state.items.length)} aria-label={`${name}: ${count} titles`}/><strong>{count}</strong></div>)}{!state.items.length && <p>Add some anime to discover your genre mix.</p>}</section><section><h2>Your watch journal</h2><p>Episode logs from this prototype.</p>{state.sessions.slice(-12).reverse().map((event, index) => <div className="nx-journal" key={`${event.at}-${index}`}><Check size={16}/><div><strong>{state.items.find((item) => item.anime.id === event.animeId)?.anime.titleEnglish || state.items.find((item) => item.anime.id === event.animeId)?.anime.title || 'Removed title'}</strong><p>Episode {event.episode} · {new Date(event.at).toLocaleDateString()}</p></div></div>)}{!state.sessions.length && <p>Log your first episode to start your journal.</p>}</section></div></>}
      <footer className="nx-footer"><span>Banime Next · An independent prototype</span><span>Catalog: Tenrai / MyAnimeList · <a href="/?classic=1">Open original app</a></span></footer>
    </main></div>
    <dialog ref={dialog} aria-label={selected ? `Details for ${title(selected)}` : "Anime details"} className="nx-dialog" onCancel={() => setSelected(undefined)} onClick={(event) => { if (event.target === event.currentTarget)
        setSelected(undefined); }}><button className="nx-dialog-close" aria-label="Close anime details" onClick={() => setSelected(undefined)}><X size={21}/></button>{selected && <><div className="nx-detail-top"><img src={selected.largeImageUrl || selected.imageUrl} alt=""/><div><h2>{title(selected)}</h2><p>{selected.type} · {selected.year ?? 'Year TBA'} · {selected.episodes ?? '?'} episodes</p><p>{selected.genres.join(' · ')}</p><p>{selected.score ? `${selected.score.toFixed(1)} catalog score` : 'Not yet rated'}</p>{!current && <button className="nx-primary" onClick={() => add(selected)}><Plus size={17}/> Add to my library</button>}</div></div><p className="nx-synopsis">{selected.synopsis}</p>{current && <div className="nx-editor"><h3>Your tracking</h3><div className="nx-edit-row"><label>Status<select value={current.status} onChange={(event) => update(selected.id, { status: event.target.value as TrackedAnime['status'] })}>{TRACKING_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label><label>My score<select value={current.userScore ?? ''} onChange={(event) => update(selected.id, { userScore: event.target.value ? Number(event.target.value) : undefined })}><option value="">Unrated</option>{Array.from({ length: 10 }, (_, index) => <option key={index} value={index + 1}>{index + 1} / 10</option>)}</select></label></div><p>{current.progress} / {selected.episodes ?? '?'} episodes watched</p><button className="nx-primary" disabled={Boolean(selected.episodes && current.progress >= selected.episodes)} onClick={() => log(selected.id)}>Log episode {current.progress + 1}</button><label>Private notes<textarea value={current.notes} placeholder="What do you want to remember about this one?" onChange={(event) => update(selected.id, { notes: event.target.value })}/></label><button className="nx-remove" onClick={() => { setUndo(state); const next = { ...state, items: state.items.filter((item) => item.anime.id !== selected.id) }; setUndoAfter(next); setState(next); setSelected(undefined); setMessage('Title removed from prototype library.'); }}>Remove from prototype library</button></div>}</>}</dialog>
  </div>;
}
export default function PrototypeApp() { return <QueryClientProvider client={queryClient}><Workspace /></QueryClientProvider>; }
