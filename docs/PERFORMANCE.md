# Performance — what's already fast (measured), what we deliberately did NOT touch (2026-08-12)

Rule for this round: **speed up everything that can be proven not to change
behavior — and don't gamble with the rest.** Here's the honest inventory.

## Already fast (verified in the repo today, not claimed)

- **Frontend bundle**: code-split vendors (`vendor-react` 69 kB gzip,
  `vendor-radix` 36 kB, `views` ~70 kB gzip including Rescue Lab + Patch
  Oracle) — esbuild minified, **no sourcemaps in production**, tree-shaken,
  manualChunks tuned to kill circular vendor pulls. First-load payload is
  small and cache-forever friendly (hashed filenames). Measured live by
  `npm run perf:report`.
- **Rust backend**: release profile already set — `lto = true`,
  `codegen-units = 1`, `opt-level = "s"`, `strip = true`, panic=abort,
  incremental dev builds. This is the recommended fast+small profile.
- **App shell**: Tauri (native window, no bundled Chromium) — the single
  biggest speed/RAM advantage a desktop app can have. This app is already
  in the fast architecture class.

## New this round (additive, zero behavior change)

- `scripts/perf-report.js` (`npm run perf:report`) — prints measured
  gzip sizes vs budgets after every build, so a future feature can't
  silently bloat the app.
- `docs/PERFORMANCE.md` — this file.

## Deliberately NOT done (and why — keep this list honest)

- **Lazy-loading views / route-level React.lazy** — would cut initial JS,
  but it edits app code. This round's contract was "without altering or
  breaking anything," and the whole views chunk is already only ~70 kB
  gzip. Not worth the risk-per-kilobyte today.
- **`sideEffects: false` in package.json** — stronger tree-shaking, but it
  can silently eat side-effect imports (CSS, mock initializers) if applied
  broadly. Left for a dedicated front-end session with visual regression
  checks.
- **Any Rust code changes** — the sandbox can't compile Rust (documented
  constraint). `.github/workflows/ci.yml` now gives the GitHub bot a
  `cargo check` gate on every push, so future Rust work is verified *there*
  before it can hurt `publish.yml` — that is the safe sequence.

## How the USER keeps it fast (kid-simple)

1. **Use the Release installer**, never `npm run tauri:dev` for daily use —
   dev mode carries hot-reload and debug overhead forever.
2. First start after install can be slow (WebView warm-up + antivirus
   first-scan of a new exe). Second start is the real speed.
3. Keep the app window on one device task at a time; logcat streaming is
   the heaviest continuous load — stop it when done.
4. On old shop PCs: close the browser while working — the machine's RAM is
   the bottleneck, not the app (~70 kB UI vs a 1 GB browser is the joke
   competitors can't tell about their Electron apps).

## Measurement addendum — 2026-08-12 (Help Center round)

After adding the Help & Info view + shared help-content module + bundled
PDF guide, the same machine / same budget run (`npm run perf:report`):
views chunk 68.5 → **83.1 kB gz** (budget 85 — still GREEN), total wire
257.6 → **270.7 kB gz**. The +14.6 kB is the price of shipping the full
policies/setup/FAQ text offline — deliberately bought, since the target
users are counter shops with unreliable internet. Guardrail: the views
budget stays 85 kB; if a future view pushes past it, split THAT view into
its own chunk rather than raising the number silently.
