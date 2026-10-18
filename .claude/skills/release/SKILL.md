---
name: release
description: Release a new version of the extension — regression-test main, pick the version, run the Bump Version workflow, and confirm the tag, GitHub Release and Chrome Web Store submission. Pass the version to skip proposing one.
argument-hint: "[X.Y.Z]"
disable-model-invocation: true
---

# Release the extension

Version: `$ARGUMENTS`, or propose one in step 3 if none is given.

## Repository context

- Releases are cut from `main` by `.github/workflows/bump-version.yml` (`workflow_dispatch`, input `version`). It sets `version` in `package.json`, commits `Bump version to X.Y.Z` to `main`, then dispatches `release.yml`.
- `.github/workflows/release.yml` tags `vX.Y.Z`, runs `pnpm wxt zip`, creates a GitHub Release with the zip and generated notes, and submits the zip to the Chrome Web Store (`wxt submit`, environment `chrome-web-store`). It skips everything if the tag already exists, so it also runs harmlessly on every `main` push that touches `package.json` (e.g. Renovate's pnpm updates).
- The release cannot be undone from here: the commit lands on `main` and the build goes to Chrome Web Store review. Run the workflow only after the user approves the exact version.
- Dependency updates are automerged without per-PR review (see the `update-deps-prs` skill), so the regression test in step 2 is the only browser check they get before shipping.
- Write commits, PR bodies and release-related text in English.

## 1. Check the starting point

```bash
git fetch origin --tags
git log --oneline -1 origin/main
gh run list -b main -L 6
gh release list -L 3
```

- The latest `CI` run on `main` must be green. If the latest `E2E` run failed, triage it with the `refresh-page-fixtures` skill before releasing.
- Ask whether any open PR should go into this release (`gh pr list --state open`). Merge those first.

## 2. Regression test

Test the commit that will be released: check out `origin/main` (or a worktree at it) and follow the `verify-extension` skill, screenshot review included. Report per feature as that skill says. Stop and discuss with the user if anything fails or looks off.

If the user wants to try it themselves, build and open their Chrome with the production build. This uses the same profile as `pnpm dev` (`VITE_DEV_BROWSER_USER_DATA_DIR` in `.env.local`, which lives in the main checkout), so they stay signed in to GitHub:

```bash
pnpm run build
pnpm exec web-ext run --target chromium --source-dir .output/chrome-mv3 --no-reload \
  --chromium-profile <main checkout>/.wxt/chrome-data --keep-profile-changes \
  --start-url https://github.com/users/wozaki/projects/4/insights/2
```

Run it in the background. It exits when the user closes Chrome.

## 3. Pick the version

```bash
LAST=$(git describe --tags --abbrev=0 origin/main)
node -p "require('./package.json').version"
git log --oneline $LAST..origin/main | grep -v 'chore(deps)'
```

Summarise the user-facing changes since `$LAST` (`feat`/`fix` commits and merged feature PRs; count the dependency updates instead of listing them). Propose a version: while the major version is 0, new features bump the minor version and fixes alone bump the patch version. Ask the user to approve the exact version.

## 4. Run the release

Only after the user approved the version:

```bash
gh workflow run bump-version.yml -f version=X.Y.Z
gh run list -w bump-version.yml -L 1      # get the run ID
gh run watch <bump-run-id> --exit-status
gh run list -w release.yml -L 1           # the dispatched run, event workflow_dispatch
gh run watch <release-run-id> --exit-status
```

`bump-version.yml` fails before changing anything if the version isn't `X.Y.Z` or the tag already exists.

## 5. Confirm

```bash
git fetch origin --tags
git log --oneline -1 origin/main          # Bump version to X.Y.Z
git tag -l vX.Y.Z
gh release view vX.Y.Z --json url,assets,body
```

- The release has a `*-chrome.zip` asset, and its notes list the changes from step 3.
- In the release run, `Submit to Chrome Web Store` succeeded. If it failed (e.g. expired `CHROME_REFRESH_TOKEN`), the tag and GitHub Release already exist, so re-running the workflow skips the submission. Tell the user to upload the zip from the release in the Chrome Web Store dashboard, or to delete the tag and release and re-run `release.yml` once the secret is fixed.

## 6. Report

Give the release URL, the version, the user-facing changes, and that the build is waiting for Chrome Web Store review. Store review takes from hours to days, and the user is notified by email when it's done.
