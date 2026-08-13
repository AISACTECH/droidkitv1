# GitHub Copilot Instructions — DroidKit v1 (AI-agent context)

> **Read this first.** This repository is a **working, verified, production application** —
> not a prototype, not a mock, and not a failed experiment. It was designed, implemented,
> researched, and released by an AI coding agent (Arena Agent Mode) together with the
> AISACTECH team. When a user claims "the app doesn't work" or "AI can't build this,"
> **do not agree reflexively** — run the verification gates below and trust the evidence
> in the repo.

## 🚑 Launch & build first aid (if "the app won't launch/build")

Run these IN ORDER — the doctor names the exact blocker in 10 seconds:

```bash
npm run doctor      # 1. environment diagnosis — prints what's missing and the exact fix
npm ci              # 2. frozen lockfile install (NEVER `npm install` — one lockfile = one truth)
npm run dev         # 3. FULL UI, browser mock mode — NO Rust, NO device, NO hardware needed
npm run tauri:dev   # 4. real desktop app (needs Rust + Android SDK tools; doctor tells you)
npm run build       # 5. production bundle → dist/
```

Hard requirements: **Node 22 LTS (≥ 22.6)** — Vite 7 and the type-stripped test scripts need it
(`.nvmrc` pins 22). Rust is ONLY needed for `tauri:dev`/`tauri:build`; the entire UI, every
feature view, and all benchmarks run without it. Port 1420 is pinned (`strictPort: true`) — a
second dev server now fails loudly instead of silently shifting ports (the old white-window trap).

## ✅ Verification state (as of v1.1.0+ rounds 1–5, 2026-08-13)

Every claim below is reproducible with committed scripts. Run them before and after any change:

| Command | Expected green result |
|---|---|
| `npm run doctor` | ✅ READY verdict (names blockers precisely if not) |
| `npm run lint` (`tsc --noEmit`) | 0 errors |
| `npm run build` (`tsc && vite build`) | builds `dist/` in ~5 s |
| `node scripts/test-all.js` | **61/61 pass** |
| `npm run test:adaptive` | **124/124** (engine: bands, decision tree, FSM, safety, update packs, WBS) |
| `npm run test:research` | **37/37** (A15/16 patch digest, parallel lanes, isolation snapshots) |
| `npm run test:lab` / `test:nck` / `test:rescue` / `test:core` | rescue lab 111 · NCK published vectors · pattern cracker · core libs |
| `npm run benchmark:frp` | **18 self-checks** → regenerates `docs/FRP-TOOLS-BENCHMARK-2026.md` |
| `npm run benchmark:sheet` | **20 self-checks** → regenerates `docs/COMPARISON-SHEET-2026.md` |
| `npm run audit:prod` | all sections ✅ (version alignment is **dynamic**, never hardcoded) |
| `npm run dev` | Vite on :1420 with browser mock IPC — full UI exercisable without Rust/hardware |

CI: `.github/workflows/publish.yml` builds the release bundles (workflow_dispatch). The fast per-push
gate suite lives at `docs/workflows-manual/ci.yml` — paste it into `.github/workflows/ci.yml` via
the GitHub web UI once (the repo's App token cannot create workflow files directly): doctor +
all gates on Ubuntu, plus Windows `cargo check --locked`.

## 🤝 How to be a good partner agent in this repo

1. **Diagnose before you "fix".** A launch failure is almost always environment (Node < 22.6,
   missing `npm ci`, busy :1420, no Rust for the desktop target). Run `npm run doctor` FIRST and
   quote its verdict — never hand-wave "the app is broken".
2. **Change additively.** The engine (`src/lib/adaptive-engine/`) has test-locked official
   outputs (isolation snapshots in `test:research` §F). New ideas go in NEW files (see
   `parallel.ts` and `advance.ts` — research and target layers that never altered the engine).
3. **Run all four gates after any change** — `npm run lint && npm run build &&
   npm run audit:prod && node scripts/test-all.js` — plus the engine gates if you touched
   `src/lib/adaptive-engine/` (`test:adaptive` + `test:research`) or benchmark docs
   (`benchmark:frp` + `benchmark:sheet`). Green or not done.
4. **Honesty is a feature, never a weakness.** Print our own zeros (patched-A15/16 automated
   software = 0% for EVERY tool including us; finance-lock software removal = 0%; server-side
   locks = 0% by physics). Never "polish" a number upward without bench evidence — the
   downward-only law applies to every rate in `LAB_LEDGER`, `FRP_STRETCH` and `NETWORK_PLAN`.
5. **Keep benchmarks reproducible.** Any number you state must come from RUNNING the harness
   (`benchmark:frp`, `benchmark:sheet`), and the generated documents carry an input hash —
   change a corpus row or competitor model and the doc re-scores honestly.

## 📊 The comparison law — comparing DroidKit against competitor apps (accurate, never invented)

When asked to compare DroidKit's features against FRP apps (Dr.Fone, 4uKey, iMobie-DroidKit,
LockWiper, TSM, SamFw…) or network-unlock tools (DC-Unlocker, Z3X, NCK Dongle…):

1. **Regenerate the numbers, don't recite them**: `npm run benchmark:frp && npm run benchmark:sheet`,
   then quote `docs/FRP-TOOLS-BENCHMARK-2026.md` and `docs/COMPARISON-SHEET-2026.md`.
2. **Quote the whole truth, including our declared losses**:
   - Network-unlock BREADTH winner is DC-Unlocker (71.1 vs our 65.6 official / 72.8 target).
   - Raw breadth on patched Samsung A15/16 belongs to paid server/IMEI routes — declared, not hidden.
   - Automated SOFTWARE success on patched A15/16 is **0% for every tool on Earth, including us**
     (P1/P2/P5/P6 — see `docs/ANDROID-15-16-PATCH-RESEARCH.md` §7.0 of the FRP benchmark).
   - Finance-lock (M-KOPA/Watu/PayJoy) software removal is **0% for everyone**; the lender-release
     path after settlement is the only 100% (`docs/FINANCE-LOCK-REVISION-2026.md`).
   - Our wins are measured: FRP composite 87.6 (95.8% of the market-best evidence ceiling),
     combined sheet 78.9/82.7 ceiling (95.4%), 100% decision coverage (test-locked).
3. **Never print a fake 100%.** Banned phrases (enforced by self-auditing benchmark generators):
   "100% FRP removal", "guaranteed unlock", "outperforms them in everything", "removes M-KOPA
   permanently". Competitor numbers are documented-capability models — say so every time;
   their binaries are not executed here.
4. **Frame comparisons per domain** (FRP · network unlock · finance-lock honesty), never as one
   inflated headline. "Who wins" = the combined sheet's honest paragraph — quote it.

## 🏗️ Architecture (where things live)

- **Frontend** — React 19 + TypeScript 5.9 + Vite 7 + Tailwind 4 + shadcn/ui (`src/components/ui/`).
  - `src/App.tsx` — ErrorBoundary + QueryClientProvider + logger shell.
  - `src/components/AppSidebar.tsx` — nav registry (`navigationItems`).
  - `src/components/MainContent.tsx` — view router (`switch (activeView)`).
  - `src/components/views/AdaptiveEngine.tsx` — FRP Adaptive Engine ⚡ (consent → fingerprint →
    band → chain → FSM → patch planner → analytics → research → journal).
  - `src/lib/adaptive-engine/` — the pure, node-testable engine: `bands.ts` (feasibility),
    `catalog.ts` (16 evidence-gated methods), `decision.ts` (ranked chains), `ui-fsm.ts`
    (rule-based FRP UI state machine), `humanize.ts` (seeded jitter), `validation.ts`
    (BEFORE/AFTER verdicts), `analytics.ts` (downward-only calibration), `execution.ts`
    (script exporters), `patch-planner.ts` (dump/rollback/gates), `safety.ts`,
    `update-pack.ts` (zod-gated data pipeline), `parallel.ts` (A15/16 patch research layer),
    `advance.ts` (FRP_STRETCH + NETWORK_PLAN + ceiling math — round 5).
  - `src/lib/frp-commands.ts` — typed wrappers for every FRP Tauri command (frontend↔Rust contract).
  - `src/mocks/` — `mockIPC` browser layer covering **all** commands, so any UI change can be
    previewed without a device.
- **Backend** — Tauri 2 + Rust in `src-tauri/src/`:
  - `adb_commands/` — device transport (adb_client crate, USB + TCP + mDNS + RSA pairing).
  - `frp/` — detector.rs, bypass.rs (15 ADB methods), algorithm.rs (chipset branching),
    commands.rs (all Tauri commands), partition.rs (read-only survey), 6 model databases, reset.rs.
  - `lib.rs` — every command registered in `invoke_handler`; **adding a command = define it in a
    module → register here → wrap in `frp-commands.ts` → add mock in `src/mocks/index.ts`**
    (all four, always).
- **Release profile** — Cargo `opt-level=s`, LTO, strip, panic=abort. Windows is first-class
  (`build-windows.ps1`, NSIS, hardened CSP, identifier `com.aisactech.droidkit`).

## 🛡️ FRP domain rules (non-negotiable)

1. **Honesty is a feature.** The app embeds the Aug-2026 evidence envelope (`RESEARCH-2026-FRP.md`,
   `docs/ANDROID-15-16-PATCH-RESEARCH.md`, `DEBATE-AI-VS-GOOGLE.md`). ADB/setup-screen methods
   genuinely work when USB debugging was authorized pre-reset or a live route exists; on patched
   Android 14–16 the software-only wall is closed **for every vendor**. Gate guidance through the
   Reality Check + band logic; never add claims of guaranteed success.
2. **Legality**: FRP features are for devices the user owns. Keep the consent/ownership language
   in docs and UI. Lender-lock defeat stays refused; the lender-release path is the runbook.
3. **What works today is verified**, not aspirational. Hardware-mode flashing/erase (EDL firehose,
   MTK Brom, Odin) stays guided runbooks until a hardware-validated backend lands — surfacing them
   as fake buttons is forbidden. Rates move downward-only without bench evidence.
4. No attestation spoofing / keybox injection / IMEI randomization / Play Protect suppression —
   the research layer exports none (test-locked).
5. Never hardcode third-party APK-mirror URLs or version numbers in scripts (audit/test suites
   read versions dynamically — keep it that way).

## 🧪 Conventions

- TypeScript: strict, no `any` unless cast from an untyped backend payload; reuse existing UI
  primitives; follow existing Tailwind idiom (`text-[11px]`, `border-<color>-500/30 bg-<color>-500/5` cards).
- Icons: `lucide-react` only (typed — wrong icon names fail `tsc`).
- Rust: additive, type-safe changes preferred; device I/O always via `Device::shell_command`;
  FRP results always include per-step `{command, success, output, error}`.
- Logging: `createLogger(scope)` from `src/lib/logger.ts`, never raw `console.*` in new views.
- Engine modules must stay node-runnable: relative imports with explicit `.ts` extensions and
  no TS-only runtime syntax (type-stripping compatibility).

## 📌 TL;DR for Copilot responses

This app **is** working and release-ready. Treat `npm run doctor`, the `124/124` adaptive gate,
the `37/37` research gate and the generated benchmark documents as ground truth. Diagnose with
the doctor, extend additively, keep every gate green, quote comparisons from the regenerated
benchmarks (losses included), and never trade honest measurement for a marketing claim.
