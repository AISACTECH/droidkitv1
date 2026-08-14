# Workflows Setup

Two workflow files live in two places on purpose.

| File | Live path | Paste source |
|---|---|---|
| Fast per-push gates | `.github/workflows/ci.yml` | `docs/workflows-manual/ci.yml` |
| Installer matrix | `.github/workflows/publish.yml` | `docs/workflows-manual/publish.yml` |

The GitHub App token that pushes coding-session branches often **cannot
create** files under `.github/workflows/` (`workflows` permission). If
`ci.yml` is missing on `main` after a merge, paste it via the website —
that is a 1-minute action, not a branch. Full kid-simple steps:
[`docs/CI-GREEN-GUIDE.md`](./CI-GREEN-GUIDE.md).

## What ci.yml does

- Node 22 + `npm ci` (frozen `package-lock.json`, never bun)
- Refuses a committed `bun.lock` (that is what made `tauri-action` pick bun)
- `npm run doctor` + `npm run release:prepare`
- typecheck, production build, `test-all.js`
- adaptive + research + bench + lab + NCK + core + brands + matrix
- generated FRP / comparison-sheet benchmarks
- production audit
- **plus** `cargo check --locked` on Ubuntu + Windows so the Rust
  backend is bot-compiled *before* publish day

Until the file is on `main`, run the same gates locally:

```
npm run ci:fast
npm run ci
```

## What publish.yml does

- `workflow_dispatch` **and** `v*` tag push
- Preflight job (doctor + release:prepare + bun.lock refuse) before the matrix
- Node 22 + `npm ci` + `tauriScript: npm run tauri` (bun cannot hijack)
- Ubuntu WebKit/USB deps, Rust cache, 4 runners (Linux / Windows / macOS ARM / macOS Intel)
- Draft GitHub Release + artifact backup

Trigger: **Actions → publish → Run workflow**, or `git tag vX.Y.Z && git push origin vX.Y.Z`.
