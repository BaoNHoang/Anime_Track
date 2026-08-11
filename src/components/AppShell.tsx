import { LogIn, UserPlus } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { AnimeDetailPanel } from "../features/anime/AnimeDetailPanel";
import { AmbientBackdrop } from "./AmbientBackdrop";
import { Brand } from "./Brand";
import { Navigation } from "./Navigation";
import { useCloudAuth } from "../app/providers/useCloudAuth";
import { AuthPromptProvider } from "../app/providers/AuthPromptProvider";
import { SiteFooter } from "./SiteFooter";
import { UserMenu } from "./UserMenu";
import { useLocalProfile } from "../hooks/useLocalProfile";

export function AppShell() {
  const { configured, initialized, user } = useCloudAuth();
  const { profile: localProfile } = useLocalProfile();

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
          <div className="topbar__spacer" />
          {initialized && user ? (
            <UserMenu user={user} />
          ) : initialized && !configured ? (
            <UserMenu localProfile={localProfile} />
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
