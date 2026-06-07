import {
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Info,
  LogOut,
  Moon,
  RefreshCw,
  Smartphone,
  Sun,
  Upload,
  WifiOff
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  LibraryImportError,
  parseLibraryImport
} from "../../domain/tracker/import";
import { useAppUpdateStatus } from "../../hooks/useAppUpdateStatus";
import { useCloudAuth } from "../../hooks/useCloudAuth";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { useTheme } from "../../hooks/useTheme";
import { useTracker } from "../../hooks/useTracker";

type AuthMode = "sign_in" | "sign_up";

export function SettingsPage() {
  const { items, syncStatus, syncError, importItems } = useTracker();
  const { configured, initialized, user, signIn, signUp, signOut } =
    useCloudAuth();
  const { canInstall, installed, install, isIos } = usePwaInstall();
  const { theme, setTheme } = useTheme();
  const { lastChecked, intervalMinutes } = useAppUpdateStatus();
  const importInput = useRef<HTMLInputElement>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<{
    tone: "success" | "error";
    text: string;
  }>();
  const [submitting, setSubmitting] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    tone: "success" | "error";
    text: string;
  }>();

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setAuthMessage(undefined);
    const result =
      authMode === "sign_in"
        ? await signIn(email, password)
        : await signUp(email, password);
    setSubmitting(false);
    setAuthMessage({
      tone: result.error ? "error" : "success",
      text: result.error ?? result.message ?? "Done."
    });
  };

  const exportLibrary = () => {
    const payload = JSON.stringify(
      {
        app: "Banime",
        exportedAt: new Date().toISOString(),
        items
      },
      null,
      2
    );
    const url = URL.createObjectURL(
      new Blob([payload], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `banime-library-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImportMessage({
        tone: "error",
        text: "The selected file is larger than 5 MB."
      });
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const imported = parseLibraryImport(parsed);
      const result = importItems(imported);
      setImportMessage({
        tone: "success",
        text: `Imported ${result.added} new and ${result.updated} newer title${
          result.added + result.updated === 1 ? "" : "s"
        }. Your library now has ${result.total}.`
      });
    } catch (error) {
      setImportMessage({
        tone: "error",
        text:
          error instanceof LibraryImportError
            ? error.message
            : "This file is not valid JSON."
      });
    }
  };

  return (
    <div className="page-stack settings-page">
      <header className="page-heading">
        <span className="eyebrow">Preferences & data</span>
        <h1>Settings</h1>
        <p>Install Banime and control how your private library is stored.</p>
      </header>

      <section className="settings-grid">
        <article className="settings-card">
          <span className="settings-card__icon">
            {theme === "dark" ? <Moon size={22} /> : <Sun size={22} />}
          </span>
          <div className="settings-card__content">
            <h2>Appearance</h2>
            <p>Choose the theme used on this device.</p>
            <div className="theme-options" aria-label="Color theme">
              <button
                className={theme === "light" ? "is-active" : ""}
                onClick={() => setTheme("light")}
              >
                <Sun size={15} /> Light
              </button>
              <button
                className={theme === "dark" ? "is-active" : ""}
                onClick={() => setTheme("dark")}
              >
                <Moon size={15} /> Dark
              </button>
            </div>
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <Smartphone size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Install Banime on your phone</h2>
            <p>
              The installable web app opens full-screen, works from your home
              screen, and keeps the app shell available offline.
            </p>
            {installed ? (
              <span className="status-pill status-pill--success">
                <CheckCircle2 size={14} /> Installed
              </span>
            ) : canInstall ? (
              <button className="button button--compact" onClick={install}>
                Install Banime
              </button>
            ) : (
              <p className="settings-hint">
                {isIos
                  ? "On iPhone: open the Share menu in Safari, then choose Add to Home Screen."
                  : "Open the deployed HTTPS site in Chrome or Edge, then use Install app or Add to Home Screen."}
              </p>
            )}
          </div>
        </article>

        <article className="settings-card settings-card--sync">
          <span className="settings-card__icon">
            <Cloud size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Cross-device cloud sync</h2>
            {!configured ? (
              <>
                <p>
                  Local tracking works now. To sync this computer and your
                  phone, create a Supabase project, run
                  <code> supabase/schema.sql </code>, and add the project URL
                  and publishable key to <code>.env.local</code>.
                </p>
                <span className="status-pill">
                  <WifiOff size={14} /> Local-only mode
                </span>
              </>
            ) : !initialized ? (
              <p>Checking your saved session...</p>
            ) : user ? (
              <div className="sync-account">
                <div>
                  <span>Signed in as</span>
                  <strong>{user.email}</strong>
                </div>
                <span
                  className={`status-pill status-pill--${syncStatus}`}
                >
                  {syncStatus === "syncing" && "Syncing..."}
                  {syncStatus === "synced" && "Library synced"}
                  {syncStatus === "error" && "Sync needs attention"}
                  {syncStatus === "local" && "Local changes"}
                </span>
                {syncError && (
                  <p className="form-message form-message--error">
                    {syncError}
                  </p>
                )}
                <button
                  className="button button--ghost button--compact"
                  onClick={() => void signOut()}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            ) : (
              <>
                <div className="auth-tabs">
                  <button
                    className={authMode === "sign_in" ? "is-active" : ""}
                    onClick={() => setAuthMode("sign_in")}
                  >
                    Sign in
                  </button>
                  <button
                    className={authMode === "sign_up" ? "is-active" : ""}
                    onClick={() => setAuthMode("sign_up")}
                  >
                    Create account
                  </button>
                </div>
                <form className="auth-form" onSubmit={handleAuth}>
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={
                        authMode === "sign_in"
                          ? "current-password"
                          : "new-password"
                      }
                      minLength={6}
                      required
                    />
                  </label>
                  <button className="button" disabled={submitting}>
                    {submitting
                      ? "Please wait..."
                      : authMode === "sign_in"
                        ? "Sign in and sync"
                        : "Create sync account"}
                  </button>
                </form>
                {authMessage && (
                  <p
                    className={`form-message form-message--${authMessage.tone}`}
                  >
                    {authMessage.text}
                  </p>
                )}
              </>
            )}
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <Database size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Local-first storage</h2>
            <p>
              Banime always writes to this browser first. Cloud sync is an
              additional copy, so tracking remains responsive and usable
              during temporary connection problems.
            </p>
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <Download size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Import or export library</h2>
            <p>
              Merge a Banime JSON backup into this library or download all{" "}
              {items.length} current titles.
            </p>
            <div className="settings-actions">
              <input
                ref={importInput}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => void handleImport(event)}
              />
              <button
                className="button button--compact"
                onClick={() => importInput.current?.click()}
              >
                <Upload size={15} /> Import JSON
              </button>
              <button
                className="button button--ghost button--compact"
                onClick={exportLibrary}
                disabled={!items.length}
              >
                <Download size={15} /> Export JSON
              </button>
            </div>
            {importMessage && (
              <p
                className={`form-message form-message--${importMessage.tone}`}
              >
                {importMessage.text}
              </p>
            )}
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <RefreshCw size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Update schedule</h2>
            <p>
              Banime checks for a newly deployed app version at startup and
              every {intervalMinutes} minutes while open. Airing and seasonal
              anime refresh every 15 minutes. Most Popular refreshes hourly,
              and news and trailers refresh every 2 hours.
            </p>
            <span className="status-pill">
              Last app check:{" "}
              {lastChecked
                ? new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short"
                  }).format(new Date(lastChecked))
                : "waiting for service worker"}
            </span>
          </div>
        </article>
      </section>

      <aside className="api-note">
        <Info size={19} />
        <p>
          Anime catalog, news, and promotional data are provided by Jikan and
          MyAnimeList. Personal tracking data stays local unless you configure
          Supabase and sign in.
        </p>
      </aside>
    </div>
  );
}
