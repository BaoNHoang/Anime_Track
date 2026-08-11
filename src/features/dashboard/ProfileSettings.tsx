import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ImageUp,
  ShieldCheck,
  Trash2
} from "../../components/OwnedIcons";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { PROFILE_AVATARS, profileAvatarSrc } from "../../domain/account/avatars";
import { PROFILE_BANNERS } from "../../domain/account/banners";
import {
  sanitizeProfileImage,
  type ProfileMediaKind
} from "../../domain/account/profileMedia";
import { useLocalProfile } from "../../hooks/useLocalProfile";

interface ProfileAppearance {
  avatarId: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
  bannerId: string;
  bannerUrl?: string;
  bannerDataUrl?: string;
}

function ProfileMediaControls({
  profile,
  disabled,
  onAvatar,
  onBanner,
  onUpload
}: {
  profile: ProfileAppearance;
  disabled: boolean;
  onAvatar: (avatarId: string) => void;
  onBanner: (bannerId: string) => void;
  onUpload: (kind: ProfileMediaKind, file: File) => void;
}) {
  return (
    <>
      <section className="account-profile__section">
        <div className="account-profile__section-heading account-profile__section-heading--row">
          <div><h3>Profile picture</h3><p>Square, around 800x800. JPEG, PNG, or WebP; maximum 8 MB.</p></div>
          <label className="button button--ghost profile-upload">
            <ImageUp size={16} /> Upload picture
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onUpload("avatar", file);
              }}
            />
          </label>
        </div>
        <div className="avatar-picker" aria-label="Profile picture choices">
          {PROFILE_AVATARS.map((option) => {
            const selected = option.id === profile.avatarId && !profile.avatarUrl && !profile.avatarDataUrl;
            return (
              <button
                type="button"
                className={selected ? "is-selected" : ""}
                key={option.id}
                aria-label={`Use ${option.label} profile picture`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onAvatar(option.id)}
              >
                <img src={option.src} alt="" loading="lazy" />
                {selected && <span aria-hidden="true"><Check size={15} /></span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="account-profile__section">
        <div className="account-profile__section-heading account-profile__section-heading--row">
          <div><h3>Profile banner</h3><p>Wide, around 1600x500. JPEG, PNG, or WebP; maximum 8 MB.</p></div>
          <label className="button button--ghost profile-upload">
            <ImageUp size={16} /> Upload banner
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onUpload("banner", file);
              }}
            />
          </label>
        </div>
        <div className="banner-picker" aria-label="Profile banner choices">
          {PROFILE_BANNERS.map((option) => {
            const selected = option.id === profile.bannerId && !profile.bannerUrl && !profile.bannerDataUrl;
            return (
              <button
                type="button"
                className={selected ? "is-selected" : ""}
                key={option.id}
                aria-label={`Use ${option.label} profile banner`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onBanner(option.id)}
              >
                <img src={option.src} alt="" loading="lazy" />
                <span>{option.label}</span>
                {selected && <Check size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function ProfileSettings() {
  const {
    configured,
    user,
    updateUsername,
    updateAvatar,
    updateBanner,
    uploadProfileMedia,
    deleteAccount
  } = useCloudAuth();
  const { profile, updateProfile } = useLocalProfile();
  const activeProfile = user ?? profile;
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();

  const saveUsername = async (event: FormEvent) => {
    event.preventDefault();
    const next = username.trim();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(next)) {
      setMessage({ tone: "error", text: "Use 3 to 24 letters, numbers, or underscores." });
      return;
    }
    setSubmitting(true);
    if (!configured) {
      updateProfile({ username: next });
      setMessage({ tone: "success", text: "Profile name updated." });
    } else {
      const result = await updateUsername(next);
      setMessage(result.error
        ? { tone: "error", text: result.error }
        : { tone: "success", text: result.message ?? "Username updated." });
    }
    setUsername("");
    setSubmitting(false);
  };

  const savePreset = async (kind: "avatar" | "banner", id: string) => {
    setSubmitting(true);
    if (!configured) {
      updateProfile(kind === "avatar"
        ? { avatarId: id, avatarDataUrl: undefined }
        : { bannerId: id, bannerDataUrl: undefined });
      setMessage({ tone: "success", text: kind === "avatar" ? "Profile picture updated." : "Profile banner updated." });
    } else {
      const result = kind === "avatar" ? await updateAvatar(id) : await updateBanner(id);
      setMessage(result.error
        ? { tone: "error", text: result.error }
        : { tone: "success", text: result.message ?? "Profile updated." });
    }
    setSubmitting(false);
  };

  const upload = async (kind: ProfileMediaKind, file: File) => {
    setSubmitting(true);
    try {
      const dataUrl = await sanitizeProfileImage(file, kind);
      if (!configured) {
        updateProfile(kind === "avatar" ? { avatarDataUrl: dataUrl } : { bannerDataUrl: dataUrl });
        setMessage({ tone: "success", text: "Profile image uploaded." });
      } else {
        const result = await uploadProfileMedia(kind, dataUrl);
        setMessage(result.error
          ? { tone: "error", text: result.error }
          : { tone: "success", text: result.message ?? "Profile image uploaded." });
      }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Image upload failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const removeAccount = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await deleteAccount(deleteConfirmation);
    setSubmitting(false);
    if (result.error) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="page-stack account-page">
      <header className="profile-editor-heading">
        <Link to="/profile" aria-label="Back to profile"><ChevronLeft size={18} /></Link>
        <div><h1>Edit profile</h1><p>Manage your public profile and account details.</p></div>
      </header>
      <section className="account-profile">
        <div className="account-profile__identity">
          <span className="account-avatar"><img src={profileAvatarSrc(activeProfile)} alt="" /></span>
          <div><h2>{activeProfile.username}</h2><p>{user?.email ?? "Stored only on this device"}</p></div>
        </div>
        {user && (
          <div className="account-profile__status">
            <span className="status-pill status-pill--success"><BadgeCheck size={14} /> {user.emailVerified ? "Email verified" : "Verification pending"}</span>
            <span className="status-pill"><ShieldCheck size={14} /> Private sync</span>
          </div>
        )}
        {message && <p className={`form-message form-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
        <ProfileMediaControls
          profile={activeProfile}
          disabled={submitting}
          onAvatar={(id) => void savePreset("avatar", id)}
          onBanner={(id) => void savePreset("banner", id)}
          onUpload={(kind, file) => void upload(kind, file)}
        />
        <section className="account-profile__section">
          <div className="account-profile__section-heading"><h3>Profile name</h3><p>Shown on your Banime profile.</p></div>
          <form className="auth-form account-username-form" onSubmit={saveUsername}>
            <label className="field"><span>New profile name</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={activeProfile.username} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required /></label>
            <button className="button" disabled={submitting}>Save name</button>
          </form>
        </section>
        {user && (
          <section className="account-profile__section account-danger-zone">
            <div className="account-profile__section-heading"><h3>Delete account</h3><p>Permanently delete your profile and synchronized library. This cannot be undone.</p><Link className="text-link" to="/privacy">Read how Banime handles your data</Link></div>
            <form className="account-delete-form" onSubmit={removeAccount}>
              <label className="field"><span>Enter DELETE to confirm</span><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" maxLength={6} required /></label>
              <button className="button button--danger" disabled={submitting || deleteConfirmation !== "DELETE"}><Trash2 size={16} /> Delete account</button>
            </form>
          </section>
        )}
      </section>
    </div>
  );
}
