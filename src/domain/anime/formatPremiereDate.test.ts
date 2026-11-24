import { afterEach, expect, it, vi } from "vitest";
import { formatPremiereDate } from "./formatPremiereDate";

afterEach(() => vi.unstubAllEnvs());

it("preserves year/month precision and the publisher's calendar day across time zones", () => {
  vi.stubEnv("TZ", "America/New_York");
  expect(formatPremiereDate("2027")).toBe("2027");
  expect(formatPremiereDate("2027-04")).toBe("Apr 2027");
  expect(formatPremiereDate("2027-04-01")).toBe("Apr 1, 2027");
  expect(formatPremiereDate("2027-04-01T00:00:00Z")).toBe("Apr 1, 2027");
  expect(formatPremiereDate("2027-04-01T00:00:00+09:00")).toBe("Apr 1, 2027");
});

it("leaves unknown and invalid dates unannounced", () => {
  for (const value of [undefined, "TBA", "0000", "2027-13", "2027-02-30", "2027-04-01Tbad"]) {
    expect(formatPremiereDate(value)).toBeUndefined();
  }
});
