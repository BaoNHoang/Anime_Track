import {
  Compass,
  LibraryBig,
  LayoutDashboard,
  Newspaper,
  IdCard
} from "./OwnedIcons";
import { NavLink } from "react-router-dom";
import { useCloudAuth } from "../app/providers/useCloudAuth";

const publicLinks = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/news", label: "News", icon: Newspaper }
];

const libraryLink = { to: "/library", label: "Library", icon: LibraryBig };
const profileLink = { to: "/profile", label: "Profile", icon: IdCard };

export function Navigation({ variant = "header" }: { variant?: "header" | "mobile" }) {
  const { configured, initialized, likelyAuthenticated, user } = useCloudAuth();
  const hasPersonalAccess =
    !configured || Boolean(user) || (!initialized && likelyAuthenticated);
  const showPersonalPlaceholders =
    configured && !initialized && !likelyAuthenticated;
  const links = hasPersonalAccess
    ? [...publicLinks, libraryLink, profileLink]
    : publicLinks;
  const pendingLinks = showPersonalPlaceholders
    ? [libraryLink, profileLink]
    : [];

  return (
    <nav
      className={`navigation navigation--${variant}`}
      aria-label="Main navigation"
      data-count={links.length + pendingLinks.length}
    >
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `navigation__link${isActive ? " is-active" : ""}`
          }
        >
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
      {pendingLinks.map(({ to, label, icon: Icon }) => (
        <span
          className="navigation__link navigation__link--pending"
          aria-hidden="true"
          key={`pending:${to}`}
        >
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </span>
      ))}
    </nav>
  );
}
