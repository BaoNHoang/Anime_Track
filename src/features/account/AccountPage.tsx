import {
  BadgeCheck,
  Check,
  Cloud,
  KeyRound,
  LogIn,
  LogOut,
  MailCheck,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useTracker } from "../../app/providers/useTracker";
import {
  PROFILE_AVATARS,
  profileAvatar
} from "../../domain/account/avatars";

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
    signInWithGoogle,
    signOut
  } = useCloudAuth();
  const { syncStatus, syncError } = useTracker();
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
    if (avatarId === user?.avatarId) return;
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

  if (!configured) {
    return (
      <div className="page-stack account-page">
        <header className="page-heading">
          <h1>Account</h1>
          <p>Your library is staying on this device.</p>
        </header>
        <section className="account-unavailable">
          <ShieldCheck size={24} />
          <div>
            <h2>Local mode</h2>
            <p>Account services will appear after hosting is configured.</p>
          </div>
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
    const avatar = profileAvatar(user.avatarId);
    return (
      <div className="page-stack account-page">
        <header className="page-heading">
          <h1>Account</h1>
          <p>Your private library can sync across signed-in devices.</p>
        </header>
        <section className="account-profile">
          <div className="account-profile__identity">
            <span className="account-avatar">
              <img src={avatar.src} alt="" />
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
          <section className="account-profile__section">
            <div className="account-profile__section-heading">
              <h3>Profile picture</h3>
              <p>Choose an original Banime avatar for your account.</p>
            </div>
            <div className="avatar-picker" aria-label="Profile picture choices">
              {PROFILE_AVATARS.map((option) => {
                const selected = option.id === user.avatarId;
                return (
                  <button
                    type="button"
                    className={selected ? "is-selected" : ""}
                    key={option.id}
                    aria-label={`Use ${option.label} profile picture`}
                    aria-pressed={selected}
                    disabled={submitting}
                    onClick={() => void handleAvatarUpdate(option.id)}
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
          <div className="account-profile__actions">
            <button
              className="button button--ghost"
              onClick={() => void signOut()}
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack account-page">
      <header className="page-heading">
        <h1>Account</h1>
        <p>Keep your watch deck available on every signed-in device.</p>
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
