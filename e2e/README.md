# E2E tests

Smoke tests that load the built extension into Playwright's Chromium and check each feature on live GitHub pages of the public fixture project [wozaki/projects/4](https://github.com/users/wozaki/projects/4).

They catch what unit tests can't: build/packaging regressions (e.g. after a WXT update), wiring between content scripts and the page, and GitHub-side DOM changes.

## Running locally

```bash
pnpm exec wxt prepare && pnpm run build
pnpm exec playwright install chromium   # first time only
pnpm e2e
```

Before the tests run, `global-setup.ts` rewrites the Date Field Alerts fixture items so their dates are relative to today. It needs a token with the `project` and `repo` scopes: `E2E_GITHUB_TOKEN`, or your `gh` login (`gh auth refresh -s project`). Set `E2E_SKIP_SEED=1` to skip it.

Screenshots of every test are saved under `test-results/`. Pass `--headed` to watch the browser.

## CI

`.github/workflows/e2e.yml` runs on pull requests, daily, and on demand. It is not a required check: a failure may come from GitHub rather than the PR. The daily run is what notices GitHub-side changes.

The workflow needs the repository secret `E2E_GITHUB_TOKEN`: a classic personal access token with the `project` and `repo` scopes (fine-grained tokens can't access user-owned projects).

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

The issues labeled `e2e` in [wozaki/sandbox-issue](https://github.com/wozaki/sandbox-issue/issues?q=label%3Ae2e) are listed with their expected alerts in `support/project.ts`. Issues with status Done must be closed; the others must be open. They must not be in the `Release` milestone, which the burnup charts use.

To add a case, create the issue with the `e2e` label, then add it to `DATE_ALERT_ITEMS`. The seed adds it to the project on the next run.
