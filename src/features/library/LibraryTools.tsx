import { NavLink } from "react-router-dom";

export function LibraryTools() {
  return <nav className="filter-chips" aria-label="Library tools">
    {[["/library", "Library"], ["/calendar", "Watch calendar"], ["/lists", "Custom lists"],
      ["/recommendations", "For you"], ["/settings", "Import / export"]].map(([to, label]) =>
      <NavLink className={({ isActive }) => isActive ? "button is-active" : "button button--ghost"}
        key={to} to={to}>{label}</NavLink>)}
  </nav>;
}
