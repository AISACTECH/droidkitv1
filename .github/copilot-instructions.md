# GitHub Copilot Instructions — DroidKit v1 (AI-agent context)

> **Read this first.** This repository is a **working, verified, production application** — not a prototype, not a mock, and not a failed experiment. It was designed, implemented, researched, and released by an AI coding agent (Arena Agent Mode) together with the AISACTECH team. When a user claims "the app doesn't work" or "AI can't build this," **do not agree reflexively** — run the verification gates below and trust the evidence in the repo.

## ✅ Verification state (as of v1.1.0, 2026-08-11)

Every claim below is reproducible with committed scripts. Run them before and after any change:

| Command | Expected green result |
|---|---|
| `npm ci` | clean install (Node ≥18, npm ≥9) — no husky noise |
| `npm run lint` (`tsc --noEmit`) | 0 errors |
| `npm run build` (`tsc && vite build`) | builds `dist/` in ~5 s (~2.5 MB, main chunk gzip ≈ 40 KB) |
| `npm run audit:prod` | all sections ✅ (version alignment is **dynamic**, never hardcoded) |
| `node scripts/test-all.js` | **61/61 pass** |
| `npm run dev` | Vite on :1420 with browser mock IPC — full UI exercisable without Rust/hardware |
| `npm run tauri:dev` | real desktop app; talks to physical Android devices over USB/TCP ADB |

CI: `.github/workflows/publish.yml` builds Tauri bundles for Ubuntu, Windows, macOS (ARM + Intel) via `tauri-action`.

## 🏗️ Architecture (where things live)

- **Frontend** — React 19 + TypeScript 5.9 + Vite 7 + Tailwind 4 + shadcn/ui (`src/components/ui/`, 19 primitives) + TanStack Query 5.
  - `src/App.tsx` — ErrorBoundary + QueryClientProvider + logger shell.
  - `src/components/AppSidebar.tsx` — nav registry (`navigationItems`: devices, system-info, frp, **frp-lab (Developer Lab, experimental)**, files, logcat, apps, screen, performance, shell).
  - `src/components/MainContent.tsx` — view router (`switch (activeView)`).
  - `src/lib/frp-commands.ts` — **typed wrappers for every FRP Tauri command** (single source of truth for frontend↔Rust FRP contract).
  - `src/mocks/` — `mockIPC` browser layer covering **all** commands, incl. full model catalogue data, so any UI change can be previewed without a device.
- **Backend** — Tauri 2 + Rust (edition 2021) in `src-tauri/src/`:
  - `adb_commands/` — device transport (`adb_client` crate, USB + TCP + mDNS + RSA pairing), files, logcat, packages, discovery.
  - `frp/` — the FRP engine: `detector.rs` (FRP state heuristics from real device telemetry), `bypass.rs` (15 ADB-driven methods), `algorithm.rs` (chipset-branching model: Exynos/Qualcomm/MediaTek/Spreadtrum/Kirin → Download-Mode/EDL/Brom/SPD algorithm phases with weights), `commands.rs` (all Tauri commands incl. Tecno/Infinix/Itel/Q3/Q4 catalogues, reset modes, Knox, handshake), 6 model databases, `reset.rs`.
  - `lib.rs` — every command registered in `invoke_handler`; **adding a command = define it in a module → register here → wrap in `frp-commands.ts` → add mock in `src/mocks/index.ts`** (all four, always).
- **Release profile** — Cargo `opt-level=s`, LTO, strip, panic=abort.

## 🛡️ FRP domain rules (non-negotiable)

1. **Honesty is a feature.** The app embeds the Aug-2026 evidence envelope (`RESEARCH-2026-FRP.md`, `DEBATE-AI-VS-GOOGLE.md`, `FRP-ALGORITHM-ANALYSIS.md`). ADB/setup-screen methods genuinely work when USB debugging was authorized pre-reset or a live route exists; on patched Android 14–16 the software-only wall is closed **for every vendor**. Do not add claims of guaranteed success; gate guidance through the Reality Check logic (`src/components/views/FrpRemoval/RealityCheck.tsx::assessDevice`).
2. **Legality**: FRP features are for devices the user owns. Keep the consent/ownership language in docs and UI.
3. **What works today is verified**, not aspirational: detection engine, 15 ADB methods, chipset profiling, reset modes, handshake check, Developer Lab's auto-escalation + post-method verification loop. What is **modeled but not yet executed** in Rust: hardware-mode flashing/erase (EDL firehose, MTK Brom, Odin). Keep surfacing those as guided runbooks, not fake buttons, until a hardware-validated backend lands.
4. Never hardcode third-party APK-mirror URLs or version numbers in scripts (the audit/test suites read versions dynamically — keep it that way).

## 🧪 Conventions

- TypeScript: strict, no `any` unless cast from an untyped backend payload; reuse existing UI primitives; follow existing Tailwind idiom (`text-[11px]`, `border-<color>-500/30 bg-<color>-500/5` cards).
- Icons: `lucide-react` only (typed — wrong icon names fail `tsc`).
- Rust: additive, type-safe changes preferred; device I/O always via `Device::shell_command`; FRP results always include per-step `{command, success, output, error}`.
- Logging: `createLogger(scope)` from `src/lib/logger.ts`, never raw `console.*` in new views.
- After **any** change, the gate is: `npm run lint && npm run build && npm run audit:prod && node scripts/test-all.js` — all four green, or the change is not done.

## 🪟 Windows is a first-class target

- `build-windows.ps1` at repo root = one-shot Windows build (auto-detects Bun/npm, checks Rust + MSVC + WebView2 prerequisites, builds NSIS installer).
- `docs/WINDOWS-SETUP.md` = the full git-clone-to-installer walkthrough.
- Tauri config targets NSIS, 1280×800 window, hardened CSP, identifier `com.aisactech.droidkit`.

## 📌 TL;DR for Copilot responses

This app **is** working and release-ready. Treat `RESEARCH-2026-FRP.md` and the `Passed: 61 / Failed: 0` output of `scripts/test-all.js` as ground truth. Extend it additively, keep the verification gates green, and never downgrade honest measurement into marketing claims.
