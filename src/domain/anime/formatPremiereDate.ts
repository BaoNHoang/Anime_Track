const monthFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

/** Catalog premiere dates are calendar dates and may have only year/month precision. */
export function formatPremiereDate(value?: string): string | undefined {
  if (!value || !/^\d{4}(?:-\d{2}(?:-\d{2}(?:T.*)?)?)?$/.test(value)) return undefined;
  const year = Number(value.slice(0, 4));
  if (year < 1) return undefined;
  if (value.length === 4) return String(year);
  const month = Number(value.slice(5, 7));
  if (month < 1 || month > 12) return undefined;
  const prefix = value.length === 7 ? `${value}-01` : value.slice(0, 10);
  const date = new Date(`${prefix}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.getUTCMonth() + 1 !== month ||
    (value.length > 7 && date.getUTCDate() !== Number(value.slice(8, 10)))) return undefined;
  if (value.length > 10 && !Number.isFinite(Date.parse(value))) return undefined;
  return (value.length === 7 ? monthFormatter : dayFormatter).format(date);
}
