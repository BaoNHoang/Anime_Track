# Home mobile performance baseline

Run `npm run build`, start `npm run preview -- --host 127.0.0.1 --port 4173`,
then run `npm run perf:home -- http://127.0.0.1:4173/ 3`. The script opens a
fresh Pixel 7 browser context for each run, disables the browser cache and
service worker, applies 4x CPU throttling and a 150 ms / 1.6 Mbps connection,
waits six seconds after Home loads, and times navigation to Discover. Keep this
profile unchanged when comparing code changes.

Baseline on `main` at `5bfa165` (three cold runs, median):

| Measure | Baseline |
| --- | ---: |
| First contentful paint | 1,652 ms |
| Largest contentful paint | 4,316 ms |
| Cumulative layout shift | 0.263 |
| Long-task blocking, TBT-like proxy | 188 ms |
| Discover navigation readiness | 497 ms |
| Home requests during sample | 29 total, 3 catalog |
| Main JavaScript output | 408.19 kB, 126.32 kB gzip |

After deferring the anime detail panel (same three-run profile):

| Measure | Baseline | Deferred panel |
| --- | ---: | ---: |
| First contentful paint | 1,652 ms | 1,632 ms |
| Largest contentful paint | 4,316 ms | 4,288 ms |
| Cumulative layout shift | 0.263 | 0.254 |
| Long-task blocking, TBT-like proxy | 188 ms | 194 ms |
| Discover navigation readiness | 497 ms | 603 ms |
| Home requests during sample | 29 total, 3 catalog | 30 total, 3 catalog |
| Main JavaScript output | 408.19 kB, 126.32 kB gzip | 397.77 kB, 123.61 kB gzip |

The panel is now a separate 11.17 kB chunk (3.68 kB gzip), downloaded only
when a title is opened. The main chunk shrank by 10.42 kB (2.71 kB gzip).
The small metric differences are within the noise of these three local runs;
this experiment shows a bundle reduction, not a proven loading improvement.

The first navigation sample was an outlier at 10.7 seconds; the other two were
434 and 497 ms. These are local lab values, not real-user Core Web Vitals or
Interaction to Next Paint (INP). The navigation timing includes automation
overhead. Catalog data and images can vary between runs; compare several
samples and inspect their request counts before attributing a change to code.
The elevated lab LCP and CLS merit investigation, but a bundle-size reduction
alone is not proof that either metric improved.

For field data, check the deployed Home URL in Chrome DevTools or PageSpeed
Insights and compare the 75th percentile before prioritizing further work.
See [Google's Web Vitals measurement guide](https://web.dev/articles/vitals-measurement-getting-started).
