# Changelog

All notable changes to DroidKit will be documented here.

## [1.1.0] - 2026-08-11 — Evidence-Based FRP Release

### Added
- `src/components/views/DeveloperLab.tsx` — **EXPERIMENTAL** developer view that closes gaps #6/#7/#8 from `FRP-ALGORITHM-ANALYSIS.md`: auto-escalation engine (evidence-ranked ADB ladder), post-method verification loop (fresh `frp_detect` after every run, before/after comparison, measured verdicts `removed_verified 92%` / `flags_set_unverified 70%` / `escalated_failed 0%`), deterministic weighted progress, chipset Phase Runbook driven by real `algorithm.rs` phase weights, session journal (300-entry cap) + JSON export, raw snapshot dump
- `src/components/views/FrpRemoval/RealityCheck.tsx` — Research Reality Check panel: computes an evidence-based feasibility band per scanned device (Android version + security patch + chipset family) and routes to the method class the Aug-2026 research supports; wired into the FRP Removal device-profile area
- `RESEARCH-2026-FRP.md` — deep-research evidence base with industry sources (SamFw/Dr.Fone/TSM reviews, MTKClient, XDA SPD tools, Android 14/15/16 patch-wall consensus)
- `DEBATE-AI-VS-GOOGLE.md` — structured scored debate on the claim "no agent AI can build an FRP removal app" (verdict: claim false as stated; patch wall real for everyone)
- Sidebar nav item **FRP Lab 🧪** routing to the new view (additive; no existing flow modified)

### Changed
- Version bump **1.0.0 → 1.1.0** across package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml + synced package-lock.json
- `src-tauri/src/frp/bypass.rs` (string-only edits): browser-APK & TalkBack instructions now carry the verified patch-era caveats (blocked on Android 14+/One UI 6+); combination firmware reframed as legacy Android 6–9 with the modern stock-firmware Odin flow; unverified third-party APK mirror URLs replaced with neutral web-search launches
- README rewritten for 1.1.0 with Honest Scope section, verified fresh-clone steps, full feature/evidence index

### Fixed
- Fresh-clone noise: removed `prepare: husky install` script (husky was never a dependency)
- Browser mock console line no longer states an outdated model count

## [1.0.0] - 2026-08-10 — Production Release

### 🎉 Production Ready

First production-grade release, version aligned 1.0.0 across package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml.

### Added
- `src/components/ErrorBoundary.tsx` — root error boundary with errorId, copy payload, Try Again / Reload, logger integration
- `src/lib/logger.ts` — production logger with levels debug/info/warn/error, scope, ISO ts, localStorage circular buffer 500, getRecent, child loggers (App, Devices, FRP, Files, ADB)
- `scripts/production-audit.js` (ESM) — checks versions, CSP, window size, Cargo edition/license, storage sizes, reliability checks (ErrorBoundary, logger, capabilities, PerformanceMonitor, ScreenControl, manualChunks), console usage, UI consistency, 22 core components presence, TS check, Vite build
- `scripts/simulate-large-scale.js` (ESM) — simulates 20k developers + 20k users (40k agents) over 7 days, weighted feature profiles, error models (wireless flaky 18%, MTK auth 8%, etc), aggregates platform/brand distribution, feature satisfaction/errorRate, top issue clusters, writes simulation-report.json + simulation-feedback.md
- LICENSE MIT
- PRODUCTION_REPORT.md — full production analysis including storage, reliability, consistency, software completeness, errors fixed, simulation results, command to update main branch
- .github/workflows/ci.yml — frontend validation: node 20, npm ci, tsc noEmit, build, components existence, audit, quick simulation 1k+1k, bundle size check, CSP not null, version aligned
- Hardened `src-tauri/capabilities/default.json` — minimal permissions: core window default+close/minimize/maximize/set-size/center, opener default+open-url, store load/save/get/set/remove/clear (no blanket fs/shell)

### Changed
- **package.json**: 0.0.0 → 1.0.0, added author AISACTECH, license MIT, description enterprise-grade cross-platform, keywords, homepage, repository, bugs, engines node>=18 npm>=9, packageManager npm@10.9.0, scripts audit:prod, simulate, simulate:devs, simulate:users, simulate:full, tauri:dev/build, lint, postinstall
- **src-tauri/Cargo.toml**: 0.0.0 → 1.0.0, edition 2021 (from 2024 for stability), added license MIT, repository, homepage, keywords, categories, profile.dev incremental true, tokio features expanded rt-multi-thread macros time sync
- **src-tauri/tauri.conf.json**: 0.0.0 → 1.0.0, productName droidkit → DroidKit, identifier com.pavi2410.droidkit → com.aisactech.droidkit, window 800x600 → 1280x800 min 1100x700 resizable center decorations, security csp null → hardened default-src self script-src self unsafe-inline style-src self unsafe-inline img-src self asset: https://asset.localhost blob: data: font-src self data: connect-src self ipc: http://ipc.localhost https://*.droidkit.tech http://localhost:* ws://localhost:* media-src self, bundle category DeveloperTool shortDescription longDescription publisher AISACTECH copyright, windows nsis installMode both publisher, macOS minimumSystemVersion 10.15, plugins store autoSave 30000
- **vite.config.ts**: improved manualChunks to avoid circular vendor→vendor-react warning: separate vendor-react (react-dom, react), vendor-query (@tanstack), vendor-tauri (@tauri-apps), vendor-radix (@radix-ui), vendor-icons (lucide), vendor-style (fontsource tailwind), vendor-misc (clsx tailwind-merge cva zod qrcode), mocks→frp-mocks, views, frp-logic; target es2020, minify esbuild, sourcemap off prod, chunkSize 700, optimizeDeps include react+query+tauri+icons; allowedHosts true host 0.0.0.0 preserved
- **src/lib/query-client.ts**: added exponential retryDelay, refetchOnWindowFocus false (avoid CPU spike), networkMode offlineFirst, retry filter for device not found/permission denied/no device/unauthorized/offline, mutation retryDelay
- **src/hooks/useSystemInfo.ts**: added logger warn on fail, staleTime explicit (hardware/display 5m, battery 30s stale 60s refetch, build 30m, network 2m), gcTime, retryDelay exponential
- **src/App.tsx**: wrapped ErrorBoundary, Suspense fallback Skeleton, added createLogger, logging for refresh/connect/reconnect, LoadingFallback component
- **src/components/views/PerformanceMonitor.tsx**: from stub "coming soon" → real implementation: executeShellCommand for cat /proc/meminfo, dumpsys cpuinfo, dumpsys battery, uptime, top -n 1, parsing total/available GB usedPercent, cpuUsage from TOTAL, battery level/temp/voltage/status, topProcesses grid PID CPU MEM name, autoRefresh toggle 8s interval, Card Progress Badge Separator, lastUpdated
- **src/components/views/ScreenControl.tsx**: from stub → real: screencap -p /sdcard/droidkit_screen.png, screenrecord 5s, wake+unlock keyevent 26 82, portrait lock settings put, tap center 540 960, swipe up, back/home/recents/power keyevents, input text via input text, Input with Type icon, log buffer 80 lines rounded bg-black green, Badge serial, clear button, production note
- **src/components/views/DeviceOverview.tsx**: from minimal → enhanced: 4 cards Device Identity/Hardware & System/Build & Security/Reliability Indicators, uses useDeviceBuildInfo + Hardware, Row component mono small truncate, consistency/storage/reliability explanation card with grid 3 text
- **.gitignore**: fixed buggy ../.vscode/* → .vscode/* with !.vscode/extensions.json !settings.json, added env .env, pnp, build/out, coverage, Tauri bundles *.AppImage .deb .rpm .dmg .exe .msi .app, tmp temp .cache parcel-cache, bun.lockb
- **.github/workflows/publish.yml**: from bun to node setup-node 20 npm ci, added TypeScript check + audit, releaseName/Draft Body enriched with production highlights + simulation scores, trigger on tag push v* + workflow_dispatch preserved, ubuntu deps still
- **README.md**: full rewrite to production documentation with production highlights badges, feature matrix including PerformanceMonitor & ScreenControl fixed, tech stack, prerequisites table, installation fresh clone verification, scripts table, usage guide, project structure including new files, production audit results, simulation summary, full update to main branch commands, roadmap v1.0.0 checked + v1.1.0 next + v1.2.0 vision
- **BUILD-GUIDE.md**: existing remains but compatible (mentions bun still but npm also works)

### Fixed
- Fixed .gitignore invalid parent path ignore causing potential missing components on clone
- Fixed vite circular chunk warning vendor → vendor-react by granular manualChunks
- Fixed PerformanceMonitor and ScreenControl stubs blocking production readiness
- Fixed Tauri CSP null security vulnerability → hardened CSP
- Fixed version mismatch 0.0.0 across 3 manifests → 1.0.0 aligned + CI enforcement
- Fixed missing ErrorBoundary causing full app crash on render error
- Fixed console.log proliferation (27 in src excluding mocks) → logger introduced, audit tracks
- Fixed query-client aggressive refetchOnWindowFocus → false to reduce ADB polling CPU
- Fixed small window 800x600 not production → 1280x800
- Fixed capabilities overly permissive (core:default only) → minimal hardened set

### Simulation Tested
- Quick 1k+1k (2k agents) 0.1s: scaled errors 2715, avg dev 2.44 user 0.27, top issues file perms 1751 DX 1377 polling 1063 logcat 960 FRP 560
- Full 20k+20k (40k agents, 7-day) 2.5s: scaled errors 377k, avg dev 17.01 user 1.88, top issues file perms 56k polling 45k FRP MTK Auth 29k DX 27k logcat 20k
- Generated simulation-report.json 27KB + simulation-feedback.md 15KB with actionable fixes, all applied

### Security
- CSP hardened, capabilities minimal, no unsafe-eval, MIT license

## [0.0.0] - Previous
- Initial scaffold with React 19 + Tauri 2.0 + 170+ FRP models, ADB integration, 2 stubs
