import { LogIn, UserPlus } from "./OwnedIcons";
import { Link, Outlet } from "react-router-dom";
import { AnimeDetailPanel } from "../features/anime/AnimeDetailPanel";
import { AmbientBackdrop } from "./AmbientBackdrop";
import { Brand } from "./Brand";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderShuffle } from "./HeaderShuffle";
import { Navigation } from "./Navigation";
import { useCloudAuth } from "../app/providers/useCloudAuth";
import { AuthPromptProvider } from "../app/providers/AuthPromptProvider";
import { SiteFooter } from "./SiteFooter";
import { UserMenu } from "./UserMenu";
import { useLocalProfile } from "../hooks/useLocalProfile";
import { HeaderAuthSkeleton } from "./LoadingState";

export function AppShell() {
  const { configured, initialized, user } = useCloudAuth();
  const { profile: localProfile } = useLocalProfile();

  return (
    <AuthPromptProvider>
      <div className="app-shell">
        <AmbientBackdrop />
        <div className="app-main">
          <header className="topbar">
            <Brand />
            <Navigation variant="header" />
            <HeaderSearch />
            <div className="topbar__actions">
              <HeaderShuffle />
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
                <HeaderAuthSkeleton />
              )}
            </div>
          </header>
          <main className="page">
            <Outlet />
          </main>
          <SiteFooter />
        </div>

        <div className="mobile-nav">
          <Navigation variant="mobile" />
        </div>
        <AnimeDetailPanel />
      </div>
    </AuthPromptProvider>
  );
}
