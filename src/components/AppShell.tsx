import { LogIn, Moon, Sun, UserPlus } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimeDetailPanel } from "../features/anime/AnimeDetailPanel";
import { AmbientBackdrop } from "./AmbientBackdrop";
import { Brand } from "./Brand";
import { Navigation } from "./Navigation";
import { useTheme } from "../app/providers/useTheme";
import { useCloudAuth } from "../app/providers/useCloudAuth";
import { AuthPromptProvider } from "../app/providers/AuthPromptProvider";
import { SiteFooter } from "./SiteFooter";

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { initialized, user } = useCloudAuth();
  const { pathname } = useLocation();
  const pageTitle =
    pathname === "/"
      ? "Overview"
      : pathname.slice(1).replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <AuthPromptProvider>
    <div className="app-shell">
      <AmbientBackdrop />
      <aside className="sidebar">
        <Brand />
        <Navigation />
        <span className="sidebar__hint" aria-hidden="true">Menu</span>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <Brand />
          </div>
          <span className="topbar__title">{pageTitle}</span>
          <div className="topbar__spacer" />
          {initialized && user ? (
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          ) : initialized ? (
            <div className="topbar-auth" aria-label="Account access">
              <Link to="/account?mode=sign_in">
                <LogIn size={16} /> Log in
              </Link>
              <Link className="topbar-auth__primary" to="/account?mode=sign_up">
                <UserPlus size={16} /> Sign up
              </Link>
            </div>
          ) : (
            <span className="topbar-auth__loading" aria-label="Checking session" />
          )}
        </header>
        <main className="page">
          <Outlet />
        </main>
        <SiteFooter />
      </div>

      <div className="mobile-nav">
        <Navigation />
      </div>
      <AnimeDetailPanel />
    </div>
    </AuthPromptProvider>
  );
}
