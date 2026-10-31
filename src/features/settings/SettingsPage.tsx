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
} from "../../components/OwnedIcons";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  LibraryImportError,
  MAX_LIBRARY_ITEMS,
  parseLibraryImport
} from "../../domain/tracker/import";
import { exportLibraryCsv, parseLibraryCsv } from "../../domain/tracker/csv";
import { parseMyAnimeListXml } from "../../domain/tracker/xml";
import { previewLibraryImport } from "../../domain/tracker/importPreview";
import type { TrackedAnime } from "../../domain/tracker/types";
import { useAppUpdateStatus } from "../../hooks/useAppUpdateStatus";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import type { ScoreScale, ScoreStep } from "../../domain/tracker/score";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { useTheme } from "../../app/providers/useTheme";
import { useTracker } from "../../app/providers/useTracker";
import { useWatchProvider } from "../../app/providers/useWatchProvider";
import { getStreamingRegionLabel, STREAMING_REGIONS } from "../../domain/watch/providers";
import { enrichTrackedAnimeFromTenrai } from "../../services/tenrai/trackerEnrichment";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushCapability,
  type PushCapability
} from "../../services/push/pushSubscription";

export function SettingsPage() {
  const { items, canManage, importItems, undoImport } = useTracker();
  const { configured, user, updateScoringPreferences } = useCloudAuth();
  const { profile: localProfile, updateProfile } = useLocalProfile();
  const scoreStep = user?.scoreStep ?? localProfile.scoreStep;
  const scoreScale = user?.scoreScale ?? localProfile.scoreScale;
  const { canInstall, installed, install, isIos } = usePwaInstall();
  const { theme, setTheme, colorScheme, setColorScheme, animeTheme, setAnimeTheme } = useTheme();
  const { region, setRegion } = useWatchProvider();
  const { lastChecked, intervalMinutes } = useAppUpdateStatus();
  const importInput = useRef<HTMLInputElement>(null);
  const importAbort = useRef<AbortController | undefined>(undefined);
  const [pendingImport, setPendingImport] = useState<{
    name: string; format: "mal" | "banime"; items: TrackedAnime[];
  }>();
  const preview = useMemo(() => pendingImport
    ? previewLibraryImport(items, pendingImport.items)
    : undefined, [items, pendingImport]);
  const [importUndoToken, setImportUndoToken] = useState<number>();
  const [importMessage, setImportMessage] = useState<{
    tone: "success" | "error";
    text: string;
  }>();
  const [importing, setImporting] = useState(false);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreMessage, setScoreMessage] = useState<string>();
  const [pushCapability, setPushCapability] = useState<PushCapability>("unsupported");
  const [pushMessage, setPushMessage] = useState<string>();
  const [pushSaving, setPushSaving] = useState(false);
  const mcpUrl = import.meta.env.VITE_MCP_URL;

  useEffect(() => {
    void getPushCapability()
      .then(setPushCapability)
      .catch(() => setPushCapability("unsupported"));
  }, []);

  const updatePush = async () => {
    if (!user) return;
    setPushSaving(true);
    setPushMessage(undefined);
    try {
      if (pushCapability === "enabled") {
        await disablePushNotifications(user.id);
      } else {
        await enablePushNotifications(user.id);
      }
      setPushCapability(await getPushCapability());
    } catch (failure) {
      setPushMessage(
        failure instanceof Error
          ? failure.message
          : "Push notifications could not be updated."
      );
      setPushCapability(
        await getPushCapability().catch((): PushCapability => "unsupported")
      );
    } finally {
      setPushSaving(false);
    }
  };

  const saveScoringPreferences = async (nextStep: ScoreStep, nextScale: ScoreScale) => {
    if (scoreStep === nextStep && scoreScale === nextScale) return;
    if (!configured) {
      updateProfile({ scoreStep: nextStep, scoreScale: nextScale });
      setScoreMessage("Scoring preference updated on this device.");
      return;
    }
    if (!user) return;
    setScoreSaving(true);
    setScoreMessage(undefined);
    const result = await updateScoringPreferences(nextStep, nextScale);
    setScoreSaving(false);
    setScoreMessage(
      result.error ?? result.message ?? "Scoring preference updated."
    );
  };

  const exportLibrary = (format: "json" | "csv" = "json") => {
    const payload = format === "csv" ? exportLibraryCsv(items) : JSON.stringify(
      {
        app: "Banime",
        exportedAt: new Date().toISOString(),
        items
      },
      null,
      2
    );
    const url = URL.createObjectURL(
      new Blob([payload], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `banime-library-${new Date()
      .toISOString()
      .slice(0, 10)}.${format}`;
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

    setPendingImport(undefined);
    setImportMessage(undefined);
    setImporting(true);
    try {
      const text = await file.text();
      const trimmedText = text.trimStart();

      if (file.name.toLowerCase().endsWith(".csv") || trimmedText.startsWith("{") || trimmedText.startsWith("[")) {
        const imported = file.name.toLowerCase().endsWith(".csv") ? parseLibraryCsv(text) : parseLibraryImport(JSON.parse(text) as unknown);
        setPendingImport({ name: file.name, format: "banime", items: imported });
      } else {
        const parsedMalItems = parseMyAnimeListXml(text);
        setPendingImport({ name: file.name, format: "mal", items: parsedMalItems });
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

  const confirmImport = async () => {
    if (!pendingImport || !canManage || !preview || preview.total > MAX_LIBRARY_ITEMS) return;
    const selection = pendingImport;
    setPendingImport(undefined);
    setImporting(true);
    let saved: ReturnType<typeof importItems>;
    try {
      saved = importItems(selection.items);
    } catch {
      setImportMessage({ tone: "error", text: "The import could not be saved. Check available device storage and try again." });
      setImporting(false);
      return;
    }
    if (!saved.applied || saved.undoToken === undefined) {
      setImportMessage({ tone: "error", text: "The import could not be saved. Review your library and try again." });
      setImporting(false);
      return;
    }
    const undoToken = saved.undoToken;
    setImportUndoToken(undoToken);
    if (selection.format === "banime") {
      setImportMessage({
        tone: "success",
        text: `Imported ${saved.added} new and ${saved.updated} newer titles. Your library now has ${saved.total}.`
      });
      setImporting(false);
      return;
    }

    const controller = new AbortController();
    importAbort.current = controller;
    setImportMessage({
      tone: "success",
      text: `Saved ${saved.added} new and ${saved.updated} newer titles. Checking catalog posters and details…`
    });
    try {
      const enrichment = await enrichTrackedAnimeFromTenrai(selection.items, {
        signal: controller.signal,
        onProgress: ({ completed, total, enriched, failed }) => {
          if (completed === 1 || completed % 10 === 0 || completed === total) {
            setImportMessage({
              tone: "success",
              text: `Checking catalog ${completed}/${total}. Updated ${enriched}; ${failed} kept from MyAnimeList.`
            });
          }
        }
      });
      if (controller.signal.aborted) return;
      const enriched = importItems(enrichment.items, {
        replaceOnEqualUpdatedAt: true,
        continueUndoToken: undoToken
      });
      setImportMessage({
        tone: "success",
        text: enriched.applied
          ? `Catalog check complete: ${enrichment.enriched} updated, ${enrichment.failed} kept from MyAnimeList. Undo is still available.`
          : "Import saved. Catalog details were not applied because the library changed or no new details were available."
      });
    } catch {
      if (!controller.signal.aborted) {
        setImportMessage({ tone: "error", text: "Imported titles are saved, but catalog details could not finish loading." });
      }
    } finally {
      if (importAbort.current === controller) importAbort.current = undefined;
      setImporting(false);
    }
  };

  const rollBackImport = () => {
    if (importUndoToken === undefined) return;
    importAbort.current?.abort();
    let restored = false;
    try { restored = undoImport(importUndoToken); } catch { /* Keep the error visible below. */ }
    setImportUndoToken(undefined);
    setImportMessage(restored
      ? { tone: "success", text: "Import undone. Your previous library has been restored." }
      : { tone: "error", text: "This import cannot be undone after other library changes. Restore an earlier export if needed." });
  };

  return (
    <div className="page-stack settings-page">
      <h1 className="visually-hidden">Settings</h1>

      <section className="settings-grid">
        <article className="settings-card">
          <span className="settings-card__icon">
            {theme === "dark" ? <Moon size={22} /> : <Sun size={22} />}
          </span>
          <div className="settings-card__content">
            <h2>Appearance</h2>
            <p>Choose a brightness and look for this device.</p>
            <div className="theme-options" role="group" aria-label="Brightness">
              <button
                type="button"
                className={theme === "light" ? "is-active" : ""}
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
              >
                <Sun size={15} /> Light
              </button>
              <button
                type="button"
                className={theme === "dark" ? "is-active" : ""}
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
              >
                <Moon size={15} /> Dark
              </button>
            </div>
            <div className="palette-options" role="group" aria-label="Color palette">
              {(["sakura", "ocean", "wisteria"] as const).map((scheme) => (
                <button
                  key={scheme}
                  type="button"
                  className={`palette-option palette-option--${scheme}${animeTheme === "seasonal" && colorScheme === scheme ? " is-active" : ""}`}
                  aria-pressed={animeTheme === "seasonal" && colorScheme === scheme}
                  onClick={() => { setColorScheme(scheme); setAnimeTheme("seasonal"); }}
                >
                  <span className="palette-option__preview" aria-hidden="true">
                    <span /><span />
                  </span>
                  <strong>{scheme === "sakura" ? "Sakura" : scheme === "ocean" ? "Ocean" : "Wisteria"}</strong>
                </button>
              ))}
            </div>
            <h3 className="appearance-subtitle">Anime-inspired backgrounds</h3>
            <p>Original scenery inspired by favorite worlds. Seasonal keeps the rotating anime posters.</p>
            <div className="anime-theme-options" role="group" aria-label="Anime-inspired background">
              {([
                { id: "seasonal", name: "Seasonal", detail: "Rotating posters" },
                { id: "aot", name: "Attack on Titan", detail: "Walls at dusk" },
                { id: "one-piece", name: "One Piece", detail: "Open sea" },
                { id: "demon-slayer", name: "Demon Slayer", detail: "Wisteria night" },
                { id: "mushoku-tensei", name: "Mushoku Tensei", detail: "Fantasy fields" }
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`anime-theme-option anime-theme-option--${option.id}${animeTheme === option.id ? " is-active" : ""}`}
                  aria-pressed={animeTheme === option.id}
                  onClick={() => setAnimeTheme(option.id)}
                >
                  <span className="anime-theme-option__scene" aria-hidden="true" />
                  <span className="anime-theme-option__label"><strong>{option.name}</strong><small>{option.detail}</small></span>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <SlidersHorizontal size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Personal scores</h2>
            <p>Choose a 10- or 100-point scale. Existing scores keep their value when you switch.</p>
            <div className="score-step-options" role="group" aria-label="Personal score scale">
              <button
                type="button"
                className={scoreScale === 10 ? "is-active" : ""}
                aria-pressed={scoreScale === 10}
                onClick={() => void saveScoringPreferences(scoreStep, 10)}
                disabled={scoreSaving || (configured && !user)}
              >
                <strong>Out of 10</strong>
                <span>1 to 10</span>
              </button>
              <button
                type="button"
                className={scoreScale === 100 ? "is-active" : ""}
                aria-pressed={scoreScale === 100}
                onClick={() => void saveScoringPreferences(scoreStep, 100)}
                disabled={scoreSaving || (configured && !user)}
              >
                <strong>Out of 100</strong>
                <span>1 to 100</span>
              </button>
            </div>
            <p>Score increment</p>
            <div className="score-step-options" role="group" aria-label="Personal score increment">
              <button
                type="button"
                className={scoreStep === 1 ? "is-active" : ""}
                aria-pressed={scoreStep === 1}
                onClick={() => void saveScoringPreferences(1, scoreScale)}
                disabled={scoreSaving || (configured && !user)}
              >
                <strong>Whole numbers</strong>
                <span>1, 2, 3 ... {scoreScale}</span>
              </button>
              <button
                type="button"
                className={scoreStep === 0.5 ? "is-active" : ""}
                aria-pressed={scoreStep === 0.5}
                onClick={() => void saveScoringPreferences(0.5, scoreScale)}
                disabled={scoreSaving || (configured && !user)}
              >
                <strong>Half steps</strong>
                <span>1, 1.5, 2 ... {scoreScale}</span>
              </button>
            </div>
            {configured && !user && <p className="settings-hint">Sign in to change scoring preferences.</p>}
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
            <CheckCircle2 size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Device notifications</h2>
            <p>
              {!configured
                ? "Sign in to receive release alerts on this device."
                : pushCapability === "enabled"
                  ? "This browser receives episode-release alerts, even when Banime is closed."
                  : pushCapability === "denied"
                    ? "Browser notifications are blocked for Banime. Change the site permission in your browser settings to enable them."
                    : pushCapability === "unsupported"
                      ? "This browser does not support web push notifications."
                      : "Receive episode-release alerts on this browser or installed Banime app, even while it is closed."}
            </p>
            {configured && user && pushCapability !== "unsupported" && pushCapability !== "denied" && (
              <button className="button button--compact" type="button" onClick={() => void updatePush()} disabled={pushSaving}>
                {pushSaving
                  ? "Saving…"
                  : pushCapability === "enabled"
                    ? "Turn off on this device"
                    : "Enable device notifications"}
              </button>
            )}
            {pushMessage && <p className="form-message form-message--error" role="alert">{pushMessage}</p>}
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
            <h2>Streaming region</h2>
            <p>
              Choose the region used to label official availability. Catalog
              links are provider-supplied; language and catalog access can vary.
            </p>
            <label className="field settings-select">
              <span>Viewing availability for</span>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                {STREAMING_REGIONS.map(([id, label]) => (
                  <option value={id} key={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="settings-hint">Availability displayed for {getStreamingRegionLabel(region)}.</p>
          </div>
        </article>

        <article className="settings-card">
          <span className="settings-card__icon">
            <Download size={22} />
          </span>
          <div className="settings-card__content">
            <h2>Import or export library</h2>
            <p>
              Review changes before importing a MyAnimeList XML or Banime JSON/CSV file.
              MyAnimeList titles are saved first, then checked for catalog details.
            </p>
            <div className="settings-actions">
              <input
                ref={importInput}
                className="visually-hidden"
                type="file"
                accept="application/xml,text/xml,application/json,text/csv,.xml,.json,.csv"
                onChange={(event) => void handleImport(event)}
              />
              <button
                className="button button--compact"
                onClick={() => importInput.current?.click()}
                disabled={importing}
              >
                <Upload size={15} />
                {importing ? "Working…" : "Choose import file"}
              </button>
              <button
                className="button button--ghost button--compact"
                onClick={() => exportLibrary()}
                disabled={!items.length || importing}
              >
                <Download size={15} /> Export JSON
              </button>
            </div>
            <button className="button button--compact" disabled={!items.length} onClick={() => exportLibrary("csv")}>Export CSV</button>
            <p>Import MyAnimeList XML or Banime JSON/CSV. JSON and CSV retain episode history, custom lists, and preferences.</p>
            {pendingImport && preview ? <div className="import-preview" role="region" aria-label="Review library import">
              <h3>Review {pendingImport.name}</h3>
              <p><strong>{preview.added}</strong> new · <strong>{preview.updated}</strong> newer · <strong>{preview.unchanged}</strong> unchanged</p>
              <p>Your library would contain {preview.total} titles. Nothing changes until you confirm. Undo is available in this session until another library edit.</p>
              {preview.total > MAX_LIBRARY_ITEMS ? <p className="form-message form-message--error">The combined library would exceed the {MAX_LIBRARY_ITEMS}-title limit. Remove titles before importing.</p> : null}
              {preview.examples.length ? <p className="import-preview__examples">Including {preview.examples.join(", ")}{preview.added + preview.updated > preview.examples.length ? "…" : ""}</p> : null}
              <div className="settings-actions">
                <button className="button button--compact" type="button" disabled={importing || !canManage || !(preview.added + preview.updated) || preview.total > MAX_LIBRARY_ITEMS} onClick={() => void confirmImport()}>Confirm import</button>
                <button className="button button--ghost button--compact" type="button" onClick={() => setPendingImport(undefined)}>Cancel</button>
              </div>
            </div> : null}
            {importUndoToken !== undefined ? <button className="button button--ghost button--compact" type="button"
              onClick={rollBackImport}>Undo last import</button> : null}
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
