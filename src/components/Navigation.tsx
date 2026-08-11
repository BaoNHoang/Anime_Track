import {
  Compass,
  LibraryBig,
  LayoutDashboard,
  Newspaper,
  Settings2,
  UserRound
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCloudAuth } from "../app/providers/useCloudAuth";

const publicLinks = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/news", label: "News", icon: Newspaper }
];

const personalLinks = [
  { to: "/library", label: "Library", icon: LibraryBig },
  { to: "/account", label: "Account", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings2 }
];

export function Navigation() {
  const { configured, initialized, user } = useCloudAuth();
  const links = initialized && (!configured || user)
    ? [...publicLinks, ...personalLinks]
    : publicLinks;

  return (
    <nav
      className="navigation"
      aria-label="Main navigation"
      data-count={links.length}
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
    </nav>
  );
}
