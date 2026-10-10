---
name: refresh-page-fixtures
description: Handle GitHub-side page changes. Use when the daily E2E workflow fails, or e2e fails on main too. Triages the cause, re-captures fixtures/github-pages, fixes the extension's readers against the new markup, and opens a PR.
---

# Refresh page fixtures after GitHub changes

The extension reads GitHub's DOM and embedded JSON, which GitHub can change at any time. The daily `E2E` workflow catches this. This skill turns a failure into a fix.

Background: `e2e/README.md` (fixture project, captures) and `fixtures/github-pages/` (captured pages used by `real-page.test.ts` unit tests).

## 1. Triage

Find the failing run and read its log and report artifact:

```bash
gh run list -w E2E --limit 5
gh run view <run-id> --log-failed
gh run download <run-id> -n playwright-report -D <scratchpad>/e2e-report
```

Look at the screenshots in the artifact. Then reproduce locally on a `main` build with `pnpm run build && pnpm e2e`. Classify the failure:

| Cause | Signs | Action |
|---|---|---|
| Fixture project edited | A chart, view or issue is missing or renamed, or its values differ from `e2e/README.md` | Ask the user to restore it. Don't change tests to match. |
| Prediction chart expired | `prediction chart range has not expired` fails | Ask the user to move the chart's custom range end date about a year ahead |
| GitHub outage or flake | Timeouts or error pages in screenshots; passes on re-run | Re-run the workflow and stop |
| GitHub markup changed | Extension UI missing or wrong on pages that otherwise look normal | Continue to step 2 |

## 2. Re-capture

```bash
pnpm fixtures:capture
git diff --stat fixtures/github-pages
pnpm run test:run
```

Captures are deterministic, so the diff shows only real changes plus the header date. Read the diff and work out what GitHub changed: class names, roles, attributes, JSON shape, SVG structure. The `real-page.test.ts` failures point at the reader that broke.

## 3. Fix the readers

Fix the reader modules (`table-scraper.ts`, `memex-data.ts`, `svg-extractor.ts`, `chart-type-detector.ts`, `chart-config-validator.ts`, …) until the unit tests pass. Prefer selectors that survive cosmetic changes: roles, stable attributes, `[class*="module__Name"]` prefixes rather than hashed suffixes. Keep compatibility with the old markup only if GitHub may still serve it, for example during a gradual rollout.

If the change needs a product decision (a feature can no longer work the same way), stop and explain the options to the user.

## 4. Verify and open a PR

1. `pnpm run lint && pnpm run typecheck && pnpm run test:run`.
2. Build and run e2e with the `verify-extension` skill, including the screenshot review.
3. Open a PR in English: what GitHub changed (with a fixture diff excerpt), how the readers adapt, and the verification done. Commit the refreshed fixtures in the same PR.
