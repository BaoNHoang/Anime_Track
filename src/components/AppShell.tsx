import { Moon, Sun } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimeDetailPanel } from "../features/anime/AnimeDetailPanel";
import { AmbientBackdrop } from "./AmbientBackdrop";
import { Brand } from "./Brand";
import { Navigation } from "./Navigation";
import { useTheme } from "../hooks/useTheme";

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const pageTitle =
    pathname === "/"
      ? "Overview"
      : pathname.slice(1).replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="app-shell">
      <AmbientBackdrop />
      <aside className="sidebar">
        <Brand />
        <Navigation />
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <Brand />
          </div>
          <span className="topbar__title">{pageTitle}</span>
          <div className="topbar__spacer" />
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>

      <div className="mobile-nav">
        <Navigation />
      </div>
      <AnimeDetailPanel />
    </div>
  );
}
