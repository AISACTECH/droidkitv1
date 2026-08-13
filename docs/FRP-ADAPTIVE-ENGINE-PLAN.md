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
- F17 · Rust compile check (`cargo check`) — no Rust toolchain in sandbox; CI `ci.yml` rust-compile-check + `publish.yml` cover it. Local stand-in: `npm run release:prepare`.
- F18 · Bench validation on real Android 15/16 devices (Samsung One UI 7, Pixel 16, Transsion
  XOS/HiOS) — requires hardware. Software half shipped: `src/lib/bench/` virtual donors +
  getprop parser + ingest/promotion (`npm run test:bench`); official labels still never auto-flip.

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

---

## 4. Round 2 — full WBS execution (task-by-task digest)

Every task from the full three-algorithm breakdown maps to a concrete artifact.
Status legend: ✅ implemented · ♻️ already covered in round 1 · 🔬 bench/hardware-gated (declared, not faked) · ⚖️ reframed under the honesty law.

### Algorithm #1 — Adaptive Exploit Automation

| Task | Deliverable | Status |
|---|---|---|
| 1.1 Collect A15/16 firmware & OEM ROMs | `update-pack.ts` + `docs/OFFICIAL-ROUTES.md`; firmware acquisition is a bench activity (redistribution/licensing) — the pipeline that consumes findings is shipped | 🔬 pipeline ✅ |
| 1.2 Reverse-engine Google verification services | `verification-stack.ts` — 13 sourced components (gsf.login, provisioning flags, frp partition, AVB, FBE, RPMB) from PUBLIC sources; decompilation of Google binaries is explicitly not claimed | ✅ (public-knowledge scope) |
| 1.3 Identify entry points (ADB, a11y, settings) | `verification-stack.ts` ENTRY_POINTS + catalog preconditions per entry point | ✅ |
| 1.4 Categorize vulnerabilities by fingerprint | `bands.ts` (fingerprint → band) + `decision.ts` (fingerprint → chain) | ♻️ |
| 2.1 Modular exploit DB by model/OS | `catalog.ts` (17 entries, preconditions, decay) + `update-pack.ts` zod schema for extending it as data | ♻️ + ✅ |
| 2.2 Fallback chains for patched devices | `decision.ts` (ranked chain, terminal official node) + `catalog.ts` fallbackTo graph (tested for integrity) | ♻️ |
| 2.3 Automate validation on emulators/devices | `validation.ts` — injectable DeviceExecutor harness + offline matrix (UI) + matrix tests; real-device runs use the same harness on a bench | ✅ (harness) / 🔬 (hardware runs) |
| 2.4 Logging success/failure | `journal.ts` (meta-enriched) + `analytics.ts` per-method stats | ✅ |
| 3.1 Script ADB sequences & UI flows | `execution.ts` — deterministic ADB ladder scripts + uiautomator/input-injection UI scripts | ✅ |
| 3.2 Decision tree by fingerprint | `decision.ts` | ♻️ |
| 3.3 Success verification (system state + UI) | `validation.ts` BEFORE/AFTER state snapshots + `verdictLabel` (removed_verified / flags_set / failed) + reboot-observation law | ✅ |
| 3.4 Randomized timing/input for stealth | `humanize.ts` (seeded, bounded) — stealth = humanization, not evasion | ♻️ |
| 4.1 Test on diverse devices/versions | `verify-adaptive-engine.mts` — band matrix Android 12→16, 9 OEM flows, catalog matrix | ✅ (logic) / 🔬 (real devices) |
| 4.2 Analyze failures → update DB | `analytics.ts` `calibrateCatalog` — downward-only weight adjustments, upward requires bench evidence | ✅ |
| 4.3 Optimize scripts for reliability/speed | `execution.ts` `optimizeLines` (dedupe, zero-wait prune) + seeded determinism tests | ✅ |
| 4.4 Rollback & fail-safes | `safety.ts` coordinator + `patch-planner.ts` recovery scripts | ✅ |

### Algorithm #2 — UI & Behavior Interaction (rule-based)

| Task | Deliverable | Status |
|---|---|---|
| 1.1 Collect FRP screen samples | `ui-samples.ts` — 12 curated samples across 9 brands incl. Android 15/16 rows, all classifier-tested | ✅ |
| 1.2 Map UI states/dialogs/transitions | `ui-fsm.ts` ALLOWED_FROM graph + OEM_FLOWS | ♻️ |
| 1.3 Comprehensive state machine model | `ui-fsm.ts` (20 states, 6 event types, terminal + escalation states) | ♻️ |
| 2.1 Scripted sequences per state | `ui-fsm.ts` hopActions | ♻️ |
| 2.2 Conditional branching for errors | timeout/error/blocked branches + probe budget (3) | ♻️ |
| 2.3 Accessibility + input injection automation | `execution.ts` `generateUiAutomationScript` — uiautomator dump probes + `input tap/swipe/keyevent/text` mapping | ✅ |
| 2.4 Heuristic timers + randomized delays | `humanize.ts` (bounds-tested) | ♻️ |
| 3.1 Fallbacks for unknown/changed flows | probe-budget escalation → manual guidance → journal | ♻️ |
| 3.2 Log interaction failures | `journal.ts` fail entries + meta.dump payload | ✅ |
| 3.3 Tools for rapid script refinement | `scripts/refine-ui-flows.mts` (`npm run refine:ui-flows`) — keyword + flow suggestions from journal exports | ✅ |
| 4.1 Test on multiple devices/versions | FSM matrix + sample library tests | ✅ (logic) / 🔬 (devices) |
| 4.2 Feedback loop → update maps/scripts | refine tool → edit data → `npm run test:adaptive` (the loop, executable) | ✅ |
| 4.3 Optimize sequences for speed/stealth | `execution.ts` optimize + seeded humanized delays | ✅ |

### Algorithm #3 — Stealth System Partition Patching

| Task | Deliverable | Status |
|---|---|---|
| 1.1 Identify FRP partitions on A15/16 | `partition-knowledge.ts` — per-chipset tables (frp/persist/vbmeta/FBE-metadata/proinfo/nvram…) + `ANDROID_1516_NOTE` (no new partition; enforcement moved server-side/pre-setup-USB) | ✅ |
| 1.2 Safe dumping avoiding verified-boot triggers | `patch-planner.ts` `buildDumpManifest` — read-only dd forms (tested: writes rejected), hash records; reading never trips AVB | ✅ |
| 1.3 Partition encryption/signature analysis | `verification-stack.ts` AVB/vbmeta + FBE + RPMB records | ✅ |
| 2.1 Minimal patches to disable FRP checks | `buildPatchPlan` — lane-specific minimal plans (erase frp below the OS), vbmeta writes refused by construction | ✅ |
| 2.2 Stealth patching minimizing footprint | Minimal-touch law enforced in schema (`touches ≤ 2`) + tests; "undetectable" reframed → AVB_HONESTY | ✅ ⚖️ |
| 2.3 Rollback mechanisms | `planRollback` + `generateRecoveryScript` (hash-check → restore → re-survey) | ✅ |
| 3.1 Bootloader/recovery vulnerabilities for patch acceptance | Knowledge notes in `verification-stack.ts`/`partition-knowledge.ts`; unsigned acceptance does not exist under AVB — stated, not sold | 🔬/⚖️ (research is bench + public docs) |
| 3.2 Automate flashing with safety checks | `evaluateFlashGates` — backups/bit-version/firmware-archive/hashes; any failed critical gate refuses | ✅ |
| 4.1 Validate patches on diverse devices | patch-plan matrix tests (per chipset lane, official_only refusal) | ✅ (policy) / 🔬 (silicon) |
| 4.2 Automated recovery procedures | `generateRecoveryScript` — the only sanctioned write path | ✅ |
| 4.3 Optimize patching speed/stealth | minimal-touch ordering (frp-only), no userdata unless factory-reset mode | ✅ |

### Cross-algorithm

| Task | Deliverable | Status |
|---|---|---|
| CA1 Modular architecture | `index.ts` module registry + `WBS_MAP` (tested: CA1–CA5 all mapped, ≥30 tasks) | ✅ |
| CA2 Centralized logging/analytics | `journal.ts` + `analytics.ts` + Analytics tab (totals, per-method stats, calibration) | ✅ |
| CA3 Continuous update pipelines | `update-pack.ts` zod schemas + `npm run update:validate` CLI + Updates tab; edit-data→test→ship | ✅ |
| CA4 UI for selecting algorithms + progress | Algorithm selector cards + deterministic pipeline progress (never "unlock %") | ✅ |
| CA5 Rollback/fail-safes across modules | `safety.ts` coordinator (consent/backups/bit-version/refusal) — tested refusal matrix | ✅ |

### Verification (round 2)

`npm run test:adaptive` now runs **124 checks** (was 66): band matrix incl. Android 15/16, decision determinism, FSM reachability/classifier/probe budget, humanize bounds, read-only guarantees, rollback refusal, journal roundtrip, knowledge modules, validation-harness verdicts, analytics math + downward-only calibration, script determinism + write-freedom + refusal scripts, dump/patch/gates/recovery invariants, update-pack schemas (certainty-forbidden, vbmeta-write-forbidden, minimal-touch law), UI sample classification, refinement tool, WBS coverage.

Declared NOT done here (by design, never faked): Rust compile gate (CI `cargo check`), firmware acquisition, decompilation of Google binaries, real-device/emulator hardware runs, and any claim of unsigned patch acceptance under AVB.

---

## 5. Round 3 — isolated Android 15/16 patch research layer

Full research dossier: `docs/ANDROID-15-16-PATCH-RESEARCH.md` (patches P1–P10 with sources,
hide/seek reframing, quantum reframing, lab expectations, bench to-dos). Application layer:
`src/lib/adaptive-engine/parallel.ts` — **new file only**; every existing engine module is
untouched (verified by `git diff` and by the regression-snapshot section F of
`npm run test:research`, 37 checks).

| Research finding | Applied as | Notes |
|---|---|---|
| A15 moved FRP enforcement into system core (P1); ownership-gated installs (P2); OEM-unlock ≠ FRP-off (P3) | Patch digest → lane impact scoring | Exploit/UI lanes close; below-OS lanes remain |
| A16 USB/ADB restricted before setup (P6); APK routes blocked (P7); per-patch ratchet (P8) | Digest + band model cross-check | Band matrix unchanged — the digest *explains* it |
| Samsung Binary-18 KG-Prenormal blocks USB DATA while OS is on (P9) | `buildProtectionMap` → `usbRisk` + behavior budget | Read-only "seek" — routes, never evades |
| Play Integrity May-2025: all verdicts hardware-backed (P5) | `NO_EVASION_NOTE` hard line + test-enforced | Hiding = needing leaked keyboxes — declared, not faked |
| "Hide & seek" | HIDE = footprint+budget+restore-to-stock (existing laws, now stated); SEEK = read-only protection map | No spoof/evade/obfuscate exports (tested) |
| "Quantum juggling" | `evaluateParallelLanes`: three lanes in parallel → collapse to measured choice; union coverage 1−∏(1−rᵢ), capped 97 | Deterministic; scam note kept (PHYSICS-LAYER-RESEARCH) |
| Lab test knowledge | `LAB_LEDGER` (10 evidence-banded expectations, per-lane, sourced) | Downward-only law; ≥50% bands exist ONLY where evidence supports them |

Success-target honesty: **decision coverage 100%** (every fingerprint → measured plan, tested);
expected unlock rates are lab-gated bands — ≥50% evidence exists for the pre-authorized ADB
window and below-OS chipset lanes; patched A15/16 software-only lanes are 5–15% by all public
evidence, and the parallel report SHOWS that gap instead of hiding it.

Bench to-dos (declared): identify the real channel behind "MTP-mode" tool claims; measure
Binary-18 KG-Prenormal timing budget; validate Brom/EDL on owned A15/16 units; re-run after the
Feb-2026 root-certificate rotation.
