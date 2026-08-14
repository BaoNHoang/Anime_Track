import { Bell, IdCard, LogOut, Moon, Settings2, Sun } from "./OwnedIcons";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCloudAuth } from "../app/providers/useCloudAuth";
import { useTheme } from "../app/providers/useTheme";
import { profileAvatarSrc } from "../domain/account/avatars";
import type { AccountUser } from "../services/account/accountApi";
import type { LocalProfile } from "../services/storage/localProfileRepository";
import { useNotifications } from "../app/providers/useNotifications";

type UserMenuProps =
  | { user: AccountUser; localProfile?: never }
  | { user?: never; localProfile: LocalProfile };

export function UserMenu({ user, localProfile }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useCloudAuth();
  const { theme, toggleTheme } = useTheme();
  const profile = user ?? localProfile;
  const { unreadCount } = useNotifications();
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    setError(undefined);
    const result = await signOut();
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu__trigger"
        type="button"
        aria-label={`Open ${profile.username} menu`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <img src={profileAvatarSrc(profile)} alt="" />
      </button>
      {unreadCount > 0 && (
        <span
          className="user-menu__badge"
          aria-label={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
        >
          {badgeLabel}
        </span>
      )}
      {open && (
        <div className="user-menu__popover" role="menu">
          <div className="user-menu__identity">
            <strong>{profile.username}</strong>
            <span>{user ? user.email : "Stored on this device"}</span>
          </div>
          <Link to="/profile" role="menuitem" onClick={() => setOpen(false)}>
            <IdCard size={17} /> Profile
          </Link>
          <Link to="/notifications" role="menuitem" onClick={() => setOpen(false)}>
            <Bell size={17} />
            <span className="user-menu__item-label">Notifications</span>
            {unreadCount > 0 && (
              <span className="user-menu__item-badge">{badgeLabel}</span>
            )}
          </Link>
          <Link to="/settings" role="menuitem" onClick={() => setOpen(false)}>
            <Settings2 size={17} /> Settings
          </Link>
          <button type="button" role="menuitem" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          {user && (
            <button type="button" role="menuitem" onClick={() => void handleSignOut()}>
              <LogOut size={17} /> Sign out
            </button>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
