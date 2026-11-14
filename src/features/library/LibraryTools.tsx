import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

export function LibraryTools() {
  const navigation = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const container = navigation.current;
    const active = container?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
    if (container && active) {
      container.scrollTo({ left: active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2 });
    }
  }, [pathname]);

  return <nav className="library-tabs" aria-label="Library tools" ref={navigation}>
    {[["/library", "Library"], ["/calendar", "Watch calendar"], ["/lists", "Custom lists"],
      ["/recommendations", "For you"]].map(([to, label]) =>
      <NavLink className="library-tabs__tab" end key={to} to={to}>{label}</NavLink>)}
  </nav>;
}
