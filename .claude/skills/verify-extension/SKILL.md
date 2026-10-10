---
name: verify-extension
description: Build the extension and verify every feature (velocity, burnup, list view date alerts) on live GitHub pages with the e2e suite, then review the screenshots. Use after dependency updates or feature changes, or when asked to check that the extension still works.
---

# Verify the extension

The e2e suite (`e2e/`, see `e2e/README.md`) loads the built extension into Playwright's Chromium and checks each feature on the public fixture project https://github.com/users/wozaki/projects/4. No token is needed.

## Steps

1. Build and run:

   ```bash
   pnpm exec wxt prepare && pnpm run build
   pnpm exec playwright install chromium   # only if Chromium is missing
   pnpm e2e
   ```

2. Review the screenshots, even when everything passes. Assertions only check that elements render, not that they look right. Read every `test-results/*/test-*.png` and check:
   - **velocity** (`e2e: velocity`): the calculator panel lists iterations with estimates and shows a numeric average.
   - **burnup prediction** (`e2e: burnup prediction`): the predictor panel shows sensible numbers (no `NaN`, totals in the same range as the chart's y-axis), and the overlay lines follow the chart's own series.
   - **burnup warnings**: the period and x-axis charts each show a "Configuration Required" panel with the matching message.
   - **date alerts** (`e2e: date alerts`): the config bar sits above the table; annotations sit next to the dates (or alone in empty cells) and match the table in `e2e/README.md`.

3. If something fails, triage before concluding it's a regression:
   - Run the same suite on a `main` build. If `main` fails the same way, the cause is GitHub or the fixture project, not the change under test. Use the `refresh-page-fixtures` skill.
   - `prediction chart range has not expired` failing means the chart's custom range needs a new end date. Only the user can change it in the GitHub UI, so tell them.
   - A test failing because a chart, view or issue is missing or changed means the fixture project was edited. Compare it with `e2e/README.md`.

4. Report per feature: pass/fail, what the screenshot showed, and anything that looked off even though the test passed.
