import { RefreshCw } from "./OwnedIcons";

export function ErrorState({
  onRetry,
  message = "Anime data could not be loaded."
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <div className="error-state">
      <span className="error-state__symbol">!</span>
      <div>
        <strong>{message}</strong>
        <p>Check your connection or try again in a moment.</p>
      </div>
      <button className="button button--ghost" onClick={onRetry}>
        <RefreshCw size={16} />
        Retry
      </button>
    </div>
  );
}
