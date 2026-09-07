import { useState } from "react";
import { useTracker } from "../../app/providers/useTracker";
import { AnimeCard } from "../../components/AnimeCard";
import { LibraryTools } from "./LibraryTools";

export function CustomListsPage() {
  const { items, updateAnime, isReady } = useTracker();
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [animeId, setAnimeId] = useState("");
  const [message, setMessage] = useState("");
  const lists = [...new Set(items.flatMap((item) => item.customLists ?? []))].sort();
  const active = lists.includes(selected) ? selected : lists[0] ?? "";
  const members = items.filter((item) => item.customLists?.includes(active));
  const add = (listName: string) => {
    const item = items.find((entry) => entry.anime.id === Number(animeId));
    const cleaned = listName.trim();
    if (!item || !cleaned || cleaned.length > 80) return;
    if ((item.customLists?.length ?? 0) >= 50) { setMessage("A title can belong to at most 50 lists."); return; }
    updateAnime(item.anime.id, { customLists: [...new Set([...(item.customLists ?? []), cleaned])] });
    setSelected(cleaned);
    setName("");
    setMessage("List saved.");
  };
  const rename = () => {
    const cleaned = name.trim();
    if (!cleaned || !active) return;
    for (const item of members) updateAnime(item.anime.id, {
      customLists: [...new Set(item.customLists?.map((entry) => entry === active ? cleaned : entry))]
    });
    setSelected(cleaned); setName("");
  };
  return <div className="page-stack">
    <h1>Custom lists</h1><LibraryTools />
    <p>Organize titles from your library. Lists sync with your account. A list disappears when its last title is removed.</p>
    {!isReady ? <p role="status">Loading your library…</p> : <>
      <div className="query-panel library-tool-form">
        <label>List name <input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Title <select value={animeId} onChange={(e) => setAnimeId(e.target.value)}>
          <option value="">Choose a library title</option>
          {items.map((item) => <option key={item.anime.id} value={item.anime.id}>{item.anime.titleEnglish || item.anime.title}</option>)}
        </select></label>
        <button className="button" disabled={!name.trim() || !animeId} onClick={() => add(name)}>Create list with title</button>
        <button className="button button--ghost" disabled={!active || !name.trim()} onClick={rename}>Rename selected list</button>
      </div>
      <div className="filter-chips">{lists.map((list) => <button className={list === active ? "is-active" : ""} key={list} onClick={() => setSelected(list)}>{list}</button>)}</div>
      {active && <><h2>{active} · {members.length}</h2>
        <button className="button" disabled={!animeId} onClick={() => add(active)}>Add chosen title</button>
        <div className="anime-grid">{members.map((item) => <div key={item.anime.id}>
          <AnimeCard anime={item.anime} />
          <button className="button button--ghost" onClick={() => updateAnime(item.anime.id, { customLists: item.customLists?.filter((list) => list !== active) })}>Remove from list</button>
        </div>)}</div></>}
      {!lists.length && <p>Create your first list by choosing a title and naming the list.</p>}
      {message && <p role="status">{message}</p>}
    </>}
  </div>;
}
