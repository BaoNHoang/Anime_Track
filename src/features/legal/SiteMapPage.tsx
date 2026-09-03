import { Bell, IdCard, LibraryBig, Map, Newspaper, Search, Settings2, Sparkles, UserRound } from "../../components/OwnedIcons";
import { Link } from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";

const publicLinks = [
  { to: "/", label: "Home", icon: Map },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/news", label: "News", icon: Newspaper }
];

const personalLinks = [
  { to: "/profile", label: "Profile", icon: IdCard },
  { to: "/library", label: "Library", icon: LibraryBig },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/year-in-review", label: "Year in review", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings2 }
];

export function SiteMapPage() {
  const { configured, user } = useCloudAuth();
  const hasProfile = !configured || Boolean(user);

  return (
    <div className="page-stack legal-page">
      <header className="page-heading legal-page__heading">
        <span className="legal-page__mark" aria-hidden="true">
          <Map size={22} />
        </span>
        <div>
          <h1>Site map</h1>
          <p>Every place you can go in Banime.</p>
        </div>
      </header>
      <div className="sitemap-groups">
        <section>
          <h2>Browse</h2>
          {publicLinks.map(({ to, label, icon: Icon }) => (
            <Link to={to} key={to}>
              <Icon size={18} /> <span>{label}</span>
            </Link>
          ))}
        </section>
        <section>
          <h2>{hasProfile ? "Your Banime" : "Account"}</h2>
          {hasProfile ? (
            personalLinks.map(({ to, label, icon: Icon }) => (
              <Link to={to} key={to}>
                <Icon size={18} /> <span>{label}</span>
              </Link>
            ))
          ) : (
            <>
              <Link to="/account?mode=sign_in"><UserRound size={18} /> <span>Sign in</span></Link>
              <Link to="/account?mode=sign_up"><UserRound size={18} /> <span>Create account</span></Link>
            </>
          )}
        </section>
        <section>
          <h2>Policies</h2>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/accessibility">Accessibility</Link>
          <Link to="/terms">Terms of Use</Link>
        </section>
      </div>
    </div>
  );
}
