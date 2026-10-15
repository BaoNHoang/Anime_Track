import { RefreshCw } from "../../components/OwnedIcons";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useTracker } from "../../app/providers/useTracker";

export function LibrarySyncControl() {
  const { user } = useCloudAuth();
  const { isReady, refreshLibrary, syncError, syncStatus } = useTracker();
  if (!user || !isReady) return null;

  return <div className="library-sync">
    <button className="button button--ghost button--compact" type="button"
      disabled={syncStatus === "syncing"}
      onClick={() => void refreshLibrary()}>
      <RefreshCw size={15} /> {syncStatus === "syncing" ? "Syncing…" : "Sync now"}
    </button>
    {syncStatus === "error" && syncError ? <span role="alert">{syncError}</span> : null}
  </div>;
}
