# CI Green Guide — watching the GitHub bot (kid-simple, 2026-08-13)

Your repo has the publish bot, and a fast check-bot that is **either
already on this branch** (`.github/workflows/ci.yml`) **or one
copy-paste away**. GitHub only lets some App tokens create workflow
files via the website, so if `ci.yml` is missing on `main` you do one
paste — never a command.

### One-time switch-on (2 minutes, website only) — only if ci.yml is missing on main

1. In the repo on GitHub, open `docs/workflows-manual/ci.yml` → click **Raw**
   → select all → copy.
2. Back at the repo root: **Add file → Create new file** → name it exactly
   `.github/workflows/ci.yml` → paste → **Commit changes** (to main).
3. Done. From now on every push/PR shows green-or-red in minutes.

Until then, the same gates run on any machine with Node 22:

```
npm run ci:fast     # ~2 min
npm run ci          # full frontend matrix, no Rust
```

## The two bots

| Bot file | When it runs | What it proves | Time |
|---|---|---|---|
| **ci.yml** (after the one-time paste, if needed) | Every push & every pull request to `main` | Code typechecks, builds, all lab tests + engine vectors + bench desk pass — **and the Rust backend finally compiles** (`cargo check` on Ubuntu + Windows) | ~5–15 min |
| **publish.yml** | When YOU press Run workflow **or** push a `v*` tag | Builds the real Windows/macOS/Linux installers into a draft Release | ~20–40 min |

## How to read the color

1. Repo page → click the **✓/✗ dot** next to any commit (or the **Actions** tab).
2. **Green ✓ = safe to merge.** The full story is inside: frontend gates + rust-compile-check both green.
3. **Red ✗ = click it** → the failing job → the red step → **scroll to the bottom of its log**. The last 20–30 lines above "Process completed with exit code 1" name the exact problem. Copy those lines and paste them to your coding session — that's all the robot needs to say.

## What the new bot prevents (the history lesson)

- The bun-lockfile drift that broke all 4 runners → **npm ci everywhere, one lockfile truth, `bun.lock` deleted and gitignored**.
- `tauri-action` still picking bun because a lockfile remained → **`tauriScript: npm run tauri`** plus a preflight that fails the job if `bun.lock` comes back.
- The store-defaults syntax typos → **typecheck gate** catches them instantly.
- The Rust stage that had NEVER compiled anywhere before hitting the publish
  matrix → **rust-compile-check job** compiles it on every push. Publish
  day stops being surprise day.
- Leftover merge-conflict markers and a misplaced `publisher` key →
  **`npm run release:prepare`** is a required preflight.

## If publish ever goes red again

Don't touch anything. Open the run, expand the red step, copy the bottom
30 lines of log, and start a coding session with them pasted in. One
sentence of log beats an hour of guessing.
