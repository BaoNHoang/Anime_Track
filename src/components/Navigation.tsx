import {
  Compass,
  LibraryBig,
  LayoutDashboard,
  Newspaper,
  Settings2,
  UserRound
} from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/library", label: "Library", icon: LibraryBig },
  { to: "/account", label: "Account", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings2 }
];

export function Navigation() {
  return (
    <nav className="navigation" aria-label="Main navigation">
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
