# ⚡ FRP Adaptive Engine — Architecture Decision & Task Board

> Decision date: 2026-08-13 · Branch: `arena/019ffa3d-droidkitv1`
> Source brief: "Top 3 FRP Removal Algorithms (Non-AI Focus)" — Adaptive Exploit Automation,
> UI & Behavior Interaction (rule-based), Stealth System Partition Patching.
> Target: Android 15 & 16. Decision requested: extend the experimental Developer Lab,
> integrate into existing features, or build a new feature.

---

## 1. The decision: build it as a NEW first-class feature

**Verdict: new feature — `FRP Adaptive Engine`** (`src/lib/adaptive-engine/` + `AdaptiveEngine.tsx`
view + one read-only Rust command), with integration seams into existing features.

| Option | Assessment | Verdict |
|---|---|---|
| A. Extend the existing experimental Developer Lab | The three algorithms are a *superset* of the Lab's auto-escalation ladder. Bolting a decision tree + UI state machine + partition safety into `DeveloperLab.tsx` would bloat and destabilize a working, tested experimental feature. | ❌ Rejected |
| B. Integrate piecemeal into existing features | Fingerprint lives in DeviceOverview, methods in FrpRemoval, shell in ShellTerminal. The three algorithms form ONE pipeline (fingerprint → band → chain → UI automation → partition safety → verify → journal); scattering it would fragment state and make it untestable as a unit. | ❌ Rejected |
| C. New feature module + view, reusing existing seams | One coherent pipeline with its own test surface and honest-scope contract. Reuses: `frp_build_device_profile`/`frp_detect` (fingerprint capture), evidence docs, RealityCheck band model (cross-check), logger, UI primitives, mock IPC layer. Adds: pure logic modules (node-testable, Patch-Oracle pattern) + one read-only Rust command (`frp_partition_survey`). The Developer Lab stays untouched as the legacy experimental lane. | ✅ **Chosen** |

### Why logic in TypeScript, I/O in Rust (thin)
The repo already splits reasoning engines (pure, offline, deterministic — `src/lib/patch-oracle.ts`,
`RealityCheck.tsx`) from device I/O (Rust). The Adaptive Engine follows that pattern:

- **`src/lib/adaptive-engine/`** — bands, exploit catalog, decision tree, UI FSM, humanization,
  partition-safety policy, journal. Pure, dependency-free, runnable under `node
  --experimental-strip-types` → fully verifiable in CI/sandbox without Rust or a device.
- **`src-tauri/src/frp/partition.rs`** — one read-only survey command (getprop + `ls` only).
  Keeps the un-compilable-here Rust surface minimal and mechanical.

---

## 2. Honest scope (non-negotiable, per repo domain rules)

1. **"100% solution" is redefined as 100% decision coverage**, not 100% unlock success:
   every fingerprint → measured feasibility band → ranked exploit chain with fallbacks →
   post-step verification → rollback safety → journaled outcome. Success rates remain
   evidence-banded (never printed as promises). The repo's Aug-2026 evidence
   (`RESEARCH-2026-FRP.md`) shows patched Android 15/16 closes *all* software-only routes
   industry-wide; the engine honestly routes those to chipset/hardware runbooks or official
   Google account recovery — which is exactly what the top commercial tools do.
2. **Android 15/16 verification**: band rows for 15 and 16 are covered by the test matrix
   (`scripts/verify-adaptive-engine.mts`). Real-device execution can only be validated on a
   bench with hardware; that limitation is stated, never papered over.
3. **Partition patching honesty (AVB physics)**: Verified Boot compares every protected
   partition against the signed vbmeta digest. A patched partition without the vendor's
   signing key is detected at next boot. Therefore the engine ships read-only partition
   **analysis** + rollback policy; it never offers "undetectable patching". Chipset paths
   (Brom/EDL/Odin/SPD) that operate below/outside AVB remain guided runbooks until a
   hardware-validated backend exists (repo rule #3).
4. **"Stealth" reframed as safety + humanization**: randomized/heuristic input timing and
   micro-jitter (standard UI automation), a no-persistent-modification default, and
   mandatory rollback plans for any persistent step. No traffic obfuscation, no signature
   spoofing, no Google-detection-evasion code — out of scope by design.
5. **Legality**: own-device / authorized-servicer consent gate in the UI; FRP features are
   for devices the user owns (per README Legal note).

---

## 3. Task board (small tasks, in dependency order)

| # | Task | Module / file | Acceptance criteria | Status |
|---|---|---|---|---|
| T1 | Shared engine types | `src/lib/adaptive-engine/types.ts` | Fingerprint, FeasibilityBand, MethodEntry, ChainPlan, FSM types — all strict, no `any` | ✅ done |
| T2 | Feasibility band model (Android 15/16 aware) | `src/lib/adaptive-engine/bands.ts` | Matrix: ≤12/pre-2023 → adb_live; 13–14 → testmode_contested; 15/16 → chipset_hardware; unknown chipset → official_only; pre-authorized ADB reopens adb_live | ✅ done |
| T3 | Exploit catalog (evidence-gated) | `src/lib/adaptive-engine/catalog.ts` | ≥14 entries: ADB flags/packages, test-mode, legacy setup tricks (age-tagged), chipset bootrom/bootloader paths, official recovery; each with preconditions, decay, risk, fallback chain, cited evidence | ✅ done |
| T4 | Decision tree → ranked exploit chain | `src/lib/adaptive-engine/decision.ts` | Deterministic; band fit → evidence weight → risk; ≥1 fallback; escalation + stop policy; refusal plan for official_only; brick/AVB warnings | ✅ done |
| T5 | UI & behavior FSM (rule-based, non-AI) | `src/lib/adaptive-engine/ui-fsm.ts` | States cover Samsung/Google/Transsion/Xiaomi FRP flows; transition table; conditional branches; unknown-state fallback → manual guidance; classifier from uiautomator dump text; deterministic simulator | ✅ done |
| T6 | Humanization (heuristic timers, jitter) | `src/lib/adaptive-engine/humanize.ts` | Seeded RNG; delays/tap-offsets/key-pacing within bounds; reproducible for tests | ✅ done |
| T7 | Partition safety (read-only + rollback) | `src/lib/adaptive-engine/partition-safety.ts` | Survey = getprop/`ls` only (asserted by test); AVB honesty constant; rollback plan requires backup before any persistent step; refuses otherwise | ✅ done |
| T8 | Session journal | `src/lib/adaptive-engine/journal.ts` | Append/persist (throttled), per-fingerprint sessions, JSON export | ✅ done |
| T9 | Public API + orchestration | `src/lib/adaptive-engine/index.ts` | `createAdaptiveSession()` = band → plan → FSM options → journal entry | ✅ done |
| T10 | Read-only partition survey command | `src-tauri/src/frp/partition.rs` + `frp/mod.rs` + `lib.rs` | One Tauri command, read-only (getprop + `ls /dev/block/by-name`), per-step output shape like other frp commands | ✅ done (TS-verified pattern; Rust compile pending CI) |
| T11 | TS invoke wrapper + mock | `src/lib/frp-commands.ts`, `src/mocks/index.ts` | 4-part convention (define → register → wrap → mock) honored | ✅ done |
| T12 | AdaptiveEngine view | `src/components/views/AdaptiveEngine.tsx` | Consent gate; fingerprint card; band badge; plan chain (primary + fallbacks + risks); FSM debugger with seeded simulation; partition safety panel (survey button, AVB card, rollback plan); journal + JSON export | ✅ done |
| T13 | Routing + sidebar | `src/components/MainContent.tsx`, `AppSidebar.tsx` | New nav item `adaptive-engine`; view requires selected device like others | ✅ done |
| T14 | Verification script | `scripts/verify-adaptive-engine.mts` + `package.json` (`test:adaptive`) | Band matrix (incl. 15/16 rows), decision determinism, FSM reachability + classifier + fallback, humanize bounds, partition read-only assertion, journal roundtrip — all green | ✅ done |
| T15 | Docs + changelog | `docs/FRP-ADAPTIVE-ENGINE-PLAN.md` (this file), `README.md`, `CHANGELOG.md` | Decision + honest scope + task board committed; README What's New entry | ✅ done |
| T16 | Repo verification gates | — | `npm run lint`, `npm run build`, `npm run audit:prod`, `node scripts/test-all.js`, `npm run test:adaptive` all green | ✅ done (in-sandbox) |

**Follow-ups tracked (not implementable in-sandbox):**
- F17 · Rust compile check (`cargo check`) — no Rust toolchain in sandbox; CI `publish.yml` covers it.
- F18 · Bench validation on real Android 15/16 devices (Samsung One UI 7, Pixel 16, Transsion
  XOS/HiOS) — requires hardware; journal export format is designed for this feedback loop.

---

## 4. Verification honesty

| What | Where | Verifiable here? |
|---|---|---|
| Band matrix incl. Android 15/16 rows | `npm run test:adaptive` | ✅ yes (node) |
| Decision-tree determinism + fallbacks | `npm run test:adaptive` | ✅ yes |
| FSM reachability, classifier, unknown-fallback | `npm run test:adaptive` | ✅ yes |
| Humanize bounds + seed reproducibility | `npm run test:adaptive` | ✅ yes |
| Partition survey read-only guarantee | `npm run test:adaptive` | ✅ yes |
| Type safety + build + repo audit + regression suite | `lint` / `build` / `audit:prod` / `test-all.js` | ✅ yes |
| Rust module compiles | `cargo check` | ❌ no toolchain here → CI |
| Unlock success on real Android 15/16 | device bench | ❌ hardware required (by design; stated in UI) |
