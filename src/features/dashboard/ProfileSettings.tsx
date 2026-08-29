import {
  Check,
  ChevronLeft,
  ImageUp,
  KeyRound,
  LogOut,
  ShieldCheck,
  Trash2
} from "../../components/OwnedIcons";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { PROFILE_AVATARS, profileAvatarSrc } from "../../domain/account/avatars";
import { PROFILE_BANNERS } from "../../domain/account/banners";
import {
  sanitizeProfileImage,
  type ProfileMediaKind
} from "../../domain/account/profileMedia";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import type { PasskeyMetadata } from "../../services/account/accountApi";

interface ProfileAppearance {
  avatarId: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
  bannerId: string;
  bannerUrl?: string;
  bannerDataUrl?: string;
}

const securityDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium"
});

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
    passkeysEnabled,
    user,
    updateUsername,
    updateAvatar,
    updateBanner,
    uploadProfileMedia,
    addPasskey,
    listPasskeys,
    removePasskey,
    signOutOtherSessions,
    deleteAccount
  } = useCloudAuth();
  const { profile, updateProfile } = useLocalProfile();
  const activeProfile = user ?? profile;
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();
  const [passkeys, setPasskeys] = useState<PasskeyMetadata[]>([]);
  const [securityLoading, setSecurityLoading] = useState(
    Boolean(user && passkeysEnabled)
  );
  const userId = user?.id;
  const canRegisterPasskey = user?.provider === "email";

  const refreshPasskeys = useCallback(async () => {
    if (!userId || !passkeysEnabled) return;
    const result = await listPasskeys();
    setSecurityLoading(false);
    if (result.error) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    setPasskeys(result.passkeys);
  }, [listPasskeys, passkeysEnabled, userId]);

  useEffect(() => {
    if (!userId || !passkeysEnabled) return;
    let active = true;
    void listPasskeys().then((result) => {
      if (!active) return;
      setSecurityLoading(false);
      if (result.error) {
        setMessage({ tone: "error", text: result.error });
      } else {
        setPasskeys(result.passkeys);
      }
    });
    return () => {
      active = false;
    };
  }, [listPasskeys, passkeysEnabled, userId]);

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

  const registerPasskey = async () => {
    setSubmitting(true);
    const result = await addPasskey();
    setSubmitting(false);
    setMessage(result.error
      ? { tone: "error", text: result.error }
      : { tone: "success", text: result.message ?? "Passkey added." });
    if (!result.error) await refreshPasskeys();
  };

  const deletePasskey = async (passkeyId: string) => {
    setSubmitting(true);
    const result = await removePasskey(passkeyId);
    setSubmitting(false);
    setMessage(result.error
      ? { tone: "error", text: result.error }
      : { tone: "success", text: result.message ?? "Passkey removed." });
    if (!result.error) {
      setPasskeys((current) => current.filter((item) => item.id !== passkeyId));
    }
  };

  const revokeOtherSessions = async () => {
    setSubmitting(true);
    const result = await signOutOtherSessions();
    setSubmitting(false);
    setMessage(result.error
      ? { tone: "error", text: result.error }
      : { tone: "success", text: result.message ?? "Other devices signed out." });
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
        {message && <p className={`form-message form-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
        <ProfileMediaControls
          profile={activeProfile}
          disabled={submitting}
          onAvatar={(id) => void savePreset("avatar", id)}
          onBanner={(id) => void savePreset("banner", id)}
          onUpload={(kind, file) => void upload(kind, file)}
        />
        {user && passkeysEnabled && (
          <section className="account-profile__section security-controls">
            <div className="account-profile__section-heading account-profile__section-heading--row">
              <div><h3>Passkeys</h3><p>Use your device lock, fingerprint, face, or security key to sign in without typing a password.</p></div>
              <button className="button button--ghost" type="button" disabled={submitting || securityLoading || !canRegisterPasskey} onClick={() => void registerPasskey()}><KeyRound size={16} /> Add passkey</button>
            </div>
            {securityLoading ? (
              <p className="security-controls__empty">Loading passkeys...</p>
            ) : passkeys.length ? (
              <div className="passkey-list">
                {passkeys.map((passkey) => (
                  <article key={passkey.id}>
                    <span><ShieldCheck size={18} /></span>
                    <div>
                      <strong>{passkey.friendly_name || "Passkey"}</strong>
                      <small>
                        Added {securityDateFormatter.format(new Date(passkey.created_at))}
                        {passkey.last_used_at ? ` · Last used ${securityDateFormatter.format(new Date(passkey.last_used_at))}` : ""}
                      </small>
                    </div>
                    <button type="button" aria-label={`Remove ${passkey.friendly_name || "passkey"}`} disabled={submitting} onClick={() => void deletePasskey(passkey.id)}><Trash2 size={15} /></button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="security-controls__empty">{canRegisterPasskey ? "No passkeys yet. Add one from a device you trust." : "Supabase does not currently support adding passkeys to social sign-in accounts."}</p>
            )}
          </section>
        )}
        {user && (
          <section className="account-profile__section security-controls">
            <div className="account-profile__section-heading"><h3>Sessions</h3><p>Your current browser is signed in. Revoke refresh access for every other browser and device if you do not recognize recent account activity. A previously issued access token can remain valid until its short expiry.</p></div>
            <div className="session-row">
              <span><ShieldCheck size={18} /></span>
              <div><strong>This browser</strong><small>Current session · {user.provider} sign-in</small></div>
              <span className="status-pill status-pill--success">Active</span>
            </div>
            <button className="button button--ghost security-controls__revoke" type="button" disabled={submitting} onClick={() => void revokeOtherSessions()}><LogOut size={16} /> Sign out other devices</button>
          </section>
        )}
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
