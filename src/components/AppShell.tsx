import { Bell } from "lucide-react";
import { Outlet } from "react-router-dom";
import { AnimeDetailPanel } from "../features/anime/AnimeDetailPanel";
import { Brand } from "./Brand";
import { Navigation } from "./Navigation";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <Navigation />
        <div className="sidebar__footer">
          <span className="sidebar__eyebrow">Private by default</span>
          <p>Your library stays on this device.</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <Brand />
          </div>
          <div className="topbar__spacer" />
          <button className="icon-button" aria-label="Notifications">
            <Bell size={19} />
          </button>
          <div className="avatar" aria-label="Personal profile">
            B
          </div>
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
