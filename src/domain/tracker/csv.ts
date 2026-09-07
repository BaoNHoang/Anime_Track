import type { TrackedAnime } from "./types";
import { LibraryImportError, parseLibraryImport } from "./import";

function cell(value: string) {
  const safe = /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function exportLibraryCsv(items: TrackedAnime[]) {
  return [["title", "status", "episodes_watched", "score", "record_json"],
    ...items.map((item) => [item.anime.titleEnglish || item.anime.title, item.status,
      String(item.progress), String(item.userScore ?? ""), JSON.stringify(item)])]
    .map((row) => row.map(cell).join(",")).join("\r\n");
}
export function parseLibraryCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(value.replace(/\r$/, "")); value = "";
      if (char === "\n") { rows.push(row); row = []; }
    } else value += char;
  }
  if (quoted) throw new LibraryImportError("CSV contains an unfinished quoted field.");
  if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  const index = rows.shift()?.findIndex((header) => header.replace(/^\uFEFF/, "") === "record_json") ?? -1;
  if (index < 0) throw new LibraryImportError("Use a Banime CSV export with a record_json column.");
  try { return parseLibraryImport(rows.filter((entry) => entry.some(Boolean)).map((entry) => JSON.parse(entry[index]))); }
  catch (error) {
    if (error instanceof LibraryImportError) throw error;
    throw new LibraryImportError("CSV contains an invalid library record.");
  }
}
