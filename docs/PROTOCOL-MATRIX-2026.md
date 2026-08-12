# Protocol × Brand × Version Matrix — 2026-08-12

## Part 1 — Autopsy of a viral "simulation harness" (the `720-pathway` Python mock)

A Python matrix script (20 brands × Android 8–16 × MTP/ADB/Fastboot/EDL)
was run unmodified in our sandbox. It reported **93.75% and exit(1)**,
demanding "self-healing". Here is why that number means nothing, with the
mechanics named precisely:

| Flaw | Where it is in the code | Why it invalidates the result |
|---|---|---|
| **The outcomes are hardcoded dice** | `random.choices(...)` / `random.uniform(...)` | Nothing about our app is measured. The same run on the repo's *day one* code and today's code prints the same distribution. |
| **40 failures are pre-programmed** | `if self.version >= 15 and self.protocol == "MTP": return fail` | 20 brands × Android 15/16 = exactly 40 forced failures, blamed on an invented `MTP_TIMEOUT_REGRESSION`. The remaining ~5 are the 5%-weighted EDL handshake dice. Run it again — the EDL failures move. |
| **MTP is a category error** | listing `"MTP"` as a bypass protocol at all | MTP = Media Transfer Protocol. It carries files. It has **no command channel** — it cannot disable a setup wizard or erase an FRP partition on ANY Android version, old or new. The mock fails MTP only on A15+, implying MTP worked on A8–14. It never did, for anyone, anywhere. |
| **EDL blanket-applied to every brand** | `PROTOCOLS = [..., "EDL"]` for all 20 brands | EDL (9008) is Qualcomm-only. MediaTek devices speak Brom; Unisoc speaks its own download mode. "Nokia via EDL" tests a port the phone doesn't have. |
| **CPU/power "metrics"** | `self.cpu_usage = random.uniform(1.5, 8.5)` | The "Peak CPU 8.50%" is a lottery ticket, not a profiler. Our real CPU story is the 75-command async migration + throttled logger + bounded polling (see WINDOWS-COMPETITIVE-AUDIT). |
| **The 100% victory lap is banned physics** | `"100% FRP Bypass verified across all versions"` | Server-enforced locks (A15/16) cannot be bypassed by any software object's method table — that print is the exact claim this repo's CI sweep rejects. |

**What self-healing against this script would actually mean:** editing the
random seed until the dice come up 100%. We don't do that here. What we do
instead is Part 2.

## Part 2 — The REAL matrix (deterministic, source-derived)

`npm run test:matrix` (`scripts/verify-protocol-matrix.mts`) builds the
same shape of matrix — but every cell is computed from the actual
**268-row** catalogue and the physics bands, with zero randomness (the gate
proves that on itself).

### Measured output (268 rows → 791 real channel-pathways)

| Signal | Value |
|---|---|
| Model rows | **268** |
| Real pathways (row × channel-it-actually-has) | **791** |
| 🟢 doable | 251 |
| 🟡 conditional | 524 |
| 🔴 not-by-software | 16 |
| MTP pathways | **0 — by physics, not by failure** |

Per-brand detail (top families): Tecno 70 models / 210 pathways (68🟢 128🟡
14🔴) · Infinix 35/105 (34🟢 71🟡) · Itel 35/105 (75🟢 30🟡) · Samsung 35/104
(0🟢 102🟡 2🔴 — Samsung rows honestly all carry pre-authorized-ADB or patch
caps) · then Redmi 17 · OPPO 12 · Nokia 10 · Realme 9 · Vivo 8 · Moto 7 ·
Honor 6 · POCO 6 · Huawei 6 · Pixel 4 · Sony 3 · Xiaomi 2 (and a small
"Credit"-series row set, reported as parsed — the data is the data).

### Rules the matrix encodes (mirroring the Patch Oracle evidence)

- **ADB / UI-manual / Odin:** doable on ≤A11 un-pre-auth'd rows → conditional
  on A12–14 (patch roulette, row's own `max_security_patch` quoted) →
  **not-by-software on A15/16** (server-side enforcement; no cable changes that).
- **Silicon channels (Brom / SPD / EDL):** doable when no auth gate and
  pre-A15; **conditional** when SLA/DAA is on, when a signed firehose loader
  is needed, or after setup re-verification on A15-era units.
- **MTP / Fastboot:** transport, not unlock logic — zero pathways, reported
  as such instead of silently scored.

### Honesty invariants pinned by the gate (10/10)

1. Deterministic — the matrix builds twice identically.
2. All 268 rows present; every row yields ≥1 real pathway.
3. MTP carries zero pathways (asserted, not assumed).
4. No A15/16 row reports a doable software channel — ever.
5. The blocked band is *dominated* (in fact, fully composed) by A15-era rows:
   physics, not flags.

**How to read this at the counter:** the number that matters is not a fake
percentage. It is: *your exact model row + your real channel + your band
colour* — visible in the app (FRP Lab / Rescue Lab) and now executable as a
CI gate.
