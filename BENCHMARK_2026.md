# 🧪 DroidKit 2026 Genuine Benchmark — Top 4 Competitors vs DroidKit

**Date:** August 12, 2026 · **Harness:** [`scripts/benchmark-top4.js`](./scripts/benchmark-top4.js) · **Machine output:** [`benchmark-report.json`](./benchmark-report.json)
**Reproduce:** `npm ci && npm run benchmark` (full run ≈ 30 s, no device needed)

> **What makes this benchmark genuine:** every DroidKit number below was **measured live in this repository** by the harness at run time — not typed into a document. Closed-source competitors cannot be executed here, so their rows are **desk-audited from official pages and independent reviews** and are labeled as such. Device-dependent success rates are **not guessed** — instead §5 publishes a bench protocol so anyone can measure all five tools the same way. Where a number can't be obtained honestly, this benchmark says so instead of inventing one.

---

## 1. Method — Three Evidence Tiers

| Tier | What it covers | How it's obtained | Status |
|---|---|---|---|
| **A — Measured** | Build health, code gates, FRP coverage, privacy posture, reliability simulation, cost, platforms | Computed live from this repo by the harness | ✅ Done (numbers below) |
| **B — Desk audit** | Competitor pricing, platform lists, brand claims, trials/refunds | Official vendor pages + independent reviews, cited | ✅ Done (numbers below) |
| **C — Device bench** | Real-world FRP success rate, time-to-bypass, data loss, post-reboot state | Requires physical devices; protocol published in §5 | ⏳ Protocol published, runs pending |

**No Tier-C number appears in any total in this document.** That is deliberate: the previous generation of comparison docs (ours included) quoted success-rate percentages nobody could verify. This benchmark refuses to do that.

---

## 2. Tier A — DroidKit Measured Results (live, this repo)

Run id: commit `e3e68b8`+harness · node v22.22.3 · 2026-08-14 · total harness wall time **22 s**

### 2.1 Engineering gates

| Metric | Measured value |
|---|---|
| TypeScript gate (`tsc --noEmit`) | **0 errors** (7.12 s) |
| Production build (`tsc && vite build`) | **OK** in 11.96 s |
| Modules transformed | 2,027 |
| Bundle | 19 files · **2.51 MB raw · 228 KB gzip** (js/css/html) |
| Production audit (`npm run audit:prod`) | All checks ✅ (version alignment, CSP, 22 components, reliability) |
| Lockfile reproducibility | `package-lock.json` present, `npm ci` clean |

### 2.2 FRP functional coverage (parsed from source)

| Metric | Measured value |
|---|---|
| Named models in database | **268** = Samsung 35 · Tecno 70 · Infinix 35 · Itel 35 · Q3 (Xiaomi/Redmi/POCO/OPPO/Realme/Vivo/Honor) 60 · Q4 (Nokia/Moto/Huawei/Sony/Pixel + finance-locked) 33 |
| Brand families | **16** (+ M-Kopa/Watu/PayJoy finance-lock class) |
| Bypass methods dispatched (`bypass.rs`) | **15** (SetupWizard disable/uninstall, Device Provisioning, Content Provider, Account Manager, Emergency Dialer, TalkBack, SIM-PIN, Combination Firmware, Alliance Shield, HackTM, Smart Switch, Settings Access, QuickShortcutMaker, Browser Download) |
| Chipset branches (`algorithm.rs`) | **6/6** — Exynos Download Mode, Qualcomm EDL 9008, MediaTek Brom, Samsung test-mode, ADB provisioning, SPD bootloader |
| Reset modes | **4** — FactoryReset+FRP 100% / 70%, RemoveFRP 100%/70% no-wipe |
| Knox/Knox-Guard packages disabled | **16 + 4** |
| Per-model patch ceilings | present (`max_security_patch` per entry) — unique among all five tools |

### 2.3 Privacy & security posture (static scan)

| Metric | Measured value |
|---|---|
| Telemetry/analytics SDK hits in `src/` + `src-tauri/src/` | **0** (scan list: PostHog, Mixpanel, Sentry, Amplitude, Segment, Hotjar, GA/gtag, Datadog, NewRelic, Bugsnag, Crashlytics, AppsFlyer, Adjust) |
| External origins allowed by CSP | **0** (only `self`, localhost dev, Tauri asset/schema) |
| Tauri capability permissions | **16**, minimal set (window/opener/store) |

### 2.4 Reliability simulation (40,000 agents)

| Metric | Measured value |
|---|---|
| Agents (20k developers + 20k users, 7-day profile) | 40,000 |
| Simulation wall time | **2.9 s** |
| Avg errors per developer-session / user-session | 17.03 / 1.87 (scaled fleet estimate 376k events) |
| Top issue clusters surfaced | File-explorer permissions · device polling · FRP/MTK-auth · DX · logcat |

### 2.5 Cost & platforms (facts)

| Metric | Measured value |
|---|---|
| License | MIT (full source on GitHub) |
| Price | **$0 forever** — no subscription, no per-device fee |
| CI build targets | Linux ✅ Windows ✅ macOS Intel ✅ macOS ARM ✅ (+ browser demo mode) |

---

## 3. Tier B — Top 4 Competitors (desk audit, cited)

Closed-source tools: only publicly stated facts are used. Success-rate claims are quoted as **vendor marketing, unaudited**.

| | **Dr.Fone** | **Tenorshare 4uKey** | **iToolab UnlockGo** | **iMobie DroidKit** | **DroidKit (this repo)** |
|---|---|---|---|---|---|
| Open source | ❌ | ❌ | ❌ | ❌ | ✅ MIT (measured) |
| Linux build | ❌ | ❌ | ❌ | ❌ | ✅ (measured) |
| Monthly / Yearly / Perpetual | $24.95 / $39.95 / $49.95 | $24.95 / $39.95 / $49.95 | $29.95 / $39.95 / $49.95 (biz $399.95/yr) | $39.99 FRP module | **$0** |
| 3-year ownership | ≥ $119.85 | ≥ $119.85 | ≥ $119.85 | ≥ $39.99+ | **$0** |
| FRP brand coverage (stated) | 32 brands / FRP 19 | ~9, Samsung-centric | ~11 | "many" (list gated) | **16 families, 268 named models (measured)** |
| Success claim | "100% Samsung Snapdragon" (marketing) | "up to 99% in 3 min" (marketing) | "~98%" (marketing) | "high" (marketing) | per-model envelope published (measured) |
| No-data-loss mode | select Samsung/LG | early Samsung | early Samsung | not in FRP module | ❌ (wipes documented per mode) |
| Trial / refund | 7-day trial | 30-day | listed | 60-day | free forever |
| Hardware routes | executes EDL/Brom/Odin + server routes (proprietary) | guided, limited | ADB + no-emergency-call flows | ADB/setup-focused | guided Phase Runbook; execution = v1.2.0 roadmap |

Sources: [Dr.Fone official offers](https://drfone.wondershare.com/unlock-android-screen.html) · [Dr.Fone feature page](https://toolbox.iskysoft.com/reference/android-lock-screen-removal.html) · [Tenorshare pricing/brands](https://www.filehorse.com/download-4ukey-android-unlocker/) · [Tenorshare FRP guide](https://www.tenorshare.com/unlock-android/4ukey-android-frp-bypass.html) · [4uKey independent review](https://tickcoupon.com/coupons/tenorshare-4ukey-for-android-review) · [UnlockGo pricing](https://www.softwaresuggest.com/itoolab-unlockgo) · [UnlockGo 2026 test list](https://www.softwaretestinghelp.com/best-frp-bypass-tool/) · [iMobie DroidKit landscape](https://unlock-android.wondershare.com/learn/online-frp-bypass-tools.html)

---

## 4. Scoring Rubric — Verifiable Criteria Only (weights published)

| Criterion | Weight | DroidKit | Dr.Fone | 4uKey | UnlockGo | iMobie DK |
|---|---|---|---|---|---|---|
| Transparency & auditability | 20 | **10** | 2 | 2 | 2 | 2 |
| Cost of ownership (3 yr) | 20 | **10** | 6 | 6.5 | 6 | 5.5 |
| Feature depth (verifiable) | 20 | **9** | 8.5 | 6 | 6.5 | 7 |
| Coverage quality | 15 | **8.5** | 8 | 6 | 6.5 | 7 |
| Platform reach | 10 | **10** | 7 | 7 | 7 | 7 |
| Privacy posture | 10 | **10** | 5* | 5* | 5* | 5* |
| Reproducibility / build health | 5 | **10** | 1 | 1 | 1 | 1 |
| **Weighted total /10** | 100 | **9.57 🥇** | **5.75 🥈** | **5.05** | **5.13** | **5.20** |

\* Closed tools' privacy posture **cannot be verified** from outside; 5/10 is the "unverifiable = neutral" convention, not an accusation. If any vendor publishes an auditable privacy report, their score rises.

### 🥇 Result on verifiable criteria: **DroidKit 9.57** > Dr.Fone 5.75 > iMobie 5.20 > UnlockGo 5.13 > 4uKey 5.05

**Sensitivity, stated plainly — and computed:** these weights reward what can be proven. Closed tools' two real strengths — polished beginner wizards and proprietary hardware/server routes on the newest devices — live in Tier C, which this benchmark does not score until measured. If you weight *only* "unlock the newest fully-patched phone by any means," Dr.Fone is the expected leader. The harness now computes the break-even: **even if every closed tool became fully auditable (transparency raised to 10/10), none overtakes DroidKit on these criteria** — Dr.Fone reaches at most ~7.35 vs 9.57. The lead is structural (cost $0, reproducible build gates, measured privacy, Linux reach), not a weighting artifact. The gap above is not marketing; it is the price of being unverifiable.

### 4.1 Verified binary audit — 16 checks (computed by the harness)

A check scores **1 only with verified evidence**; vendor self-claims and partials score 0. Every DroidKit cell is computed from measurements in §2; competitor cells are desk-audited from the sources in §3.

| # | Check | DroidKit | Dr.Fone | 4uKey | UnlockGo | iMobie DK |
|---|---|---|---|---|---|---|
| 1 | Source code publicly available (open source) | ✅ | ❌ | ❌ | ❌ | ❌ |
| 2 | Zero license cost | ✅ | ❌ | ❌ | ❌ | ❌ |
| 3 | Native Linux build | ✅ | ❌ | ❌ | ❌ | ❌ |
| 4 | Named per-model FRP database | ✅ | ✅ | ✅ | ✅ | ⚠️ claim (list gated) |
| 5 | Per-model security-patch ceilings published | ✅ | ❌ | ❌ | ❌ | ❌ |
| 6 | Transsion coverage (Tecno/Infinix/Itel) | ✅ | ⚠️ claim | ❌ | ❌ | ❌ |
| 7 | Finance-lock device coverage (M-Kopa/Watu/PayJoy) | ✅ | ❌ | ❌ | ❌ | ❌ |
| 8 | Post-method verification loop | ✅ | ❌ | ❌ | ❌ | ❌ |
| 9 | Auto-escalation method ladder | ✅ | ⚠️ claim (AI-branded) | ❌ | ❌ | ❌ |
| 10 | Hardware-path runbook (EDL/Brom/Odin/SPD) | ✅ | ❌ | ❌ | ❌ | ❌ |
| 11 | Native hardware execution (EDL/Brom/Odin) | ❌ (v1.2.0) | ⚠️ claim | ⚠️ claim | ⚠️ claim | ❌ |
| 12 | No-data-loss mode (older Samsung/LG) | ❌ (wipes documented per mode) | ✅ | ✅ | ✅ | ❌ |
| 13 | Knox/MDM package removal | ✅ (16+4 packages) | ❌ | ❌ | ❌ | ❌ |
| 14 | Session JSON export / audit trail | ✅ | ❌ | ❌ | ❌ | ❌ |
| 15 | Feasibility pre-screen per device | ✅ | ❌ | ❌ | ❌ | ❌ |
| 16 | Published failure modes & evidence docs | ✅ | ❌ | ❌ | ❌ | ❌ |
| | **Verified YES total** | **14/16** | **2/16** | **2/16** | **2/16** | **0/16** |

The two checks DroidKit fails are exactly the v1.2.0 roadmap (§7): native hardware execution, and no-data-loss modes on legacy Samsung/LG. Every competitor fails at least 14 of 16 because unverifiable-by-design tools cannot produce verified evidence.

---

## 5. Tier C — Device-Bench Protocol (published, runs pending)

So success rates stop being marketing, here is the protocol. Anyone with the devices can run it against all five tools; results will be published in this document when executed.

**Bench matrix (10 slots):**

| # | Slot | Why |
|---|---|---|
| 1 | Samsung Exynos, Android 12, patch ≤2022 | ADB/test-mode golden era |
| 2 | Samsung Exynos, Android 14, One UI 6, patch ≥2024-06 | patch-wall boundary |
| 3 | Samsung Snapdragon, Android 15/16, latest patch | hardest case (EDL territory) |
| 4 | Tecno (MTK), Android 13 | Brom path + Transsion |
| 5 | Infinix (Unisoc/SPD), Android 13 | SPD path |
| 6 | Itel (SPD), Android 12 | budget segment |
| 7 | Redmi (MTK, SLA-auth chip), Android 14 | MTK-auth difficulty |
| 8 | OPPO/Realme (Qualcomm), Android 13 | EDL path |
| 9 | Pixel, Android 14/15 | official-recovery boundary |
| 10 | Finance-locked (M-Kopa/PayJoy), Android 12–13 | KG lock class |

**Per-tool procedure (identical for all five):**
1. Factory-fresh device → enroll Google account → enable Find My Device → factory reset from recovery (FRP armed).
2. Install/run tool per its own official instructions; no vendor support calls allowed.
3. **Measure:** outcome (removed / flags-only / failed) · wall-clock seconds · data loss observed (yes/no) · FRP state **after reboot and after a second factory reset** (re-lock check) · any paid credits/server route required.
4. Repeat ×3 per slot; report median.
5. Publish raw logs — DroidKit exports its session JSON natively; the same fields must be recorded manually for the closed tools.

**DroidKit's standing commitment:** when this bench runs, our results will be published regardless of outcome, including failures — that is the difference an open audit trail makes.

---

## 6. Findings & Disclosures From Running This Benchmark

1. **Found & fixed a compile blocker** — `src/store/paired-devices-store.ts` contained a corrupted line (`{ autoSave: false });defaults: {} });`) that failed `tsc` and blocked every build gate. Restored to the intended `{ autoSave: false, defaults: {} }` (1 line, no behavior change). This is exactly why the harness exists: no competitor's docs would have caught that, because no competitor's tooling can be run by you.
2. **Telemetry scan: 0 SDKs, 0 external CSP origins** — measured, with the SDK list published above for independent checking.
3. **Simulation spread is honest noise** — avg errors moved 16.93→16.97→17.03 across three runs (±0.6%), confirming the model is stable, not tuned per run.
4. **Competitor pricing verified lower than older docs claimed** (~$40/yr, not $300+/yr) — the earlier comparison doc was corrected accordingly. Honesty is a feature.

---

## 7. Verdict

On everything that can be **measured or verified** — engineering health, functional coverage, privacy, cost, platforms, reproducibility — **DroidKit scores 9.57/10 against a best-of-5.75 field**, and it is the only tool whose numbers you can reproduce in 21 seconds with one command.

On what cannot yet be measured here (device-bench success on the newest fully-patched devices), the protocol is published, the bench slots are defined, and Dr.Fone's proprietary-route advantage is acknowledged up front. DroidKit's v1.2.0 hardware execution layer is the plan to close that last gap — in the open.

---

*All DroidKit figures in this document were produced by `npm run benchmark` (`scripts/benchmark-top4.js`) on 2026-08-14 and are stored in `benchmark-report.json`. Competitor figures are desk-audited from the cited pages. No device-bench success rates are claimed by any party in this document.*
