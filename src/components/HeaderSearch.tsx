import { Search, X } from "./OwnedIcons";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAnimePanel } from "../app/providers/useAnimePanel";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useAnimeSearch } from "../hooks/useAnimeQueries";

export function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { openAnime } = useAnimePanel();
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const results = useAnimeSearch(debouncedQuery);
  const suggestions = results.data?.items.slice(0, 5) ?? [];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !target.matches("input, textarea, select, [contenteditable='true']")
      ) {
        event.preventDefault();
        setOpen(true);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) {
      inputRef.current?.focus();
      return;
    }
    setOpen(false);
    navigate(`/discover?q=${encodeURIComponent(value)}`);
  };

  return (
    <div className={`header-search${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        className="header-search__mobile-trigger"
        type="button"
        aria-label="Search anime"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          window.requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <Search size={19} />
      </button>
      <form className="header-search__form" role="search" onSubmit={submit}>
        <Search size={17} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search anime"
          aria-label="Search anime"
        />
        {query ? (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={15} />
          </button>
        ) : null}
      </form>
      {open && debouncedQuery.length >= 2 && (
        <div className="header-search__results">
          {results.isLoading && <span>Searching...</span>}
          {!results.isLoading && suggestions.length === 0 && <span>No titles found</span>}
          {suggestions.map((anime) => (
            <button
              type="button"
              key={anime.id}
              onClick={() => {
                openAnime(anime);
                setOpen(false);
              }}
            >
              <img src={anime.imageUrl} alt="" />
              <span>{anime.titleEnglish || anime.title}</span>
              {anime.year && <small>{anime.year}</small>}
            </button>
          ))}
          {suggestions.length > 0 && (
            <button className="header-search__all" type="button" onClick={submit}>
              View all results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
