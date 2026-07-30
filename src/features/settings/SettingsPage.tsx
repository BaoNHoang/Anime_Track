import {
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Info,
  LogOut,
  MessageSquare,
  Moon,
  PlayCircle,
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
import { parseMyAnimeListXml } from "../../domain/tracker/xml";
import { useAppUpdateStatus } from "../../hooks/useAppUpdateStatus";
import { useCloudAuth } from "../../hooks/useCloudAuth";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { useTheme } from "../../hooks/useTheme";
import { useTracker } from "../../hooks/useTracker";
import { useWatchProvider } from "../../hooks/useWatchProvider";
import { enrichTrackedAnimeFromTenrai } from "../../services/tenrai/trackerEnrichment";

type AuthMode = "sign_in" | "sign_up";

export function SettingsPage() {
  const { items, syncStatus, syncError, importItems } = useTracker();
  const { configured, initialized, user, signIn, signUp, signOut } =
    useCloudAuth();
  const { canInstall, installed, install, isIos } = usePwaInstall();
  const { theme, setTheme } = useTheme();
  const { provider, providerId, providers, setProviderId } =
    useWatchProvider();
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
  const [importing, setImporting] = useState(false);
  const mcpUrl = import.meta.env.VITE_MCP_URL;

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

    setImporting(true);
    try {
      const text = await file.text();
      const trimmedText = text.trimStart();

      if (trimmedText.startsWith("{") || trimmedText.startsWith("[")) {
        const imported = parseLibraryImport(JSON.parse(text) as unknown);
        const result = importItems(imported);
        setImportMessage({
          tone: "success",
          text: `Imported ${result.added} new and ${result.updated} newer title${
            result.added + result.updated === 1 ? "" : "s"
          }. Your library now has ${result.total}.`
        });
      } else {
        const parsedMalItems = parseMyAnimeListXml(text);
        const savedResult = importItems(parsedMalItems);
        setImportMessage({
          tone: "success",
          text: `Saved ${savedResult.added} new and ${savedResult.updated} newer MyAnimeList title${
            savedResult.added + savedResult.updated === 1 ? "" : "s"
          } locally. Checking Tenrai for posters and details for ${parsedMalItems.length} title${
            parsedMalItems.length === 1 ? "" : "s"
          }...`
        });

        const enrichment = await enrichTrackedAnimeFromTenrai(parsedMalItems, {
          onProgress: ({ completed, total, enriched, failed }) => {
            if (completed === 1 || completed % 10 === 0 || completed === total) {
              setImportMessage({
                tone: "success",
                text: `Checking Tenrai ${completed}/${total}. Updated ${enriched}; ${failed} kept from MyAnimeList only.`
              });
            }
          }
        });
        const enrichedResult = importItems(enrichment.items, {
          replaceOnEqualUpdatedAt: true
        });
        const enrichmentMessage = `Checked Tenrai for ${enrichment.enriched + enrichment.failed} title${
          enrichment.enriched + enrichment.failed === 1 ? "" : "s"
        }; updated ${enrichment.enriched} with current catalog details${
          enrichment.failed ? ` and kept ${enrichment.failed} from MyAnimeList only` : ""
        }.`;
        setImportMessage({
          tone: "success",
          text: `${enrichmentMessage} Your library now has ${enrichedResult.total}.`
        });
      }
    } catch (error) {
      setImportMessage({
        tone: "error",
        text:
          error instanceof LibraryImportError
            ? error.message
            : "This file is not a valid MyAnimeList XML export or Banime JSON backup."
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-stack settings-page">
      <header className="page-heading">
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
                      maxLength={320}
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
                      maxLength={128}
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
            <MessageSquare size={22} />
          </span>
          <div className="settings-card__content">
            <h2>ChatGPT connection</h2>
            <p>
              Banime includes an MCP server that lets ChatGPT search Tenrai,
              read your synced library, update tracking, and recommend anime.
              Library actions require your Banime sign-in and approval.
            </p>
            {mcpUrl ? (
              <>
                <span className="status-pill status-pill--success">
                  <CheckCircle2 size={14} /> MCP endpoint configured
                </span>
                <code className="settings-code">{mcpUrl}</code>
              </>
            ) : (
              <p className="settings-hint">
                Deploy the MCP server, then set <code>VITE_MCP_URL</code> to
                its public HTTPS <code>/mcp</code> URL.
              </p>
            )}
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <PlayCircle size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Watch links</h2>
            <p>
              Choose where Banime opens "Find on" links from your library and
              anime detail pages. Banime opens external search or availability
              pages only; it does not host episodes.
            </p>
            <label className="field settings-select">
              <span>Current provider</span>
              <select
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
              >
                {providers.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="settings-hint">{provider.note}</p>
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <Download size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Import or export library</h2>
            <p>
              Import a MyAnimeList XML export. Banime will check Tenrai for
              posters and details before saving. You can still export your
              Banime library as JSON.
            </p>
            <div className="settings-actions">
              <input
                ref={importInput}
                className="visually-hidden"
                type="file"
                accept="application/xml,text/xml,application/json,.xml,.json"
                onChange={(event) => void handleImport(event)}
              />
              <button
                className="button button--compact"
                onClick={() => importInput.current?.click()}
                disabled={importing}
              >
                <Upload size={15} />
                {importing ? "Importing..." : "Import MAL XML"}
              </button>
              <button
                className="button button--ghost button--compact"
                onClick={exportLibrary}
                disabled={!items.length || importing}
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
              anime refresh every 15 minutes. Most Popular refreshes every 6
              hours, and news and trailers refresh every 2 hours.
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
          Anime catalog and news are sourced from MyAnimeList and provided by
          Tenrai. Personal tracking data stays local unless you configure
          Supabase and sign in.
        </p>
      </aside>
    </div>
  );
}
