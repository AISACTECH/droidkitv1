# DroidKit v1.1.0 🧑‍💻📱

<div align="center">
  <img src="public/droidkit-icon-128.png" alt="DroidKit" width="128" height="128" />
  <h3>Enterprise-grade Cross-Platform Android Toolkit</h3>
  <p><strong>DroidKit</strong> is a production-ready desktop application for Android developers, technicians, and power users — ADB file/app/logcat management, system diagnostics, wireless pairing, screen control, and an evidence-based FRP (Factory Reset Protection) toolkit covering 260+ models across Samsung, Tecno, Infinix, Itel, Xiaomi, Redmi, POCO, OPPO, Realme, Vivo, Honor, Nokia, Motorola, Huawei, Sony, Pixel and finance-locked devices.</p>

  <p>
    <img src="https://img.shields.io/badge/version-1.1.0-blue" />
    <img src="https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
    <img src="https://img.shields.io/badge/Rust-2021-orange?logo=rust" />
    <img src="https://img.shields.io/badge/license-MIT-green" />
  </p>
</div>

---

## ⚖️ Honest Scope — Read This First

We publish our evidence, not just our claims. Independent 2026 research (see [`RESEARCH-2026-FRP.md`](./RESEARCH-2026-FRP.md) and the verdict transcript in [`DEBATE-AI-VS-GOOGLE.md`](./DEBATE-AI-VS-GOOGLE.md)) establishes the envelope **every** FRP tool on Earth operates in:

- ✅ **ADB-based methods genuinely work** when USB debugging was enabled & authorized before reset, or when a live authorization route exists (Samsung test-mode `*#0*#` where unpatched, SPD auto-ADB, MTK Brom erase via open-source protocols like MTKClient).
- ⚠️ **Android ≤13 / pre-2023 patches**: broad software-method coverage. **Android 14–16 recent patches**: software-only routes are mostly closed industry-wide — chipset hardware paths (EDL/Brom/Odin) or official recovery apply. No vendor, commercial or otherwise, escapes this wall.
- 🎯 DroidKit's in-app **Research Reality Check** tells each user which band their device is actually in before they spend an attempt — measured, not marketed.

> **Legal**: FRP removal is lawful on devices you own (e.g. second-hand purchases, forgotten credentials). Bypassing locks on stolen devices is illegal. DroidKit is built for legitimate recovery — own devices only, backup first.

---

## ⚡ Unreleased — FRP Adaptive Engine (new feature)

The three-algorithm brief (Adaptive Exploit Automation · UI & Behavior Interaction · System Partition Patching) lands as a first-class feature — not bolted onto the experimental Developer Lab, not scattered across views. One pipeline, one test surface, one honesty contract:

- **Decision**: `src/lib/adaptive-engine/` — fingerprint → evidence feasibility band (Android 15/16-aware) → ranked exploit chain with fallbacks, escalation policy, refusal plans, warnings, verification loop
- **Interaction**: rule-based FRP UI state machine (9 OEM flow tables, uiautomator-dump classifier, probe-budget fallback to manual guidance, seeded simulator) + humanization module (jittered timers, tap offsets, key pacing)
- **Partition safety**: read-only survey (`frp_partition_survey`, getprop + `ls` only) + AVB honesty statement + rollback plans that refuse persistent steps without pre-captured backups
- **Journal**: success AND failure cases logged per fingerprint, JSON export for the bench feedback loop
- **Verify**: `npm run test:adaptive` — 66 checks covering the band matrix (Android 12→16), decision determinism, FSM reachability/classifier/fallback, humanize bounds, read-only guarantees, rollback refusal, journal roundtrip
- Full decision rationale + task board: [`docs/FRP-ADAPTIVE-ENGINE-PLAN.md`](./docs/FRP-ADAPTIVE-ENGINE-PLAN.md)

**What "100% solution" means here — honestly**: 100% *decision coverage* — every device fingerprint maps to a measured band, a ranked plan, verification and rollback. On fully-patched Android 15/16 the software window is closed for every vendor on Earth (see [`RESEARCH-2026-FRP.md`](./RESEARCH-2026-FRP.md)); the engine routes those devices to the chipset/hardware runbooks or official recovery, and refuses unsafe or impossible claims. "Undetectable partition patching" is not offered because Verified Boot makes it physically impossible without the vendor's signing keys — the engine says so, in the UI and in the tests.

---

## ✨ What's New in 1.1.0

- 🧪 **FRP Developer Lab (EXPERIMENTAL)** — opt-in developer view that closes gaps #6/#7/#8 from [`FRP-ALGORITHM-ANALYSIS.md`](./FRP-ALGORITHM-ANALYSIS.md):
  - **Auto-escalation engine** — runs an evidence-ranked ADB ladder (provisioning → content-provider → wizard disable → wizard uninstall) without manual babysitting
  - **Verification loop** — re-detects FRP state after *every* method and compares before/after, emitting a measured verdict: `removed_verified (92%)` · `flags_set_unverified (70%)` · `escalated_failed (0%)`
  - **Truthful progress** — deterministic weighted plan (handshake 5 · snapshot 10 · 4×(run 14+verify 6) · verdict 5), no cosmetic animations
  - **Phase Runbook** — chipset hardware paths (EDL/Brom/Odin/SPD) driven by real `algorithm.rs` phase weights as an interactive checklist
  - **Session journal + JSON export** for developer artifacts
- 📊 **Research Reality Check panel** in FRP Removal — computes a feasibility band per scanned device from Android version + security patch + chipset, and routes to the method class the 2026 evidence supports (ADB window / test-mode / Odin / Brom / EDL / official recovery)
- 🔗 **Evidence dossiers committed** — `RESEARCH-2026-FRP.md`, `DEBATE-AI-VS-GOOGLE.md`, `docs/PHYSICS-LAYER-RESEARCH.md`, `docs/RESCUE-LAB-RESEARCH.md`, `docs/COMPARISON-2026-FINAL.md` (experimental lanes: FRP Lab 🧪 Patch Oracle 🔮 + Rescue Lab 🛠️ multi-device repair bench — both under the bands-not-promises honesty law; user-runnable verification: `npm run test:lab` 111 checks + `test:nck` + `test:rescue`)
- ❓ **Help & Info view + full-colour PDF guide** — searchable in-app Help Center (policies, setup, every tool, FAQ, glossary; works with no device connected) rendered from one shared content module, plus the printable 16-page `docs/DROIDKIT-HELP-GUIDE.pdf` (`npm run build:help-pdf` regenerates it; a bundled copy ships in-app as `/help-guide.pdf`)
- 🧹 **Fresh-clone polish** — removed noisy `husky` prepare hook, synced lockfile, replaced unverified third-party APK mirror URLs with neutral web-search launches, corrected research-outdated instruction text (browser-APK/TalkBack patch era, combination firmware reframed as legacy Android 6–9)

---

## 📦 Features

### 🛡️ FRP Toolkit — 260+ Models, Evidence-Gated
- **Samsung (35)** + 15 methods: SetupWizard disable/uninstall, Device Provisioning, Content Provider, Account Manager launch, Emergency Dialer/`#0#` test-mode flow, TalkBack (legacy), SIM-PIN (legacy), Settings access, QuickShortcutMaker, Alliance Shield, Smart Switch, Combination Firmware (legacy)
- **Tecno (70)** — Pop / Spark / Camon / Pova / Phantom · MTK Brom erase, SPD bootloader, MTK Auth Bypass, HiOS menu
- **Infinix (35)** & **Itel (35)** — full Q2 Transsion catalogue with Kenya availability flags
- **Q3 (60)** — Xiaomi, Redmi, POCO, OPPO, Realme, Vivo, Honor
- **Q4 (33)** — Nokia, Moto, Huawei, Sony, Pixel + M-Kopa/Watu/PayJoy finance-locked
- **Universal Algorithm Engine** — auto-detects Exynos / Qualcomm / MediaTek / Spreadtrum / Kirin, selects chipset-branch (Download-Mode, EDL 9008, Brom, SPD) with per-phase weights and success rates
- **Reset modes** — Factory Reset + FRP 100% / 70%, with or without data wipe; Knox removal; USB-debugging handshake verification
- **🧪 Developer Lab** — auto-escalation + verification loop + truthful progress (see *What's New*)

### 📟 Device Management
USB + wireless (mDNS) auto-discovery, QR/pairing-code wireless pairing, real-time status, multi-device switching, model/Android/SDK/serial display, AVD launching.

### 📁 File Explorer · 📋 App Manager · 📊 Logcat · 🖥️ Shell
Browse `/sdcard` & `/data` with breadcrumbs/history/download-to-Desktop; list apps filtered system/user; real-time logcat with level filters, search, export; per-device shell terminal.

### 🩺 System Info · 📈 Performance · 📱 Screen Control
7 system-info cards with cached queries; live CPU/MEM/battery/top-processes (8s toggleable); screenshot, 5s screenrecord, wake/unlock, tap/swipe/keyevent/text injection via reflection window with cursor control.

### ⚙️ Settings
Appearance (light/dark/system), Android SDK path, device polling, download paths, logcat tuning — Zod-validated, persisted via `tauri-plugin-store` (atomic writes, 30s autosave).

---

## 🚀 Getting Started (Fresh Clone)

> **🪟 Windows user?** Full git-clone-to-installer walkthrough with one-command `winget` setup: [`docs/WINDOWS-SETUP.md`](./docs/WINDOWS-SETUP.md). TL;DR: install Git + Node LTS + Rust + VS Build Tools (`winget` lines inside), `git clone https://github.com/AISACTECH/droidkitv1.git`, `npm ci`, `npm run tauri:dev` — or build the NSIS installer with `powershell -ExecutionPolicy Bypass -File .\build-windows.ps1`.

### Prerequisites
| Tool | Min Version | Notes |
|------|-------------|-------|
| Node.js | 18+ | npm 9+ bundled |
| Rust stable | 1.75+ | only for the desktop app: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Android SDK | latest | `ANDROID_HOME` set, `adb` on PATH |
| Linux only | webkit deps | `sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf` |
| Windows only | MSVC + WebView2 | see the Windows guide — usually two `winget` lines |

### Install & Run

```bash
git clone https://github.com/AISACTECH/droidkitv1.git
cd droidkitv1
npm ci                      # reproducible install from lockfile

# Option A — Browser mock mode (no Rust needed): full UI + 260-model mock catalogue
npm run dev                 # → http://localhost:1420

# Option B — Real desktop app (connects to physical devices over USB/TCP)
npm run tauri:dev

# Production
npm run build               # tsc --noEmit gate + vite build → dist/
npm run tauri:build         # native bundles → src-tauri/target/release/bundle/
```

### Verify the build yourself
```bash
npm run lint                # tsc --noEmit — must be clean
npm run audit:prod          # versions aligned, CSP hardened, components present, build health
npm run simulate            # quick 1k+1k agent smoke simulation
npm run simulate:full       # full 20k devs + 20k users simulation
```

---

## 🧭 Using the FRP Lab (experimental)

1. Select a device from **Devices**.
2. Open **FRP Lab 🧪** in the sidebar.
3. Press **Run Engine** — it handshakes, snapshots the device, reads the Research Reality Check band, walks the ADB ladder, and verifies state after each method.
4. Verdict **flags_set / removed_verified** → reboot the device (`Shell: adb reboot`) and re-run to confirm an **Inactive** snapshot — that reboot observation is the honest final check.
5. Verdict **escalated_failed** → open the **Phase Runbook** for your chipset and execute the hardware path (EDL/Brom/Odin/SPD) phase-by-phase.
6. Export the session JSON for support/escalation reports.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 4 · shadcn/ui (19 primitives) · TanStack Query 5 (offlineFirst + exponential backoff) · lucide-react 0.575 · Jost Variable
- **Backend**: Tauri 2 + Rust (edition 2021) · `adb_client` 3.1 (USB + mDNS) · tauri-plugin-store 2 · hardened CSP · minimal capabilities
- **Release profile**: `opt-level=s + LTO + strip + panic=abort` → ~15–25 MB binary
- **Quality gates**: `tsc --noEmit` in build · production audit script · 40k-agent simulation suite · CI via GitHub Actions (publish workflow for Ubuntu/Windows/macOS+ARM+Intel)

---

## 🏗️ Project Structure (1.1.0)

```
droidkitv1/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx · AppSidebar.tsx · MainContent.tsx
│   │   ├── ui/                        # 19 shadcn primitives
│   │   └── views/
│   │       ├── FrpRemoval.tsx         # FRP Removal view (260+ model catalogue, reset modes, Knox)
│   │       ├── FrpRemoval/
│   │       │   ├── RealityCheck.tsx   # NEW 1.1.0 — evidence-based feasibility panel
│   │       │   ├── BrandRibbon.tsx · ModelBrowser.tsx · DeviceStatusPanel.tsx
│   │       │   └── LegacyFrpRemoval.tsx
│   │       ├── DeveloperLab.tsx       # NEW 1.1.0 — experimental engine + verification loop
│   │       ├── FileExplorer · AppManager · LogcatViewer · ShellTerminal
│   │       ├── PerformanceMonitor · ScreenControl (real implementations)
│   │       ├── system-info/ (7 cards) · settings/ (6 categories)
│   ├── hooks/ · lib/ (frp-commands, logger, query-client, settings-schema)
│   └── mocks/                         # browser-mode mock IPC — full catalogues
├── src-tauri/
│   └── src/
│       ├── adb_commands/              # device, discovery, files, logcat, packages, pairing
│       ├── frp/                       # detector, bypass (15 methods), algorithm engine,
│       │                              #   commands, reset+knox, 6 model databases
│       ├── fastboot.rs · screen_mirror.rs · system_info.rs · emulator.rs
│       └── lib.rs                     # all Tauri commands registered here
├── scripts/ (production-audit.js · simulate-large-scale.js · test-all.js)
├── docs/  (comparisons, UI reports, workflow guides, screenshots)
├── RESEARCH-2026-FRP.md               # NEW 1.1.0 — evidence base with sources
├── DEBATE-AI-VS-GOOGLE.md             # NEW 1.1.0 — the claim vs the app, scored
├── FRP-ALGORITHM-ANALYSIS.md          # gap analysis this release closes (frontend side)
├── PRODUCTION_REPORT.md · CHANGELOG.md · simulation-report.json · simulation-feedback.md
└── .github/workflows/publish.yml      # Tauri builds for Linux / Windows / macOS (ARM+Intel)
```

---

## 🗺️ Roadmap

**v1.1.0 ✅ (this release)**
- [x] Research Reality Check (patch/version/chipset evidence gating)
- [x] Developer Lab: auto-escalation engine, post-method verification loop, deterministic progress
- [x] Phase Runbook from real algorithm weights · session JSON export
- [x] Research dossiers + debate verdict committed · clone-polish fixes

**v1.2.0 🔮 Next (needs hardware bench)**
- [ ] Native hardware execution layer: MTK Brom erase integration (mtkclient-protocol class), Qualcomm EDL firehose, Odin/Heimdall flashing — validated on real devices
- [ ] Post-reboot verification watcher (auto re-scan on device reconnect)
- [ ] Keyboard shortcuts + command palette · shell history/autocomplete
- [ ] APK install/uninstall · Playwright e2e

---

## 🤝 Contributing

Fork → branch `feature/x` → `npm run audit:prod` must stay green → PR.

## 📄 License

MIT © 2025–2026 AISACTECH — see [LICENSE](./LICENSE).

Built with ❤️ for the Android developer community.
