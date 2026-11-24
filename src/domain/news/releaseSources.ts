/** Fixed official destinations; no user-supplied URLs or third-party scraping. */
export const FIGURE_RELEASE_SOURCES = [
  { name: "Good Smile Company", url: "https://www.goodsmile.com/en/releaseinfo", description: "Shipping dates for Nendoroid, figma, POP UP PARADE, and other distributed figures.", region: "Japan shipping schedule" },
  { name: "Kotobukiya", url: "https://www.kotobukiya.co.jp/en/product/", description: "Upcoming figures and model kits, with release-month and series filters.", region: "Manufacturer release months" },
  { name: "TAMASHII NATIONS", url: "https://tamashiiweb.com/schedule/?wovn=en", description: "Monthly figure releases and reservation schedules from Bandai Spirits.", region: "Choose your region on the calendar" }
] as const;

export const MANGA_RELEASE_SOURCES = [
  { name: "VIZ release calendar", url: "https://www.viz.com/calendar" },
  { name: "Seven Seas release dates", url: "https://sevenseasentertainment.com/release-dates/" },
  { name: "TOKYOPOP release calendar", url: "https://tokyopop.com/pages/release-calendar" }
] as const;
