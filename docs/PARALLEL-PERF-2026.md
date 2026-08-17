# ⚡ Parallel Performance Pass 2026 — UX refinement, deep optimization, parallel-by-definition
## Contract: "without altering anything" — every change preserves behavior, verified by gates

**Date:** 2026-08-17 · **Branch:** `arena/01a00f04-droidkitv1` · **Scope:** frontend (TS/TSX/CSS) only —
no Rust changes (this sandbox has no Rust toolchain to compile-verify them), no feature changes,
no layout/behavior changes.

---

## 0 · The contract, made executable

"Without altering anything" is enforced three ways:

1. **Byte-identical outputs where logic moved**: the adaptive-engine refactor extracts the
   three-lane collapse into one pure function shared by the sync and concurrent paths, so
   parallelism cannot change the result. Locked by `test:research` regression snapshots
   (band matrix, decision plan, FSM, patch planner, catalog — all byte-identical) and by
   `test:concurrency` section E (concurrent deep-equals sync for 5 fingerprints).
2. **Same data, same order**: all parallel utilities preserve input order and produce the
   same values as the sequential version — proven for a fixed corpus in `test:concurrency`.
3. **No Rust edits** (nothing shipped that can't be compiled+verified here).

---

## 1 · UX refinement (clean, visual-only)

`src/main.css` gains a **UX refinement layer** — scrollbars, selection, focus, motion:

- **Refined scrollbars** — thin, theme-matched (light + dark), rounded, hover-highlighted.
- **Consistent selection & focus** — theme-tinted `::selection`; a uniform 2px
  `:focus-visible` ring so keyboard navigation is obvious everywhere.
- **Micro-interactions** — buttons/inputs/selects get 150ms transitions (bg, border, color,
  shadow) and a subtle `scale(0.98)` press state; cards get a gentle border tint on hover.
  Purely visual — no layout shifts, no new motion.
- **`prefers-reduced-motion`** — the whole app collapses animations/transitions for users who
  request it (accessibility).
- **Font rendering** — antialiasing + `optimizeLegibility` on the root.

## 2 · Deep optimization (same behavior, less work)

| Change | What | Why |
|---|---|---|
| `MainContent` → `React.memo` | Views no longer re-render on unrelated App state (sidebar toggles, status-bar ticks, loading flags) | Biggest render win: 13 views re-created on every App render before |
| `AppSidebar`, `StatusBar`, `DeviceList`, `PerformanceMonitor`, `LogcatViewer` → `React.memo` | Heavy components skip re-renders when props didn't change | Complements the App-level work below |
| `App.tsx` — `useCallback` on `refreshDevices`, `handleWirelessDeviceConnected`, `toggleSidebar` | Stable callback identities so the memoized children actually skip renders | Without this, memo is defeated by fresh closures every render |
| `useDeviceQueries.ts` — `useCallback` on `addDevice`/`removeDevice` | Stable identities for the app-level callbacks that depend on them | Same |
| `LogcatViewer` — memoized `displayRows` (parse once per batch) + debounced search | Per-line regex parsing was happening inside the render loop on every render; now it's one `useMemo` over the log batch | Auto-refresh every 2s no longer re-parses all lines per frame |
| `useDebouncedValue` hook (new) | Search inputs (Logcat, Apps) filter on a 200ms debounced value | Typing no longer runs the full filter on every keystroke; final value identical |
| `PerformanceMonitor` — 5 ADB reads via `parallelAll(..., 5)` | The meminfo/cpuinfo/battery/uptime/top reads now run concurrently instead of serially | Perf view loads in ~max(read) instead of ~sum(reads); results identical (order preserved) |

## 3 · Parallel by definition — the app's parallel backbone

### `src/lib/concurrency.ts` (new)
Bounded-concurrency primitives with a strict contract (order preserved, concurrency capped,
fail-fast or error-isolated variants):

- `mapWithConcurrency(items, limit, mapper)` — `Promise.all`-equivalent results with a
  concurrency cap; fail-fast like `Promise.all`.
- `mapWithConcurrencySettled(items, limit, mapper)` — every item runs to completion; per-item
  fulfilled/rejected outcomes, index-aligned (e.g. scanning devices where some are unreachable).
- `parallelAll(factories, limit)` — schedules zero-arg factories under a cap, order preserved.
- `isPromiseLike` + `normalizeLimit` helpers.

### `src/lib/adaptive-engine/parallel.ts` — the lanes now actually run in parallel
The round-3 research layer always claimed "superposition → collapse" but evaluated the three
lanes **sequentially**. Now:

- `collapseLanes(fp, protection, lanes)` — the pure merge, extracted byte-for-byte.
- `evaluateParallelLanes(...)` — sync path (unchanged output, regression-locked).
- **`evaluateParallelLanesConcurrent(...)`** — NEW async path that runs the exploit / UI /
  patch lanes concurrently via `Promise.all` and collapses through the same pure function.
  Guarantee: `await evaluateParallelLanesConcurrent(fp)` deep-equals
  `evaluateParallelLanes(fp)` — parallelism changes *when* work happens, never *what* it
  produces. Safe by construction: lanes are pure functions of the fingerprint, no shared state.

### `scripts/verify-concurrency.mts` — `npm run test:concurrency` (35 checks)
A. order/result identity with sequential map · concurrency cap never exceeded · workers truly
run in parallel · empty input · fail-fast semantics
B. settled variant: every item processed despite sibling failures, index-aligned outcomes
C. parallelAll: order + exactly-once + limit normalization
D. isPromiseLike
E. **concurrent ≡ sync for the adaptive engine** across A15-MTK, A12-ADB-live, A16-unknown,
   Pixel-9, A13-Exynos fingerprints — the behavior lock for parallel-by-definition.

Wired into `package.json` (`test:concurrency`) and `scripts/ci-local.mts` (FAST + FULL gates).

## 4 · Verification evidence (run this session)

```
npm run lint            → 0 errors (tsc --noEmit)
npm run build           → OK in 5.33s (prod bundle)
npm run test:concurrency → 35 passed, 0 failed (NEW)
npm run test:research   → 37 passed, 0 failed (regression snapshots byte-identical)
npm run test:adaptive   → 124 passed, 0 failed
npm run test:core       → 79 passed, 0 failed
npm run test:nck        → all vectors green
npm run ci:fast         → 7 gates green (incl. test:concurrency)
```

## 5 · What was deliberately NOT touched

- No Rust code (no cargo toolchain in this sandbox — nothing unverified ships).
- No component layout, spacing, copy, or feature behavior.
- No query intervals/cache keys (polling cadence unchanged).
- No benchmark numbers, engine bands, or honesty strings.
- The one functional-adjacent change is `setSelectedDevice((current) => current ?? device)`
  in `App.tsx` — identical auto-select semantics, but removes the stale-closure dependency so
  the callback is memoizable.

## 6 · Next steps (suggested, not done)

- When a Rust toolchain is available: parallelize `system_info.rs` getters and
  `discovery.rs` per-device probing with rayon/tokio (same isolation contract as here).
- Apply `useDebouncedValue` to remaining search fields (FileExplorer breadcrumb search) and
  `mapWithConcurrencySettled` to any multi-device scan loops.
