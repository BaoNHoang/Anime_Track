import { Play } from "lucide-react";

export function Brand() {
  return (
    <div className="brand" aria-label="Banime home">
      <span className="brand__mark" aria-hidden="true">
        <Play size={15} fill="currentColor" />
      </span>
      <span>
        <strong>Banime</strong>
        <small>Anime tracker</small>
      </span>
    </div>
  );
}
