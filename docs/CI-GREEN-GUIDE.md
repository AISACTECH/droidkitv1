# CI Green Guide — watching the GitHub bot (kid-simple, 2026-08-12)

Your repo has the publish bot, and a NEW fast check-bot is **ready to switch
on with one copy-paste** (GitHub only lets its App create workflow files via
the website, so you do one paste — never a command):

### One-time switch-on (2 minutes, website only)
1. In the repo on GitHub, open `docs/workflows-manual/ci.yml` → click **Raw**
   → select all → copy.
2. Back at the repo root: **Add file → Create new file** → name it exactly
   `.github/workflows/ci.yml` → paste → **Commit changes** (to main).
3. Done. From now on every push/PR shows green-or-red in minutes.

## The two bots

| Bot file | When it runs | What it proves | Time |
|---|---|---|---|
| **ci.yml** (after the one-time paste) | Every push & every pull request to `main` | Code typechecks, builds, all 111+ lab tests + engine vectors pass — **and the Rust backend finally compiles** (`cargo check` on Ubuntu + Windows) | ~5–15 min |
| **publish.yml** | Only when YOU press Run workflow (Actions → publish → Run) | Builds the real Windows/macOS/Linux installers into a draft Release | ~20–40 min |

## How to read the color

1. Repo page → click the **✓/✗ dot** next to any commit (or the **Actions** tab).
2. **Green ✓ = safe to merge.** The full story is inside: frontend gates + rust-compile-check both green.
3. **Red ✗ = click it** → the failing job → the red step → **scroll to the bottom of its log**. The last 20–30 lines above "Process completed with exit code 1" name the exact problem. Copy those lines and paste them to your coding session — that's all the robot needs to say.

## What the new bot prevents (the history lesson)

- The bun-lockfile drift that broke all 4 runners → **npm ci everywhere, one lockfile truth**.
- The store-defaults syntax typos → **typecheck gate** catches them instantly.
- The Rust stage that had NEVER compiled anywhere before hitting the publish
  matrix → **rust-compile-check job** compiles it on every push. Publish
  day stops being surprise day.

## If publish ever goes red again

Don't touch anything. Open the run, expand the red step, copy the bottom
30 lines of log, and start a coding session with them pasted in. One
sentence of log beats an hour of guessing.
