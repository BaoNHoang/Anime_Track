import { Database, Download, Info, Smartphone } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="page-stack settings-page">
      <header className="page-heading">
        <span className="eyebrow">Preferences & data</span>
        <h1>Settings</h1>
        <p>Manage how your private tracker behaves on this device.</p>
      </header>

      <section className="settings-grid">
        <article className="settings-card">
          <span className="settings-card__icon">
            <Smartphone size={22} />
          </span>
          <div>
            <h2>Install on your device</h2>
            <p>
              Use your browser’s “Add to Home Screen” action for an app-like
              mobile experience.
            </p>
          </div>
        </article>
        <article className="settings-card">
          <span className="settings-card__icon">
            <Database size={22} />
          </span>
          <div>
            <h2>Local storage</h2>
            <p>
              Your watch history is stored only in this browser. Cloud sync can
              be added later behind the same repository interface.
            </p>
          </div>
        </article>
        <article className="settings-card is-muted">
          <span className="settings-card__icon">
            <Download size={22} />
          </span>
          <div>
            <h2>Export library</h2>
            <p>Portable JSON backup is planned for the next iteration.</p>
          </div>
          <span className="coming-soon">Coming soon</span>
        </article>
      </section>

      <aside className="api-note">
        <Info size={19} />
        <p>
          Catalog data is provided by the unofficial Jikan API and
          MyAnimeList. This app does not require a Jikan API key.
        </p>
      </aside>
    </div>
  );
}
