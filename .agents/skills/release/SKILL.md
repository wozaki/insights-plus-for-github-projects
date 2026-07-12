---
name: release
description: Release a new version of the Chrome extension. Bumps package.json's version, commits, and pushes to main, which triggers GitHub Actions to tag, build, publish a GitHub Release, and submit the build to the Chrome Web Store.
---

# Release

This project ships releases by pushing a `package.json` version bump to `main`.
`.github/workflows/release.yml` watches pushes to `main` that touch `package.json` and:

1. Reads the `version` field and derives tag `vX.Y.Z`.
2. Skips everything if that tag already exists (safe to re-push without duplicating a release).
3. Builds the extension (`pnpm wxt zip`) and creates a GitHub Release with the zip.
4. Submits the Chrome build to the Chrome Web Store (`pnpm wxt submit`).

Because the last step publishes to real users, treat every push to `main` from this
skill as a public release — never skip the confirmation step below.

## Steps

1. **Decide the version bump** (semver: `MAJOR.MINOR.PATCH`).
   - Only dependency/CI/chore changes since the last tag → patch (`0.3.3` → `0.3.4`).
   - New backward-compatible user-facing features → minor (`0.3.x` → `0.4.0`).
   - Breaking change to how the extension behaves, or a deliberate "stable" milestone → major.
   - Check what actually changed before deciding:
     ```bash
     git tag -l | sort -V | tail -1                  # last released version
     git log <last-tag>..HEAD --oneline               # what's new since then
     ```
   - If it's ambiguous (e.g. could reasonably be patch or minor), ask the user instead of guessing.

2. **Update `package.json`**: set `version` to the new value. Do not hand-edit anything else.

3. **Commit** the version bump by itself (e.g. `Bump version to X.Y.Z`).
   - The pre-commit hook runs `pnpm run typecheck` and `lint-staged` via husky.
   - If it fails with a pnpm/`node_modules` error unrelated to actual type errors
     (e.g. `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`), run `pnpm install` (or
     `CI=true pnpm install` in a non-interactive shell) once, then retry the commit.

4. **Confirm with the user before pushing to `main`.** This is the point of no easy
   return — pushing triggers the public GitHub Release and Chrome Web Store submission.
   State the version you're about to release and wait for explicit go-ahead.

5. **Push to `main`.**

6. Optionally watch the `Release` workflow run (`gh run watch` or check the Actions tab)
   to confirm the tag, GitHub Release, and Chrome Web Store submission all succeeded.

## Notes

- Never create the git tag manually — the workflow derives and creates it from `package.json`.
- If a tag for the target version already exists, bump to a new version instead; the
  workflow will silently no-op rather than fail, which can look like a successful release
  when nothing actually shipped.
- This skill only covers the version bump + push. It does not decide *what* goes into the
  release — that's whatever is already merged to `main` at the time of the bump.
