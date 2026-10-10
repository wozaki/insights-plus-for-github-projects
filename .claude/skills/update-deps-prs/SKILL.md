---
name: update-deps-prs
description: Triage and move forward Renovate dependency PRs (label `dependencies`) — rebase, research breaking changes, verify locally and in the browser, fix code, and merge with approval. Pass PR numbers to limit the scope.
argument-hint: "[PR number ...]"
disable-model-invocation: true
---

# Update Renovate dependency PRs

Scope: the PR numbers in `$ARGUMENTS`, or every open Renovate PR if none are given.

## Repository context

- Renovate config is `renovate.json`. PRs are grouped (`wxt`, `chrome-types`, `vitest`, `linters`, `typescript`, `test-utils`, `playwright`, `github-actions`, `pnpm`).
- Renovate automerges the other minor/patch PRs once every check (the `E2E` workflow included) is green. Not automerged, so they need a human: every major update, minor updates of 0.x packages (e.g. `wxt` 0.21 → 0.22, `@types/chrome` 0.3 → 0.4), ungrouped dependencies that have no rule in `renovate.json`, and PRs whose body says "a matching PR was automerged previously". If an automergeable PR is still open, look at its failing or pending checks.
- `minimumReleaseAge` is `3 days`: Renovate adds a pending `renovate/stability-days` check until the release is 3 days old, and won't automerge before then. A PR that is only waiting on that check needs no action.
- Automerged updates get no per-PR human review. Instead, the extension is checked manually before each release with the `verify-extension` skill.
- CI (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile` → `pnpm exec wxt prepare` → `lint` → `typecheck` → `test:run` → `build`. The `E2E` workflow runs the live browser tests on every PR and daily. It isn't a required check (the `main` ruleset requires only `lint-and-test (22.x)`), so `renovate.json` sets `platformAutomerge: false`: Renovate merges by itself once every check, E2E included, is green, instead of handing off to GitHub auto-merge, which would wait only for required checks.
- Merges are squash merges (`chore(deps): ... (#123)`). Merged branches are deleted automatically.
- Write commits, PR comments and PR bodies in English.

## 1. Take stock

```bash
gh pr list --label dependencies --state open \
  --json number,title,headRefName,mergeStateStatus,statusCheckRollup,isDraft,updatedAt
```

For each PR, gather:

- What changes: package, from → to, and whether it's major, minor or patch (from the table in the PR body).
- `mergeStateStatus` (`CLEAN` / `BEHIND` / `DIRTY` / `BLOCKED` / `UNKNOWN`).
- Check results, including `e2e`, and the names of failing checks.
- Whether it's stale or a duplicate: the same version is already on `main` (compare `package.json` / `pnpm-lock.yaml`), or a merged PR has the same title.
- Whether anyone other than Renovate has pushed commits (`gh pr view <n> --json commits`).

Show the user a table and propose a category for each PR:

| Category | When | Next |
|---|---|---|
| A. Ready to merge | All checks green, including the non-required `e2e`; `CLEAN`; minor or patch; no breaking changes | Step 3's browser check if it applies, then step 4 |
| B. Needs a rebase | `BEHIND` / `DIRTY` / `UNKNOWN`, or stale check results | Step 2 |
| C. Needs investigation | Major update, minor update of a 0.x package (e.g. `wxt`, `@types/chrome`), or any failing check (`e2e` too) | Step 3 |
| E. Left to Renovate | Automergeable per `renovate.json`, no failing checks, only pending ones (e.g. `renovate/stability-days`) | No action; Renovate merges it once every check is green |
| D. Not needed | Already on `main`, or superseded by a newer PR | Close only after the user confirms |

## 2. Ask Renovate to rebase

Don't rebase and force-push yourself: Renovate stops updating a branch once someone else has committed to it. Tick the rebase checkbox in the PR body instead:

```bash
gh pr view <n> --json body -q .body > <scratchpad>/body.md
perl -pi -e 's/- \[ \] <!-- rebase-check -->/- [x] <!-- rebase-check -->/' <scratchpad>/body.md
gh pr edit <n> --body-file <scratchpad>/body.md
```

Renovate rebases within a few minutes and CI re-runs. Don't wait. Move on to the next PR and review states again at the end.

## 3. Investigate, verify, fix

1. **Breaking changes.** Read the release notes in the PR body. If they are truncated, fetch the GitHub release or CHANGELOG. Note breaking changes, deprecations, and Node/ESM requirements, then grep the repo for affected APIs.
2. **Local checks.** Check out the PR branch in a separate worktree so the current one stays clean:

   ```bash
   git fetch origin <headRefName>
   git worktree add ../deps-pr-<n> origin/<headRefName>
   ```

   In that worktree, run the CI steps in order:

   ```bash
   pnpm install --frozen-lockfile
   pnpm exec wxt prepare
   pnpm run lint
   pnpm run typecheck
   pnpm run test:run
   pnpm run build
   ```

   For a pnpm update (`packageManager`), confirm with `pnpm --version` that Corepack picks up the new version. GitHub Actions updates can't be run locally; judge them by the PR's check results and the release notes.
3. **Browser check.** For updates that can change the built extension (build tooling such as `wxt`/vite, runtime dependencies, major updates), follow the `verify-extension` skill in that worktree, screenshot review included. The PR's `e2e` check does not replace the screenshot review. Skip it for updates that only touch lint, types, tests or Actions, and say so in the report.
4. **Fixes.** Explain the fix to the user first, then commit to the PR branch and push (`git push origin HEAD:<headRefName>`). Tell the user that Renovate will stop auto-updating that branch. If the fix is large or needs a design decision, don't touch the PR. Discuss the approach with the user instead.
5. Clean up with `git worktree remove ../deps-pr-<n>`.

## 4. Merge

- Merge only with the user's explicit approval for each PR. One question covering several listed PRs is fine ("OK to merge #226 and #213?").
- Re-check right before merging that all checks are green, including `e2e`. It isn't a required check in the `main` ruleset (only `lint-and-test (22.x)` is), but it is the only check that loads the extension in a browser.

```bash
gh pr merge <n> --squash
```

- Merging one PR often leaves the others `BEHIND` or conflicting, especially on `pnpm-lock.yaml`. Merge one at a time and ask Renovate to rebase the rest (step 2).

## 5. Report

End with a table: merged / rebase requested (waiting on CI) / fix pushed / closed / on hold (with the reason). For each PR on hold, say what would unblock it.
