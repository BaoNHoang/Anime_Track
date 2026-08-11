import { Link } from "react-router-dom";
import { BanimeMark } from "./OwnedIcons";

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Banime home">
      <span className="brand__mark" aria-hidden="true">
        <BanimeMark size={30} />
      </span>
      <span>
        <strong>Banime</strong>
        <small>Anime tracker</small>
      </span>
    </Link>
  );
}
