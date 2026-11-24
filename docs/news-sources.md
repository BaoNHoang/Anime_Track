# News sources and tabs

News is public. Select a tab to change the URL; links can open a category
directly, and browser Back/Forward restores the selected category.

| Tab | URL | Content |
| --- | --- | --- |
| Headlines (default) | `/news` or `/news?tab=headlines` | Stories for current-season, upcoming, and popular anime |
| MyAnimeList | `/news?tab=myanimelist` | Paged anime and manga reporting from MyAnimeList through Tenrai |
| Trailers | `/news?tab=trailers` | Up to eight current-season catalog trailer links |
| Anime releases | `/news?tab=anime` | Paged upcoming anime series and films, with catalog premiere dates when known |
| Manga | `/news?tab=manga` | Paged Publishing, Upcoming, and Popular manga feeds |
| Figures | `/news?tab=figures` | Directory of official manufacturer release calendars |

An absent or unrecognized `tab` value opens Headlines. Selecting Headlines
removes the `tab` parameter. In the tab bar, Left/Right arrows move focus and
wrap at either end; Home/End focus the first/last tab. Enter or Space selects
the focused tab. Moving focus alone does not change the active category.

Headlines starts with eight source titles. **Load more news** adds eight at a
time, up to 24 titles, with at most three distinct stories per title. Batches
append without reshuffling earlier stories. **View anime** opens the existing
details drawer for library controls.

Headlines and MyAnimeList share a browser-saved **Hide article previews**
preference. It hides story images and excerpts until individually revealed;
headlines and trailers may still contain spoilers. Story links open the
original publisher, and trailers open their catalog-supplied video destination.

## Reading release dates

Anime premiere dates come from the catalog and may change. Year-only and
month-only dates keep that precision; exact calendar days retain the source's
day across time zones. Unknown dates are shown as unannounced.

Manga cards show the series publication date or date range supplied by Tenrai,
not the release date of an English volume or a chapter schedule. For English
volume availability, follow the publisher calendars linked in Manga:

- [VIZ release calendar](https://www.viz.com/calendar)
- [Seven Seas release dates](https://sevenseasentertainment.com/release-dates/)
- [TOKYOPOP release calendar](https://tokyopop.com/pages/release-calendar)

Figures is an official-calendar directory. Open a manufacturer's page to check
product dates, prices, preorder updates, and regional availability:

- [Good Smile Company shipping calendar](https://www.goodsmile.com/en/releaseinfo):
  Japanese-market shipping information; local sale dates can differ.
- [Kotobukiya products](https://www.kotobukiya.co.jp/en/product/):
  manufacturer product listings with release-month filters.
- [TAMASHII NATIONS monthly schedule](https://tamashiiweb.com/schedule/?wovn=en):
  releases and reservations, with region selection on the manufacturer's site.

Dates and regions remain with the manufacturer; a shipping date or release
month does not guarantee local retail availability.

## Implementation and caching

`src/features/news/NewsPage.tsx` owns URL selection and keyboard navigation.
Each panel is lazy-loaded on first selection, and only the active panel is
mounted. Inactive News panels do not initiate their own source queries.

Panels reuse React Query results and the shared Tenrai response cache while
entries remain fresh. Headlines and MyAnimeList news responses are cached for
15 minutes; manga responses for six hours. Anime releases reuse the existing
upcoming-anime query and cache, and trailers reuse the current-season service.
Figures renders fixed links without fetching manufacturer calendars.

`src/services/tenrai/newsService.ts` and `mangaService.ts` load and map public
catalog data. See the [Tenrai API documentation](https://api.tenrai.org/documentation)
for the provider reference. Maintain the fixed publisher/manufacturer links in
`src/domain/news/releaseSources.ts`; keep release details at their official
sources rather than hardcoding current products, dates, or prices in the app.
