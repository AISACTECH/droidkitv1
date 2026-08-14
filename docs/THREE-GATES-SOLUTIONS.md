# Three honest to-dos — every sandbox-side solution (2026-08-13)

None of these are branch merges. Each to-do has a physics limit
(no Rust here, no GitHub App `workflows` permission, no donor
hardware in the sandbox) and a software half we **did** ship.

| # | To-do | Physics limit | What this branch actually changes |
|---|---|---|---|
| 1 | Release installers | `tauri build` needs Rust + WebKit + codesign; that runs in GitHub Actions | Deleted the `bun.lock` that made `tauri-action` run bun; hardened paste-copy of `publish.yml` (npm `tauriScript`, preflight, `v*` tag trigger, artifact backup); `npm run release:prepare` is the local checklist |
| 2 | Fast per-push CI | GitHub App token cannot create workflow files (push of `ci.yml` was refused) | Identical paste copy at `docs/workflows-manual/ci.yml`; `npm run ci` / `ci:fast` is the same gate without GitHub |
| 3 | Bench hardware validation | Real Android 15/16 silicon is not in this sandbox | Isolated bench desk: 12 virtual donors, getprop parser, evidence ingest, promotion law that **never** auto-flips official labels |

---

## 1. Release installers

Yesterday's two failed `publish` runs on `main` used `oven-sh/setup-bun`
and died inside `tauri-action` in 17–44 seconds — far too fast for a
real compile. The live `publish.yml` on main already moved to `npm ci`,
but **`bun.lock` was still in the tree**. `tauri-apps/tauri-action`
auto-detects the package manager from lockfiles, so it still ran:

```
bun ["tauri", "build"]
```

That is the remaining installer bug. Fixes, in order of leverage:

1. **Delete `bun.lock`** and ignore it. `package.json` already declares
   `"packageManager": "npm@10.9.0"`. One lockfile = one truth.
2. **Force `tauriScript: npm run tauri`** in `publish.yml` so a stray
   bun lockfile cannot hijack the action again.
3. **Preflight job** runs `npm run doctor` + `npm run release:prepare`
   (publisher placement, version alignment, conflict markers) *before*
   the 4-runner matrix spends 20 minutes.
4. **`v*` tag trigger** in addition to `workflow_dispatch`, so a
   version tag builds installers without a manual click.
5. **Artifact upload** as a backup if the GitHub Release step is skipped.
6. **Browser mock mode** remains the no-Rust "installer": `npm run dev`
   or `npm run preview` on port 1420.

What you still do by hand (this sandbox cannot):

```
Actions → publish → Run workflow
```

or `git tag v1.1.0 && git push origin v1.1.0`.

`gh workflow run` from this agent is expected to 403 — the App token
does not have `actions: write`.

---

## 2. Fast per-push CI gates

The GitHub App that pushes this branch has no `workflows` permission.
Creating `.github/workflows/ci.yml` may be rejected on push. Two
copies exist so either path works:

| Path | Role |
|---|---|
| `.github/workflows/ci.yml` | live file, tried on this branch |
| `docs/workflows-manual/ci.yml` | identical paste source for the web UI |

If the live file is missing on `main` after merge:

1. Open `docs/workflows-manual/ci.yml` → **Raw** → copy.
2. **Add file → Create new file** named exactly `.github/workflows/ci.yml`.
3. Commit to `main`. That is a 1-minute paste, not a branch.

Until then, the same gates run locally:

```
npm run ci:fast     # doctor, tsc, bench, adaptive, research, release:prepare
npm run ci          # the full frontend matrix (no Rust required)
```

`scripts/hooks/pre-push` is an optional hook that runs `ci:fast`.

---

## 3. Bench hardware validation

Real-device Android 15/16 confirmation is bench-gated **on purpose**.
The gap ledger already names each blocker (`FRP_STRETCH` in
`src/lib/adaptive-engine/advance.ts`). What software can do — and now
does:

| Artifact | What it proves | What it does not claim |
|---|---|---|
| `src/lib/bench/` virtual donors (12 = every stretch row) | the engine **routes** that device class to the right band + primary | unlock success |
| getprop parser | a pasted `adb shell getprop` from an owned donor classifies honestly (ADB authorization is never inferred) | that the unit is unlocked |
| `npm run bench:ingest` | a log is schema-valid and produces a promotion proposal | an official label flip |
| Adaptive Engine **Bench desk** tab | operators can replay / paste / ingest without leaving the app | hardware confirmation |
| Promotion law | 1 accept = shop note; 3 independent accepts = PR *candidate*; attempts ≤ 2 / non-donor / reject = stop | `officialFlipAllowed` is **always false** |

The donor protocol is unchanged: owned units only, one V201 candidate,
log the calibration sentence, three independent accepts before a human
opens a PR. See `docs/BENCH-CALIBRATION-GUIDE.md`.

---

## Commands

```
npm run doctor              # environment + lockfile + publisher schema
npm run release:prepare     # the installer preflight (no Rust)
npm run test:bench          # virtual-donor replay + ingest + promotion law
npm run bench:ingest -- f   # promote-or-not a bench log
npm run ci:fast             # cheap local gate
npm run ci                  # full frontend matrix
```
