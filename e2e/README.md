# E2E tests

Smoke tests that load the built extension into Playwright's Chromium and check each feature on live GitHub pages of the public fixture project [wozaki/projects/4](https://github.com/users/wozaki/projects/4).

They catch what unit tests can't: build/packaging regressions (e.g. after a WXT update), wiring between content scripts and the page, and GitHub-side DOM changes.

## Running locally

```bash
pnpm exec wxt prepare && pnpm run build
pnpm exec playwright install chromium   # first time only
pnpm e2e
```

No token is needed: the fixture project and issues are public and the tests only read them.

Screenshots of every test are saved under `test-results/`. Pass `--headed` to watch the browser.

## CI

`.github/workflows/e2e.yml` runs on pull requests, daily, and on demand. It is not a required check: a failure may come from GitHub rather than the PR. The daily run is what notices GitHub-side changes.

## Fixture project setup

Tests find charts and views by name, so their numbers don't matter. Don't edit these by hand except as described here.

### Charts (Insights → New chart)

| Name | Layout | X-axis | Y-axis | Filter | Period |
|---|---|---|---|---|---|
| `e2e: velocity` | Column | Iteration | Sum of Estimate | (empty) | — |
| `e2e: burnup prediction` | Stacked area | Time | Sum of Estimate | `is:issue milestone:Release` | Custom range, ending in the future |
| `e2e: burnup period warning` | Stacked area | Time | Sum of Estimate | `is:issue milestone:Release` | 3 months |
| `e2e: burnup x-axis warning` | Stacked area | Iteration | Sum of Estimate | `is:issue milestone:Release` | — |

The prediction chart needs a custom range that ends after today. The `prediction chart range has not expired` test fails 30 days before the end date; when it does, move the end date forward (about a year is fine).

### View

`e2e: date alerts`: Table layout, filter `label:e2e`, columns Title / Status / Start Date / End Date, sorted by Title ascending.

### Issues

The issues labeled `e2e` in [wozaki/sandbox-issue](https://github.com/wozaki/sandbox-issue/issues?q=label%3Ae2e) have fixed values, chosen so their alerts never change over time. Done issues are closed; the others are open. None are in the `Release` milestone, which the burnup charts use.

| Title | Status | Start Date | End Date | Expected alerts |
|---|---|---|---|---|
| `[e2e] In progress, age warning` | In Progress | 2026-01-01 | 2099-12-31 | Start `Age Nd` (warning) |
| `[e2e] In progress, age warning and overdue` | In Progress | 2026-01-01 | 2026-02-01 | Start `Age Nd`, End `Overdue Nd` (warning) |
| `[e2e] In progress, missing dates` | In Progress | — | — | Start and End `⚠ Missing` (caution) |
| `[e2e] In progress, missing start` | In Progress | — | 2099-12-31 | Start `⚠ Missing` (caution) |
| `[e2e] In review, age warning` | Review | 2026-01-01 | 2099-12-31 | Start `Age Nd` (warning) |
| `[e2e] Todo, no alerts` | Todo | — | — | None |
| `[e2e] Todo past end date, no alerts` | Todo | — | 2026-02-01 | None (Todo is unclassified once the status mapping is saved) |
| `[e2e] Done, no alerts` | Done | 2026-01-01 | 2026-02-01 | None |
| `[e2e] Done, missing end` | Done | 2026-01-01 | — | End `⚠ Missing` (caution) |

Age thresholds (normal/caution) depend on today's date, so they are covered by unit tests rather than here. To add a case, create an issue with the `e2e` label, add it to project 4 with fixed values, and add it to `DATE_ALERT_ITEMS` in `support/project.ts`.
