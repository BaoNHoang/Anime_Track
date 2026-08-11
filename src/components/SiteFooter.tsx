import { Link } from "react-router-dom";
import { useCloudAuth } from "../app/providers/useCloudAuth";
import { Brand } from "./Brand";

export function SiteFooter() {
  const { configured, user } = useCloudAuth();
  const hasProfile = !configured || Boolean(user);

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Brand />
        </div>
        <nav className="site-footer__group" aria-label="Explore">
          <strong>Explore</strong>
          <Link to="/">Home</Link>
          <Link to="/discover">Discover</Link>
          <Link to="/news">News</Link>
        </nav>
        <nav className="site-footer__group" aria-label={hasProfile ? "Your Banime" : "Account"}>
          <strong>{hasProfile ? "Your Banime" : "Account"}</strong>
          {hasProfile ? (
            <>
              <Link to="/profile">Profile</Link>
              <Link to="/library">Library</Link>
              <Link to="/settings">Settings</Link>
            </>
          ) : (
            <>
              <Link to="/account?mode=sign_in">Sign in</Link>
              <Link to="/account?mode=sign_up">Create account</Link>
            </>
          )}
        </nav>
        <nav className="site-footer__group" aria-label="Legal and support">
          <strong>Legal &amp; support</strong>
          <Link to="/privacy">Privacy</Link>
          <Link to="/accessibility">Accessibility</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/sitemap">Site map</Link>
        </nav>
      </div>
      <div className="site-footer__base">
        <span>&copy; {new Date().getFullYear()} Banime</span>
        <span>Anime titles and artwork belong to their respective owners.</span>
      </div>
    </footer>
  );
}
