import { Moon, Sun } from "lucide-react";
import { Outlet } from "react-router-dom";
import { AnimeDetailPanel } from "../features/anime/AnimeDetailPanel";
import { Brand } from "./Brand";
import { Navigation } from "./Navigation";
import { useTheme } from "../hooks/useTheme";

export function AppShell() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <Navigation />
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <Brand />
          </div>
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
