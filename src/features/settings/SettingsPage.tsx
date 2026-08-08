import {
  CheckCircle2,
  Database,
  Download,
  Info,
  MessageSquare,
  Moon,
  PlayCircle,
  RefreshCw,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Upload,
} from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import {
  LibraryImportError,
  parseLibraryImport
} from "../../domain/tracker/import";
import { parseMyAnimeListXml } from "../../domain/tracker/xml";
import { useAppUpdateStatus } from "../../hooks/useAppUpdateStatus";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { useTheme } from "../../app/providers/useTheme";
import { useTracker } from "../../app/providers/useTracker";
import { useWatchProvider } from "../../app/providers/useWatchProvider";
import { enrichTrackedAnimeFromTenrai } from "../../services/tenrai/trackerEnrichment";

export function SettingsPage() {
  const { items, importItems } = useTracker();
  const { user, updateScoreStep } = useCloudAuth();
  const { canInstall, installed, install, isIos } = usePwaInstall();
  const { theme, setTheme } = useTheme();
  const { provider, providerId, providers, setProviderId } =
    useWatchProvider();
  const { lastChecked, intervalMinutes } = useAppUpdateStatus();
  const importInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{
    tone: "success" | "error";
    text: string;
  }>();
  const [importing, setImporting] = useState(false);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreMessage, setScoreMessage] = useState<string>();
  const mcpUrl = import.meta.env.VITE_MCP_URL;

  const saveScoreStep = async (scoreStep: 0.5 | 1) => {
    if (user?.scoreStep === scoreStep) return;
    setScoreSaving(true);
    setScoreMessage(undefined);
    const result = await updateScoreStep(scoreStep);
    setScoreSaving(false);
    setScoreMessage(
      result.error ?? result.message ?? "Scoring preference updated."
    );
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
        <p>Control how Banime looks, scores, stores, and opens your library.</p>
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
            <SlidersHorizontal size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Personal score increments</h2>
            <p>Choose the level of precision used when you score anime.</p>
            <div className="score-step-options" aria-label="Personal score increment">
              <button
                className={user?.scoreStep === 1 ? "is-active" : ""}
                onClick={() => void saveScoreStep(1)}
                disabled={scoreSaving}
              >
                <strong>Whole numbers</strong>
                <span>1, 2, 3 ... 10</span>
              </button>
              <button
                className={user?.scoreStep !== 1 ? "is-active" : ""}
                onClick={() => void saveScoreStep(0.5)}
                disabled={scoreSaving}
              >
                <strong>Half steps</strong>
                <span>1, 1.5, 2 ... 10</span>
              </button>
            </div>
            {scoreMessage && <p className="settings-hint">{scoreMessage}</p>}
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
