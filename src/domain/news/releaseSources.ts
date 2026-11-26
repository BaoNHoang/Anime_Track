/** Fixed official destinations; no user-supplied URLs or third-party scraping. */
export const FIGURE_RELEASE_SOURCES = [
  { name: "Good Smile Company", url: "https://www.goodsmile.com/en/releaseinfo", description: "Shipping dates for Nendoroid, figma, POP UP PARADE, and other distributed figures.", region: "Japan shipping schedule" },
  { name: "Kotobukiya", url: "https://www.kotobukiya.co.jp/en/product/", description: "Upcoming figures and model kits, with release-month and series filters.", region: "Manufacturer release months" },
  { name: "TAMASHII NATIONS", url: "https://tamashiiweb.com/schedule/?wovn=en", description: "Monthly figure releases and reservation schedules from Bandai Spirits.", region: "Choose your region on the calendar" }
] as const;

export const MANGA_RELEASE_SOURCES = [
  { name: "VIZ", url: "https://www.viz.com/calendar", description: "Upcoming manga volumes and books, organized by release month." },
  { name: "Seven Seas", url: "https://sevenseasentertainment.com/release-dates/", description: "Upcoming print volumes and books with publisher release dates." },
  { name: "TOKYOPOP", url: "https://tokyopop.com/pages/release-calendar", description: "New manga volumes and upcoming publication dates." }
] as const;
