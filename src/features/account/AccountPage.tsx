import {
  BadgeCheck,
  Check,
  Cloud,
  HardDrive,
  ImageUp,
  KeyRound,
  LogIn,
  MailCheck,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useTracker } from "../../app/providers/useTracker";
import {
  PROFILE_AVATARS,
  profileAvatarSrc
} from "../../domain/account/avatars";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import { PROFILE_BANNERS } from "../../domain/account/banners";
import {
  sanitizeProfileImage,
  type ProfileMediaKind
} from "../../domain/account/profileMedia";

type AccountMode =
  | "sign_in"
  | "sign_up"
  | "verify"
  | "forgot"
  | "reset";

function readAccountMode(value: string | null): AccountMode {
  return value === "sign_up" ? "sign_up" : "sign_in";
}

interface FormMessage {
  tone: "success" | "error";
  text: string;
}

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
          <div>
            <h3>Profile picture</h3>
            <p>Use a square image around 800x800. JPEG, PNG, or WebP; maximum 8 MB.</p>
          </div>
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
            const selected = option.id === profile.avatarId &&
              !profile.avatarUrl && !profile.avatarDataUrl;
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
                {selected && (
                  <span aria-hidden="true"><Check size={15} /></span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="account-profile__section">
        <div className="account-profile__section-heading account-profile__section-heading--row">
          <div>
            <h3>Profile banner</h3>
            <p>Use a wide 1600x500 image. JPEG, PNG, or WebP; maximum 8 MB.</p>
          </div>
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
            const selected = option.id === profile.bannerId &&
              !profile.bannerUrl && !profile.bannerDataUrl;
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

export function AccountPage() {
  const {
    configured,
    initialized,
    user,
    signIn,
    signUp,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
    updateUsername,
    updateAvatar,
    updateBanner,
    uploadProfileMedia,
    deleteAccount,
    signInWithGoogle
  } = useCloudAuth();
  const { syncStatus, syncError } = useTracker();
  const { profile: localProfile, updateProfile } = useLocalProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AccountMode>(() =>
    readAccountMode(searchParams.get("mode"))
  );
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState<FormMessage | undefined>(() =>
    searchParams.get("auth_error")
      ? {
          tone: "error",
          text: "Google sign-in could not be completed."
        }
      : undefined
  );
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: AccountMode) => {
    setMode(next);
    setMessage(undefined);
    setPassword("");
    setConfirmPassword("");
    setCode("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    if (
      (mode === "sign_up" || mode === "reset") &&
      password !== confirmPassword
    ) {
      setMessage({ tone: "error", text: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    const result =
      mode === "sign_in"
        ? await signIn(identifier, password)
        : mode === "sign_up"
          ? await signUp(email, username, password)
          : mode === "verify"
            ? await verifyEmail(email, code)
            : mode === "forgot"
              ? await requestPasswordReset(email)
              : await resetPassword(email, code, password);
    setSubmitting(false);

    if (result.error) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    if (mode === "sign_in") {
      const next = searchParams.get("next");
      if (next?.startsWith("/") && !next.startsWith("//")) {
        navigate(next);
        return;
      }
    }
    setMessage({
      tone: "success",
      text: result.message ?? "Done."
    });
    if (mode === "sign_up") setMode("verify");
    if (mode === "forgot") setMode("reset");
    if (mode === "reset") {
      setMode("sign_in");
      setPassword("");
      setConfirmPassword("");
      setCode("");
    }
  };

  const handleUsernameUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    setSubmitting(true);
    const result = await updateUsername(profileUsername);
    setSubmitting(false);
    setMessage(
      result.error
        ? { tone: "error", text: result.error }
        : { tone: "success", text: "Username updated." }
    );
  };

  const handleAvatarUpdate = async (avatarId: string) => {
    if (avatarId === user?.avatarId && !user.avatarUrl) return;
    setMessage(undefined);
    setSubmitting(true);
    const result = await updateAvatar(avatarId);
    setSubmitting(false);
    setMessage(
      result.error
        ? { tone: "error", text: result.error }
        : {
            tone: "success",
            text: result.message ?? "Profile picture updated."
          }
    );
  };

  const handleBannerUpdate = async (bannerId: string) => {
    if (bannerId === user?.bannerId && !user.bannerUrl) return;
    setMessage(undefined);
    setSubmitting(true);
    const result = await updateBanner(bannerId);
    setSubmitting(false);
    setMessage(
      result.error
        ? { tone: "error", text: result.error }
        : { tone: "success", text: result.message ?? "Profile banner updated." }
    );
  };

  const handleProfileMediaUpload = async (
    kind: ProfileMediaKind,
    file: File
  ) => {
    setMessage(undefined);
    setSubmitting(true);
    try {
      const dataUrl = await sanitizeProfileImage(file, kind);
      if (!configured) {
        updateProfile(
          kind === "avatar"
            ? { avatarDataUrl: dataUrl }
            : { bannerDataUrl: dataUrl }
        );
        setMessage({
          tone: "success",
          text: kind === "avatar" ? "Profile picture uploaded." : "Profile banner uploaded."
        });
        return;
      }
      const result = await uploadProfileMedia(kind, dataUrl);
      setMessage(
        result.error
          ? { tone: "error", text: result.error }
          : { tone: "success", text: result.message ?? "Profile image uploaded." }
      );
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Image upload failed."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setMessage(undefined);
    setSubmitting(true);
    const result = await resendVerification(email);
    setSubmitting(false);
    setMessage(
      result.error
        ? { tone: "error", text: result.error }
        : {
            tone: "success",
            text: result.message ?? "A new verification code has been sent."
          }
    );
  };

  const handleAccountDeletion = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    setSubmitting(true);
    const result = await deleteAccount(deleteConfirmation);
    setSubmitting(false);
    if (result.error) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    navigate("/", { replace: true });
  };

  const handleLocalUsernameUpdate = (event: FormEvent) => {
    event.preventDefault();
    const nextUsername = profileUsername.trim();
    if (!/^[A-Za-z0-9_]{3,24}$/.test(nextUsername)) {
      setMessage({
        tone: "error",
        text: "Use 3 to 24 letters, numbers, or underscores."
      });
      return;
    }
    updateProfile({ username: nextUsername });
    setProfileUsername("");
    setMessage({ tone: "success", text: "Local profile updated." });
  };

  if (!configured) {
    return (
      <div className="page-stack account-page">
        <header className="page-heading">
          <h1>Local profile</h1>
        </header>
        <section className="account-profile">
          <div className="account-profile__identity">
            <span className="account-avatar">
              <img src={profileAvatarSrc(localProfile)} alt="" />
            </span>
            <div>
              <span className="account-kicker">Local mode</span>
              <h2>{localProfile.username}</h2>
              <p>Stored only in this browser</p>
            </div>
          </div>
          <div className="account-profile__status">
            <span className="status-pill">
              <HardDrive size={14} /> On-device profile
            </span>
          </div>
          {message && (
            <p
              className={`form-message form-message--${message.tone}`}
              role={message.tone === "error" ? "alert" : "status"}
            >
              {message.text}
            </p>
          )}
          <ProfileMediaControls
            profile={localProfile}
            disabled={submitting}
            onAvatar={(avatarId) =>
              updateProfile({ avatarId, avatarDataUrl: undefined })
            }
            onBanner={(bannerId) =>
              updateProfile({ bannerId, bannerDataUrl: undefined })
            }
            onUpload={(kind, file) =>
              void handleProfileMediaUpload(kind, file)
            }
          />
          <section className="account-profile__section">
            <div className="account-profile__section-heading">
              <h3>Profile name</h3>
              <p>Used on your local Home profile.</p>
            </div>
            <form
              className="auth-form account-username-form"
              onSubmit={handleLocalUsernameUpdate}
            >
              <label className="field">
                <span>New profile name</span>
                <input
                  value={profileUsername}
                  onChange={(event) => setProfileUsername(event.target.value)}
                  placeholder={localProfile.username}
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]+"
                  required
                />
              </label>
              <button className="button">Save profile</button>
            </form>
          </section>
        </section>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="page-stack account-page">
        <header className="page-heading">
          <h1>Account</h1>
        </header>
        <section className="account-unavailable">
          <ShieldCheck size={24} />
          <p>Checking your session...</p>
        </section>
      </div>
    );
  }

  if (user) {
    return (
      <div className="page-stack account-page">
        <header className="page-heading">
          <h1>Account</h1>
        </header>
        <section className="account-profile">
          <div className="account-profile__identity">
            <span className="account-avatar">
              <img src={profileAvatarSrc(user)} alt="" />
            </span>
            <div>
              <span className="account-kicker">Signed in</span>
              <h2>{user.username}</h2>
              <p>{user.email}</p>
            </div>
          </div>
          <div className="account-profile__status">
            <span className="status-pill status-pill--success">
              <BadgeCheck size={14} />
              {user.emailVerified ? "Email verified" : "Verification pending"}
            </span>
            <span className="status-pill">
              <ShieldCheck size={14} /> Private sync
            </span>
          </div>
          {message && (
            <p
              className={`form-message form-message--${message.tone}`}
              role={message.tone === "error" ? "alert" : "status"}
            >
              {message.text}
            </p>
          )}
          <ProfileMediaControls
            profile={user}
            disabled={submitting}
            onAvatar={(avatarId) => void handleAvatarUpdate(avatarId)}
            onBanner={(bannerId) => void handleBannerUpdate(bannerId)}
            onUpload={(kind, file) =>
              void handleProfileMediaUpload(kind, file)
            }
          />
          <section className="account-profile__section">
            <div className="account-profile__section-heading">
              <h3>Username</h3>
              <p>Change the name shown with your private Banime profile.</p>
            </div>
            <form className="auth-form account-username-form" onSubmit={handleUsernameUpdate}>
              <label className="field">
                <span>New username</span>
                <input
                  value={profileUsername}
                  onChange={(event) => setProfileUsername(event.target.value)}
                  placeholder={user.username}
                  autoComplete="username"
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]+"
                  required
                />
              </label>
              <button className="button" disabled={submitting}>Save username</button>
            </form>
          </section>
          <section className="account-profile__section account-profile__sync">
            <span className="account-profile__section-icon" aria-hidden="true">
              <Cloud size={20} />
            </span>
            <div>
              <h3>Cloud sync</h3>
              <p>Your library is connected to this Banime account.</p>
              <span className={`status-pill status-pill--${syncStatus}`}>
                {syncStatus === "syncing" && "Syncing..."}
                {syncStatus === "synced" && "Library synced"}
                {syncStatus === "error" && "Sync needs attention"}
                {syncStatus === "local" && "Local changes"}
              </span>
              {syncError && (
                <p className="form-message form-message--error">{syncError}</p>
              )}
            </div>
          </section>
          <section className="account-profile__section account-danger-zone">
            <div className="account-profile__section-heading">
              <h3>Delete account</h3>
              <p>
                Permanently delete your sign-in, profile, and synchronized
                library. Banime will also clear its local library from this
                browser. This cannot be undone.
              </p>
              <Link className="text-link" to="/privacy">
                Read how Banime handles your data
              </Link>
            </div>
            <form className="account-delete-form" onSubmit={handleAccountDeletion}>
              <label className="field">
                <span>Enter DELETE to confirm</span>
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                  maxLength={6}
                  required
                />
              </label>
              <button
                className="button button--danger"
                disabled={submitting || deleteConfirmation !== "DELETE"}
              >
                <Trash2 size={16} />
                {submitting ? "Deleting..." : "Delete account"}
              </button>
            </form>
          </section>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack account-page">
      <header className="page-heading">
        <h1>Account</h1>
      </header>

      <section className="account-auth">
        <div className="account-auth__rail" aria-hidden="true">
          <span className="account-auth__mark">
            {mode === "verify" ? (
              <MailCheck size={26} />
            ) : mode === "forgot" || mode === "reset" ? (
              <KeyRound size={26} />
            ) : (
              <UserRound size={26} />
            )}
          </span>
          <strong>Banime ID</strong>
          <span>Private by default</span>
        </div>

        <div className="account-auth__form">
          {(mode === "sign_in" || mode === "sign_up") && (
            <div className="auth-tabs" aria-label="Account action">
              <button
                type="button"
                className={mode === "sign_in" ? "is-active" : ""}
                onClick={() => switchMode("sign_in")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "sign_up" ? "is-active" : ""}
                onClick={() => switchMode("sign_up")}
              >
                Create account
              </button>
            </div>
          )}

          <div className="account-form-heading">
            <h2>
              {mode === "sign_in" && "Welcome back"}
              {mode === "sign_up" && "Create your account"}
              {mode === "verify" && "Verify your email"}
              {mode === "forgot" && "Find your account"}
              {mode === "reset" && "Set a new password"}
            </h2>
            {(mode === "verify" || mode === "reset") && (
              <p>Enter the code sent to your email.</p>
            )}
          </div>

          {mode === "sign_in" && (
            <button
              type="button"
              className="button account-google"
              onClick={signInWithGoogle}
            >
              <LogIn size={17} /> Continue with Google
            </button>
          )}

          {mode === "sign_in" && <div className="auth-divider">or</div>}

          <form className="auth-form account-form" onSubmit={handleSubmit}>
            {mode === "sign_in" ? (
              <label className="field">
                <span>Email or username</span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  maxLength={320}
                  required
                />
              </label>
            ) : (
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  maxLength={320}
                  required
                />
              </label>
            )}

            {mode === "sign_up" && (
              <label className="field">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]+"
                  required
                />
              </label>
            )}

            {(mode === "verify" || mode === "reset") && (
              <label className="field">
                <span>Verification code</span>
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={12}
                  required
                />
              </label>
            )}

            {(mode === "sign_in" ||
              mode === "sign_up" ||
              mode === "reset") && (
              <label className="field">
                <span>
                  {mode === "reset" ? "New password" : "Password"}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === "sign_in"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={mode === "sign_in" ? 1 : 12}
                  maxLength={128}
                  required
                />
              </label>
            )}

            {(mode === "sign_up" || mode === "reset") && (
              <label className="field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
            )}

            {message && (
              <p
                className={`form-message form-message--${message.tone}`}
                role={message.tone === "error" ? "alert" : "status"}
              >
                {message.text}
              </p>
            )}

            <button className="button" disabled={submitting}>
              {submitting
                ? "Working..."
                : mode === "sign_in"
                  ? "Sign in"
                  : mode === "sign_up"
                    ? "Create account"
                    : mode === "verify"
                      ? "Verify email"
                      : mode === "forgot"
                        ? "Send reset code"
                        : "Update password"}
            </button>
          </form>

          <div className="account-form-links">
            {mode === "sign_in" && (
              <button type="button" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            )}
            {(mode === "forgot" ||
              mode === "reset" ||
              mode === "verify") && (
              <button type="button" onClick={() => switchMode("sign_in")}>
                Back to sign in
              </button>
            )}
            {mode === "verify" && (
              <button
                type="button"
                onClick={() => void handleResendVerification()}
                disabled={submitting}
              >
                Resend code
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function AccountRoute() {
  const { search } = useLocation();
  return <AccountPage key={search} />;
}
