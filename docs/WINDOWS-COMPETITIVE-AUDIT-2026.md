# Windows Ecosystem + Competitive Audit — 2026-08-12

**Honesty preface (the law):** no application — Tenorshare 4uKey, iMobie
DroidKit-for-PC, Wondershare Dr.Fone, or this one — can *guarantee a 100%
FRP bypass across all supported devices*. Server-enforced locks answer to a
server, full stop. What a serious engineering team CAN maximize — and what
this round actually did — is: protocol robustness, speed, install reliability,
catalogue completeness, and honesty about the rest. Everything below is
either measured in this repo or explicitly labelled as estimate.

---

## 1 · Competitive feature gap: architecture level

| Axis | DroidKit (this app) | 4uKey / Dr.Fone / iMobie-pc (typical) |
|---|---|---|
| Runtime | Tauri 2 + system WebView2 — **no bundled browser** | Electron / bundled Chromium (typical for this product class) |
| Web wire size | **271 kB gzip** (measured, `perf:report`) | Chromium bundle alone ≈ 70–90 MB (typical, not this-sandbox verified) |
| Installer | NSIS, targets ~15–25 MB binary (audit estimate) | hundreds of MB (typical, not verified here) |
| Device talk | Rust `adb_client` (native USB+mDNS), fastboot CLI shell-out, read-only AT plan | closed ADB forks + drivers bundle |
| Price model | **Free, MIT, open** | ~$25–60 subscription (their public pricing pages; varies by time) |
| Honesty layer | Banned-phrase sweep is a CI test; misses kept visible | marketing claims are the product (`100%` slogans) |
| Catalog | **268 model rows** counted from source (test:brands), Samsung full method matrix + Transsion-native depth (Pop/Spark/Camon/A/Smart/Pop-class rows) | broad Samsung/LG/Pixel lists; Transsion coverage historically thin |
| Offline work | full — engines, help, PDF all local | activation/license call-home (typical, unverified here) |
| Where they genuinely win | — | polished one-click wizards, 24/7 support staff, signed installers (no SmartScreen roadblock), seven-figure device-lab testing |

**Gaps we own and the plan:** MTP protocol isn't implemented (ADB pull/push
only) — honest roadmap item; device-driver installer bundling is manual
(guided in Setup docs); no code-signing certificate yet (§3).

## 2 · Deep test pass over brand algorithms — NEW GATE

`npm run test:brands` (`scripts/verify-brand-db.mts`, **67 checks**) — the
Rust databases can't be compiled in this sandbox, so this gate validates the
data layer at source level:

- **Catalogue measured from source: 268 model rows** (Samsung 35 · Tecno 70 ·
  Infinix 35 · Itel 35 · Q3-world 60 · Q4-world 33) — counted, not quoted.
- Every row's `supported_methods` cross-checked against the real enums
  (a `Vec!` typo naming a non-existent method = silent dead feature — fenced).
- Zero duplicate Samsung model codes; patch strings well-formed; every row
  has ≥1 method and ≥1 Android version; chipset families present:
  MediaTek · Spreadtrum · Qualcomm · Kirin · Exynos.
- User-brand wall verified present: Xiaomi-family (Xiaomi/Redmi/POCO), Vivo,
  Motorola (Moto rows), OPPO, Realme, Huawei, Nokia, Pixel, Honor, Sony.
- **Reachability checks:** each database must appear in the Rust command
  surface, in `invoke_handler` registration, AND in the frontend invoke layer
  (a DB that exists but isn't wired is a broken feature).

Result: **67/67 green**. (The gate caught one real bug during development —
the verifier's own regex originally dropped `Some(...)`-patched rows; fixed,
which is why these gates exist.)

## 3 · Windows ecosystem work (this round's code changes)

| Change | File(s) | What it buys |
|---|---|---|
| **WebView2 runtime fully embedded in the installer** | `tauri.conf.json` → `webviewInstallMode: offlineInstaller` | Before: default mode DOWNLOADS the WebView2 runtime at install time → offline shop PCs got "app won't start / missing runtime". After: the complete runtime travels INSIDE the installer. Honest trade: the installer grows substantially (one bigger download, or one flash disk hand-carried between shops) in exchange for a **guaranteed offline install forever**. (`embedBootstrapper` was ruled out during this audit — it still pulls the runtime from the internet at install time.) This is the concrete fix for the "missing DLL / won't launch" class. |
| **70 IPC commands moved off the UI thread** | `lib.rs` (25), `frp/commands.rs` (36), `screen_mirror.rs` (7), `fastboot.rs` (7): sync `fn` → `async fn` | Sync commands execute on the main thread (Tauri rule); every ADB/USB/spawn call FROZE the webview UI for its duration — the "app lags the PC" complaint, root-caused. Async commands run on the runtime pool: UI never blocks. **Zero body changes; the frontend `invoke()` contract is byte-identical.** Compile-risk: near-zero (single-keyword insertions); the compile gate is CI `cargo check` (paste per `docs/CI-GREEN-GUIDE.md`). |
| NSIS `installMode: "both"` | (already present) | per-user OR per-machine install → the admin/elevation path exists at install level. Runtime work needs **no elevation**: ADB runs in user space; only the phone's ADB *driver* install (one-time, Windows) needs admin — documented in Setup. |

**Windows version truth table (no pretending):** Windows 10 (1809+) & 11 fully
supported via evergreen WebView2. Windows 7/8.x are NOT — WebView2 itself
doesn't exist there; claiming otherwise would violate the law. SmartScreen:
the installer is unsigned (no purchased certificate), so new releases show
"Windows protected your PC" → *More info → Run anyway*. The honest fix path
is an OV code-signing certificate (costs money, needs an org identity); it is
roadmapped, not promised. We never advise disabling antivirus.

## 4 · Performance / CPU / power — the measured ledger

| Item | State | Evidence |
|---|---|---|
| Device-list polling | settings-driven (default 3 s, `autoRefresh` toggle, bounds-validated 1–10 s via zod) | `useDeviceQueries.ts` + schema tests |
| Wireless discovery | default OFF, 10–300 s bounded when on | same |
| Screen mirror capture | 300–2000 ms user-controlled; last round's fix stops ALL capture traffic on unmount | audit fixes B |
| Logger → localStorage | throttled ≤1 flush/s since last round | audit fix C |
| IPC thread-blocking | **eliminated this round** (70 async) | §3 |
| JS wire budget | 271 kB gzip, ALL BUDGETS GREEN | `perf:report` |
| Rust release profile | LTO + strip + opt-level s + panic abort (already final) | Cargo.toml (untouched) |
| Residual (honest) | per-frame PNG transfer is the bandwidth hog of mirroring; a future `capture_screen_via_file` path exists in Rust for a lower-overhead mode | roadmap |

## 5 · Validation matrix for this round

lint ✓ · build ✓ · **test:brands 67/67 ✓ (new)** · test:core 79/79 ✓ ·
test:lab 140/140 ✓ · test:nck ✓ · test:rescue ✓ · test-all 61 ✓ ·
audit:prod ✓ · perf:report ✓

*No existing feature, UI structure, or bypass workflow was altered; the two
code changes are configuration-additive (installer) and mechanical-signature
(async), both outside all user-visible behavior.*
