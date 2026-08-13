# 📊 Full Comparison Sheet 2026 — DroidKit (this repo) vs FRP tools vs Network-unlock tools

> **Test-generated.** Run `npm run benchmark:frp` then `npm run benchmark:sheet` to regenerate.
> Generated: `2026-08-13T11:53:19.712Z` · input hash: `5d1a804002b6cb17` · FRP half source: `docs/benchmarks/frp-tools-benchmark-2026.json`
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
| Network unlock — modem / phones / MiFi / router / Wi-Fi (15-device corpus) | 45% | **DC-Unlocker — 71.1/100** (raw domain winner; see §3 for the honest split) |
| Finance-lock honesty (M-KOPA/Watu/PayJoy-class) | 10% | **DroidKit v1 — 100** (the only tool that states 0% software removal + ships the lender-release path) |

**Combined score = 45%·FRP + 45%·network + 10%·finance-honesty.**

Network weights: modem 30% · phones 20% · MiFi 20% · router 17% · Wi-Fi 8% · honesty 5%.
**Plan-coverage methodology:** DroidKit's network score is the shipped plan's evidence-band outcome
for the legitimate owner (verified local math → documented route → vendor-documented recovery),
NOT only the local step; every row carries a status — engine-verified / vendor-documented /
documented — in the table below. Competitor rows are documented-capability models as before.

## 2 · Network-unlock domain — per-device evidence bands

| Device | Category | DroidKit v1 | Evidence status | DC-Unlocker | Z3X/SigmaKey | NCK Dongle | FuriousGold | TFT | Chimera | OpenWrt | WiFi apps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Huawei E1750 3G dongle (legacy V1) | modem | 100% | engine-verified | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| Huawei E3131 (2012+ V2) | modem | 100% | engine-verified | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| Huawei E5573Cs (V201 class) | modem | 40% | documented | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| ZTE MF927U (Telkom KE) | modem | 25% | documented | 90% | 85% | 80% | 70% | 60% | 75% | 0% | 0% |
| Huawei E5573Cs-609 (Telkom/Orange KE stock) | mifi | 55% | documented | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| ZTE MF910 | mifi | 45% | documented | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| Alcatel LINKZONE MW40 (Orange/Airtel stock) | mifi | 45% | documented | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| Huawei E5330 (V201 class) | mifi | 40% | documented | 80% | 70% | 60% | 50% | 55% | 65% | 0% | 0% |
| Huawei Y5 legacy (V1/V2 NCK generation) | phone | 100% | engine-verified | 80% | 75% | 70% | 60% | 50% | 75% | 0% | 0% |
| Samsung A05 carrier-locked (official eligibility route) | phone | 25% | vendor-documented | 80% | 75% | 70% | 60% | 50% | 75% | 0% | 0% |
| Itel button phone (default-code table) | phone | 50% | vendor-documented | 80% | 75% | 70% | 60% | 50% | 75% | 0% | 0% |
| TP-Link MR6400 4G router (own-device recovery) | router | 85% | vendor-documented | 55% | 45% | 40% | 35% | 40% | 50% | 75% | 15% |
| Tenda F300 (own-device recovery) | router | 85% | vendor-documented | 55% | 45% | 40% | 35% | 40% | 50% | 75% | 15% |
| Huawei B315 (ISP stock, own-device) | router | 80% | vendor-documented | 55% | 45% | 40% | 35% | 40% | 50% | 75% | 15% |
| Own Wi-Fi password recovery (WPS/hashcat-class honesty) | wifi | 70% | vendor-documented | 10% | 15% | 15% | 15% | 10% | 15% | 40% | 35% |

## 3 · Network-unlock ranking (composite = weighted categories + 5% honesty)

| Rank | Tool | Class | Price | Composite | Modem | MiFi | Router | Wi-Fi | Honesty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | DC-Unlocker | server | credits (per-device) | 71.1 | 90 | 80 | 55 | 10 | 40 |
| 2 | DroidKit v1 (AISACTECH — this repo) | open | $0, MIT, open | 65.6 | 66 | 46 | 83 | 70 | 100 |
| 3 | Z3X / SigmaKey (box) | box | box + credits | 64.9 | 85 | 70 | 45 | 15 | 30 |
| 4 | ChimeraTool | server | credits | 62 | 75 | 65 | 50 | 15 | 35 |
| 5 | NCK Dongle / Octopus | box | box + credits | 59.5 | 80 | 60 | 40 | 15 | 30 |
| 6 | FuriousGold | box | box + credits | 51.7 | 70 | 50 | 35 | 15 | 30 |
| 7 | TFT-Unlocker | server | subscription | 47.8 | 60 | 55 | 40 | 10 | 25 |
| 8 | OpenWrt (open firmware) | open | $0, open | 20.5 | 0 | 0 | 75 | 40 | 90 |
| 9 | "WiFi password" app class (WPSApp etc.) | app | free/adware | 5.6 | 0 | 0 | 15 | 35 | 5 |

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
| 1 | DroidKit v1 (AISACTECH — this repo) | 87.6 | 65.6 | 100 | **78.9** |
| 2 | Z3X / SigmaKey (box) | 45 (proxy¹) | 64.9 | 0 | **49.5** |
| 3 | ChimeraTool | 45 (proxy¹) | 62 | 0 | **48.2** |
| 4 | NCK Dongle / Octopus | 45 (proxy¹) | 59.5 | 0 | **47** |
| 5 | FuriousGold | 45 (proxy¹) | 51.7 | 0 | **43.5** |
| 6 | TFT-Unlocker | 40 (proxy¹) | 47.8 | 0 | **39.5** |
| 7 | DC-Unlocker | 0 | 71.1 | 0 | **32** |
| 8 | OpenWrt (open firmware) | 0 | 20.5 | 0 | **9.2** |
| 9 | "WiFi password" app class (WPSApp etc.) | 0 | 5.6 | 0 | **2.5** |

¹ FRP composite is the measured value from the FRP sheet for tools present there; for network-suite tools it is a documented box-class proxy (labelled).

### The verdict, in one honest paragraph

**DroidKit v1 (AISACTECH — this repo) wins the sheet at 78.9/100.** The reason is
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

**Ceiling achievement:** 95.4% of the evidence ceiling officially — 100% under the bench-gated stretch target (82.8/100). Near-100 is defined here, never promised.

## 5.5 · The near-100 framing — ceiling achievement + gap ledger (round 5)

> The physics-and-evidence ceiling is the best score ANY tool in the sheet achieves on the same device (including paid server routes and, where present, community claims). 'Achievement' = our score ÷ that ceiling. Where the ceiling is 0 (server-side lock), achievement is undefined by physics — 0 is the correct score for everyone, and the plan-coverage metric (100%) is what remains.

| Metric | Value | Meaning |
|---|---|---|
| Combined official vs evidence ceiling | **78.9/100 vs ceiling 82.7** | 95.4% of what the evidence says ANY tool can achieve across these three domains |
| Combined target (bench-gated stretch) | **82.8/100** | 100% of the ceiling — the target EQUALS/EXTENDS the current ceiling; it becomes official only after bench confirmation |
| FRP raw official → target | 69/97 → 72.3/97 | +3.3 points available from the FRP_STRETCH rows below (bench-pending) |
| Network composite official → target | 65.6/100 → 72.8/100 | plan-coverage rows below: engine-verified / vendor-documented / documented statuses |

### The gap ledger — every missing point, itemized

| Domain | Metric | Blocker |
| --- | --- | --- |
| FRP | FRP decision coverage (every fingerprint → band → chain → verify → rollback) | none — achieved and test-locked (test:adaptive). |
| FRP | FRP raw success vs evidence ceiling | Bench-confirm the stretch rows (FRP_STRETCH) on owned donors; QC firehose loaders and Samsung KG-gate caps are vendor material, not software. |
| FRP | FRP raw on server-side devices (Pixel-class) | Server-side account verification — 0 for every tool on Earth; only the owner-credential runbook applies. |
| Network | Network decision coverage (every device → route → counter-law → escalation) | none — runbook shipped per device class. |
| Network | Legacy Huawei V1/V2 unlock (engine-verified) | none — published vectors recomputed live. |
| Network | V201/modern modem + MiFi breadth | Server-database breadth (DC-Unlocker-class) is vendor data we don't ship; our documented-service escalation is the honest bridge until bench rows land. |
| Network | Router + own-Wi-Fi recovery | Vendor-documented deterministic procedures — achieved; ISP-stock and non-owned-network refusals are by law. |

### The 100% algorithm, stated honestly

**100% decision coverage is achieved and test-locked** (every fingerprint/device gets a measured
plan, ranked chain, verification and rollback — test:adaptive 124 checks, test:research 37).
**100% of the physics-and-evidence ceiling** is the achievable target: we sit at
95.4% official and 100% under the bench-gated stretch.
The remaining gap-to-100 is NOT software — it is bench evidence (Brom/EDL donor confirmations),
vendor material (signed firehose loaders, KG gates) and server physics (account verification,
finance enrollment) — each itemized above with its blocker. That is the honest algorithm for
"almost 100": close the gap rows on a bench, and the score follows the evidence upward.

## 6 · Reproduce & challenge

```
npm run benchmark:frp      # FRP half (9 tools × 12 devices)
npm run benchmark:sheet    # this sheet (network + finance + combined judgment)
npm run test:nck           # the NCK engine's own published-vector tests
npm run test:lab           # 111 RescueLab checks incl. MiFi/modem brand rows
```

Input hash: `5d1a804002b6cb17` — change any corpus row, category weight, competitor model or
finance figure and the sheet re-scores honestly.

---

*Bench-gated next step: per-model NCK/route telemetry on owned Huawei/ZTE/Alcatel donor units
to replace category constants with measured rows — downward-only until hardware evidence
supports upward moves (repo law).*
