import {
  Compass,
  LibraryBig,
  LayoutDashboard,
  Settings2
} from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/library", label: "Library", icon: LibraryBig },
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
