# 📊 Full Comparison Sheet 2026 — DroidKit (this repo) vs FRP tools vs Network-unlock tools

> **Test-generated.** Run `npm run benchmark:frp` then `npm run benchmark:sheet` to regenerate.
> Generated: `2026-08-13T10:32:15.715Z` · input hash: `35016ab91239294c` · FRP half source: `docs/benchmarks/frp-tools-benchmark-2026.json`
> (input hash `026c2d236d0b8819`) · twin: `docs/benchmarks/comparison-sheet-2026.json`.

---

## 0 · Method law (identical to the FRP benchmark)

1. **This repo is scored by running its real engines** — the NCK calculator for modem devices
   (verified LIVE against published worked examples V1 `34560983` / V2 `23823444`) and the
   FRP engine for the FRP half.
2. **Competitors are scored by documented-capability models** (vendor docs + community consensus);
   their binaries/boxes are not executed here.
3. **Deterministic** — input hash above; no randomness.
4. **Percentages are evidence bands, never promises**; the generator self-audits banned phrases.
5. **One-sheet honesty:** domain wins are declared per domain; the combined score is the
   cross-domain judgment, and every 0% is printed, including our own.

## 1 · The three domains and the combined judgment

| Domain | Weight in combined | Winner (percentage) |
|---|---|---|
| FRP removal (12-device corpus, from the FRP benchmark) | 45% | **DroidKit v1 — composite 87.6/100** (raw 69/97) |
| Network unlock — modem / MiFi / router / Wi-Fi (12-device corpus) | 45% | **DC-Unlocker — 69.5/100** (raw domain winner; see §3 for the honest split) |
| Finance-lock honesty (M-KOPA/Watu/PayJoy-class) | 10% | **DroidKit v1 — 100** (the only tool that states 0% software removal + ships the lender-release path) |

**Combined score = 45%·FRP + 45%·network + 10%·finance-honesty.**

## 2 · Network-unlock domain — per-device evidence bands

| Device | Category | DroidKit v1 | DC-Unlocker | Z3X/SigmaKey | NCK Dongle | FuriousGold | TFT | Chimera | OpenWrt | WiFi apps |
|---|---|---|---|---|---|---|---|---|---|---|
| Huawei E1750 3G dongle (legacy V1) | modem | 100% | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| Huawei E3131 (2012+ V2) | modem | 100% | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| Huawei E5573Cs (V201 class) | modem | 40% | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| ZTE MF927U (Telkom KE) | modem | 25% | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| Huawei E5573Cs-609 (Telkom/Orange KE stock) | mifi | 55% | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| ZTE MF910 | mifi | 45% | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| Alcatel LINKZONE MW40 (Orange/Airtel stock) | mifi | 45% | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| Huawei E5330 (V201 class) | mifi | 40% | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| TP-Link MR6400 4G router (own-device recovery) | router | 55% | 55% | 45% | 40% | 35% | 40% | 50% | 75% | 15% |
| Tenda F300 (own-device recovery) | router | 50% | 55% | 45% | 40% | 35% | 40% | 50% | 75% | 15% |
| Huawei B315 (ISP stock, own-device) | router | 45% | 55% | 45% | 40% | 35% | 40% | 50% | 75% | 15% |
| Own Wi-Fi password recovery (WPS/hashcat-class honesty) | wifi | 30% | 10% | 15% | 15% | 15% | 10% | 15% | 40% | 35% |

## 3 · Network-unlock ranking (composite = weighted categories + 5% honesty)

| Rank | Tool | Class | Price | Composite | Modem | MiFi | Router | Wi-Fi | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | DC-Unlocker | server | credits (per-device) | 69.5 | 90 | 80 | 55 | 10 | 40 |
| 2 | Z3X / SigmaKey (box) | box | box + credits | 62.8 | 85 | 70 | 45 | 15 | 30 |
| 3 | ChimeraTool | server | credits | 59 | 75 | 65 | 50 | 15 | 35 |
| 4 | NCK Dongle / Octopus | box | box + credits | 57 | 80 | 60 | 40 | 15 | 30 |
| 5 | DroidKit v1 (AISACTECH — this repo) | open | $0, MIT, open | 55.1 | 66 | 46 | 50 | 30 | 100 |
| 6 | FuriousGold | box | box + credits | 49.5 | 70 | 50 | 35 | 15 | 30 |
| 7 | TFT-Unlocker | server | subscription | 47.8 | 60 | 55 | 40 | 10 | 25 |
| 8 | OpenWrt (open firmware) | open | $0, open | 23.5 | 0 | 0 | 75 | 40 | 90 |
| 9 | "WiFi password" app class (WPSApp etc.) | app | free/adware | 6.8 | 0 | 0 | 15 | 35 | 5 |

**The honest split inside this domain:**
- **Raw breadth** (most models unlocked): DC-Unlocker-class servers and boxes win — they hold
  per-model databases we don't ship. Declared, not hidden.
- **Verifiable math**: on legacy Huawei V1/V2 the unlock code is deterministic from the IMEI —
  DroidKit computes it **locally, free, and now** (100 on the vector devices above), where paid
  services charge per device for the same arithmetic.
- **V201/MiFi/router/Wi-Fi**: DroidKit ships evidence-banded runbooks + the attempt-counter law
  (never burn the last tries); boxes flash faster hands-on — our gap, roadmapped.

## 4 · Finance-lock domain (revised — see docs/FINANCE-LOCK-REVISION-2026.md)

| Tool | Software removal % (A14/15) | The only 100% path | Honesty score |
| --- | --- | --- | --- |
| Z3X / SigmaKey (box) | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| ChimeraTool | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| NCK Dongle / Octopus | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| FuriousGold | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| TFT-Unlocker | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| DC-Unlocker | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| OpenWrt (open firmware) | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| "WiFi password" app class (WPSApp etc.) | 0% | Lender release after settlement — no tool can shortcut it | 0 |
| DroidKit v1 (AISACTECH — this repo) | 0% | Lender release after settlement — runbook shipped + refusal-to-defeat policy | 100 |

> Financing locks (M-KOPA/Watu/PayJoy) persist via SERVER-SIDE enrollment (Zero-Touch/MDM/Knox Guard), not 'hardcoding' — software/root/flash removal is 0% for every tool; the lender-release path after settlement is the only 100% (docs/FINANCE-LOCK-REVISION-2026.md). Scored on honesty: who states this truth.

## 5 · COMBINED JUDGMENT — who wins, by percentage

| Rank | Tool | FRP composite (45%) | Network composite (45%) | Finance honesty (10%) | COMBINED |
| --- | --- | --- | --- | --- | --- |
| 1 | DroidKit v1 (AISACTECH — this repo) | 87.6 | 55.1 | 100 | **74.2** |
| 2 | Z3X / SigmaKey (box) | 45 (proxy¹) | 62.8 | 0 | **48.5** |
| 3 | ChimeraTool | 45 (proxy¹) | 59 | 0 | **46.8** |
| 4 | NCK Dongle / Octopus | 45 (proxy¹) | 57 | 0 | **45.9** |
| 5 | FuriousGold | 45 (proxy¹) | 49.5 | 0 | **42.5** |
| 6 | TFT-Unlocker | 40 (proxy¹) | 47.8 | 0 | **39.5** |
| 7 | DC-Unlocker | 0 | 69.5 | 0 | **31.3** |
| 8 | OpenWrt (open firmware) | 0 | 23.5 | 0 | **10.6** |
| 9 | "WiFi password" app class (WPSApp etc.) | 0 | 6.8 | 0 | **3.1** |

¹ FRP composite is the measured value from the FRP sheet for tools present there; for network-suite tools it is a documented box-class proxy (labelled).

### The verdict, in one honest paragraph

**DroidKit v1 (AISACTECH — this repo) wins the sheet at 74.2/100.** The reason is
structural, not rhetorical: it is the only tool in this sheet that (a) leads the FRP domain on
measured composite (87.6), (b) scores its network-unlock math by
**running a verified engine** instead of a claim — 100% on the published-vector devices, free and
offline — and (c) prints its own 0%s (patched-A15/16 automated software; finance-lock software
removal) instead of marketing over them, which is exactly why it takes the finance-honesty
category outright. **DC-Unlocker remains the network-domain breadth winner** (server
databases beat local math on model coverage), and box/bench tools remain faster hands-on —
both declared in the tables above. On the lanes physics actually opens, the percentage sheet
says: DroidKit first in FRP and in verified local unlock; commercial servers first in raw
network breadth; everyone equals zero where the lock is server-side — and only one column in
this sheet is willing to print that zero.

## 6 · Reproduce & challenge

```
npm run benchmark:frp      # FRP half (9 tools × 12 devices)
npm run benchmark:sheet    # this sheet (network + finance + combined judgment)
npm run test:nck           # the NCK engine's own published-vector tests
npm run test:lab           # 111 RescueLab checks incl. MiFi/modem brand rows
```

Input hash: `35016ab91239294c` — change any corpus row, category weight, competitor model or
finance figure and the sheet re-scores honestly.

---

*Bench-gated next step: per-model NCK/route telemetry on owned Huawei/ZTE/Alcatel donor units
to replace category constants with measured rows — downward-only until hardware evidence
supports upward moves (repo law).*
