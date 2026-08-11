import { KeyRound, LogIn, MailCheck, UserRound } from "../../components/OwnedIcons";
import { useState, type FormEvent } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { AccountSkeleton } from "../../components/LoadingState";

type AccountMode = "sign_in" | "sign_up" | "verify" | "forgot" | "reset";

function readAccountMode(value: string | null): AccountMode {
  return value === "sign_up" ? "sign_up" : "sign_in";
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
    signInWithGoogle
  } = useCloudAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AccountMode>(() => readAccountMode(searchParams.get("mode")));
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | undefined>(() =>
    searchParams.get("auth_error")
      ? { tone: "error", text: "Google sign-in could not be completed." }
      : undefined
  );
  const [submitting, setSubmitting] = useState(false);

  if (!configured || user) return <Navigate to="/profile?edit=profile" replace />;

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
    if ((mode === "sign_up" || mode === "reset") && password !== confirmPassword) {
      setMessage({ tone: "error", text: "Passwords do not match." });
      return;
    }
    setSubmitting(true);
    const result = mode === "sign_in"
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
      navigate(next?.startsWith("/") && !next.startsWith("//") ? next : "/profile", { replace: true });
      return;
    }
    setMessage({ tone: "success", text: result.message ?? "Done." });
    if (mode === "sign_up") setMode("verify");
    if (mode === "forgot") setMode("reset");
    if (mode === "reset") switchMode("sign_in");
  };

  const resend = async () => {
    setSubmitting(true);
    const result = await resendVerification(email);
    setSubmitting(false);
    setMessage(result.error
      ? { tone: "error", text: result.error }
      : { tone: "success", text: result.message ?? "A new code was sent." });
  };

  if (!initialized) {
    return <AccountSkeleton />;
  }

  return (
    <div className="account-page">
      <h1 className="visually-hidden">Banime account</h1>
      <section className="account-auth">
        <div className="account-auth__rail" aria-hidden="true">
          <span className="account-auth__mark">
            {mode === "verify" ? <MailCheck size={26} /> : mode === "forgot" || mode === "reset" ? <KeyRound size={26} /> : <UserRound size={26} />}
          </span>
          <strong>Banime ID</strong><span>Private by default</span>
        </div>
        <div className="account-auth__form">
          {(mode === "sign_in" || mode === "sign_up") && (
            <div className="auth-tabs" aria-label="Account action">
              <button type="button" className={mode === "sign_in" ? "is-active" : ""} onClick={() => switchMode("sign_in")}>Sign in</button>
              <button type="button" className={mode === "sign_up" ? "is-active" : ""} onClick={() => switchMode("sign_up")}>Create account</button>
            </div>
          )}
          <div className="account-form-heading">
            <h2>{mode === "sign_in" ? "Welcome back" : mode === "sign_up" ? "Create your account" : mode === "verify" ? "Verify your email" : mode === "forgot" ? "Find your account" : "Set a new password"}</h2>
            {(mode === "verify" || mode === "reset") && <p>Enter the code sent to your email.</p>}
          </div>
          {mode === "sign_in" && <button type="button" className="button account-google" onClick={signInWithGoogle}><LogIn size={17} /> Continue with Google</button>}
          {mode === "sign_in" && <div className="auth-divider">or</div>}
          <form className="auth-form account-form" onSubmit={handleSubmit}>
            {mode === "sign_in" ? (
              <label className="field"><span>Email or username</span><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" maxLength={320} required /></label>
            ) : (
              <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={320} required /></label>
            )}
            {mode === "sign_up" && <label className="field"><span>Username</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required /></label>}
            {(mode === "verify" || mode === "reset") && <label className="field"><span>Verification code</span><input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" minLength={6} maxLength={12} required /></label>}
            {(mode === "sign_in" || mode === "sign_up" || mode === "reset") && <label className="field"><span>{mode === "reset" ? "New password" : "Password"}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "sign_in" ? "current-password" : "new-password"} minLength={mode === "sign_in" ? 1 : 12} maxLength={128} required /></label>}
            {(mode === "sign_up" || mode === "reset") && <label className="field"><span>Confirm password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></label>}
            {message && <p className={`form-message form-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</p>}
            <button className="button" disabled={submitting}>{submitting ? "Working..." : mode === "sign_in" ? "Sign in" : mode === "sign_up" ? "Create account" : mode === "verify" ? "Verify email" : mode === "forgot" ? "Send reset code" : "Update password"}</button>
          </form>
          <div className="account-form-links">
            {mode === "sign_in" && <button type="button" onClick={() => switchMode("forgot")}>Forgot password?</button>}
            {(mode === "forgot" || mode === "reset" || mode === "verify") && <button type="button" onClick={() => switchMode("sign_in")}>Back to sign in</button>}
            {mode === "verify" && <button type="button" onClick={() => void resend()} disabled={submitting}>Resend code</button>}
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
