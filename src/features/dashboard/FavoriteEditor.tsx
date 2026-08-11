import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  GripVertical,
  Plus,
  Search,
  X
} from "../../components/OwnedIcons";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { CompactListSkeleton } from "../../components/LoadingState";
import {
  FAVORITE_KINDS,
  MAX_FAVORITES_PER_KIND,
  type FavoriteEntry,
  type FavoriteKind,
  type ProfileFavorites
} from "../../domain/account/favorites";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useFavoriteSearch } from "../../hooks/useFavoriteSearch";
import { useLocalProfile } from "../../hooks/useLocalProfile";

const LABELS: Record<FavoriteKind, string> = {
  anime: "Anime",
  studios: "Studios",
  directors: "Directors",
  characters: "Characters"
};

function reorder(items: FavoriteEntry[], from: number, to: number) {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function FavoriteEditor() {
  const { configured, user, updateFavorites } = useCloudAuth();
  const { profile, updateProfile } = useLocalProfile();
  const initial = user?.favorites ?? profile.favorites;
  const [draft, setDraft] = useState<ProfileFavorites>(() => structuredClone(initial));
  const [kind, setKind] = useState<FavoriteKind>("anime");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<number>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const search = useFavoriteSearch(kind, debouncedQuery);
  const selected = draft[kind];
  const selectedIds = new Set(selected.map((item) => item.id));

  const updateKind = (items: FavoriteEntry[]) => {
    setDraft((current) => ({ ...current, [kind]: items }));
    setMessage(undefined);
  };

  const save = async () => {
    setSaving(true);
    setMessage(undefined);
    if (!configured) {
      updateProfile({ favorites: draft });
      setMessage({ tone: "success", text: "Favorites saved on this device." });
      setSaving(false);
      return;
    }
    const result = await updateFavorites(draft);
    setMessage(result.error
      ? { tone: "error", text: result.error }
      : { tone: "success", text: result.message ?? "Favorites saved." });
    setSaving(false);
  };

  return (
    <div className="favorites-editor page-stack">
      <header className="profile-editor-heading">
        <Link to="/profile" aria-label="Back to profile"><ChevronLeft size={18} /></Link>
        <div><h1>Edit favorites</h1><p>Search, add, and arrange up to 20 in each category.</p></div>
        <button className="button" type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving..." : "Save favorites"}
        </button>
      </header>

      <div className="favorite-kind-tabs" role="tablist" aria-label="Favorite category">
        {FAVORITE_KINDS.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={kind === item}
            className={kind === item ? "is-active" : ""}
            key={item}
            onClick={() => { setKind(item); setQuery(""); }}
          >
            {LABELS[item]} <span>{draft[item].length}</span>
          </button>
        ))}
      </div>

      <div className="favorite-editor-grid">
        <section className="favorite-search-panel">
          <div className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${LABELS[kind].toLowerCase()}`}
              aria-label={`Search favorite ${LABELS[kind].toLowerCase()}`}
              maxLength={200}
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>}
          </div>
          <div className="favorite-search-results" aria-live="polite">
            {search.isFetching && (
              <CompactListSkeleton
                items={4}
                variant="favorite"
                label={`Searching ${LABELS[kind].toLowerCase()}`}
              />
            )}
            {!search.isFetching && debouncedQuery.length >= 2 && !search.data?.length && <p>No matches found.</p>}
            {!search.isFetching && search.data?.map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={selectedIds.has(item.id) || selected.length >= MAX_FAVORITES_PER_KIND}
                onClick={() => updateKind([...selected, item])}
              >
                <span className="favorite-result-image">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.name.slice(0, 1)}
                </span>
                <span>{item.name}</span>
                <Plus size={16} />
              </button>
            ))}
          </div>
        </section>

        <section className="favorite-order-panel">
          <div className="favorite-order-heading">
            <h2>{LABELS[kind]}</h2><span>{selected.length} / {MAX_FAVORITES_PER_KIND}</span>
          </div>
          {selected.length === 0 ? (
            <p className="favorite-order-empty">Search and add your first favorite.</p>
          ) : (
            <ol>
              {selected.map((item, index) => (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => setDragging(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragging !== undefined) updateKind(reorder(selected, dragging, index));
                    setDragging(undefined);
                  }}
                >
                  <GripVertical size={17} />
                  <span className="favorite-result-image">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.name.slice(0, 1)}
                  </span>
                  <strong>{item.name}</strong>
                  <button type="button" onClick={() => updateKind(reorder(selected, index, index - 1))} disabled={index === 0} aria-label={`Move ${item.name} up`}><ArrowUp size={15} /></button>
                  <button type="button" onClick={() => updateKind(reorder(selected, index, index + 1))} disabled={index === selected.length - 1} aria-label={`Move ${item.name} down`}><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => updateKind(selected.filter((candidate) => candidate.id !== item.id))} aria-label={`Remove ${item.name}`}><X size={15} /></button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      {message && <p className={`form-message form-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
    </div>
  );
}
