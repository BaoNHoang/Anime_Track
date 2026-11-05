import { describe, expect, it } from "vitest";
import { getHolidaySeason, millisecondsUntilNextLocalDay } from "./holidaySeason";

describe("holiday season", () => {
  it("uses the viewer's calendar for the three holiday months", () => {
    expect(getHolidaySeason(new Date(2026, 8, 30))).toBeNull();
    expect(getHolidaySeason(new Date(2026, 9, 1))).toBe("halloween");
    expect(getHolidaySeason(new Date(2026, 9, 31))).toBe("halloween");
    expect(getHolidaySeason(new Date(2026, 10, 1))).toBe("thanksgiving");
    expect(getHolidaySeason(new Date(2026, 10, 30))).toBe("thanksgiving");
    expect(getHolidaySeason(new Date(2026, 11, 1))).toBe("christmas");
    expect(getHolidaySeason(new Date(2026, 11, 31))).toBe("christmas");
    expect(getHolidaySeason(new Date(2027, 0, 1))).toBeNull();
  });

  it("schedules the next check at local midnight", () => {
    expect(millisecondsUntilNextLocalDay(new Date(2026, 10, 30, 23, 59, 30))).toBe(30_000);
  });
});
