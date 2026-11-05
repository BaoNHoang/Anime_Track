export type HolidaySeason = "halloween" | "thanksgiving" | "christmas";

// Use the viewer's local calendar so the scene changes at their midnight.
export function getHolidaySeason(date: Date): HolidaySeason | null {
  switch (date.getMonth()) {
    case 9:
      return "halloween";
    case 10:
      return "thanksgiving";
    case 11:
      return "christmas";
    default:
      return null;
  }
}

export function millisecondsUntilNextLocalDay(date: Date): number {
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return Math.max(1, nextDay.getTime() - date.getTime());
}
