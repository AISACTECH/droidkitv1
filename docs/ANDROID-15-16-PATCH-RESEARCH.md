# 🔬 Isolated Research — Android 15 & 16 Patch Digest (FRP Enforcement, Aug 2026)

> Round 3 of the Adaptive Engine program. Research performed 2026-08-13 from public sources
> (vendor walkthroughs, field reports, Google/developer documentation). This dossier is the
> knowledge input for `src/lib/adaptive-engine/parallel.ts` — the isolated research-application
> layer. **Existing engine modules (bands / decision / catalog / fsm / partition-safety) were
> NOT modified** — the regression snapshot in `scripts/verify-parallel-research.mts` proves it.

---

## 1. What Google actually patched in Android 15 (digest)

| # | Patch | Layer | What it closed | What remains |
|---|---|---|---|---|
| P1 | **FRP enforcement moved into the system core**, not just the setup wizard. Bypassing part of setup no longer clears the lock; the device can still block new Google accounts, new screen locks, and app installs. | os | Wizard-skip persistence, partial setup "finishes" | Below-OS lanes (bootrom/bootloader); pre-authorized ADB window |
| P2 | **Ownership-verified install gate**: app installation is blocked until ownership is verified — random FRP "helper" APK sideloads die during setup. | app | APK-sideload class (Alliance Shield, QuickShortcutMaker installs) | None at app layer — the class is gone |
| P3 | **OEM-unlock no longer disables FRP** on many devices — "enable OEM unlock then reset" is dead. | bootloader | Fastboot `erase frp` via unlocked bootloader on many models | Chipset bootrom lanes; Download-Mode tool classes |
| P4 | **TalkBack / hidden-settings / browser-hop routes patched or restricted** (model/region/patch dependent). | app | The entire Android ≤12-era trick suite | Nothing (legacy-only in our catalog — correctly age-tagged) |
| P5 | **Play Integrity, May 2025 baseline**: ALL verdicts (basic/device/strong) became hardware-backed; strong additionally requires a security patch < 12 months old across partitions incl. vendor. Platform key attestation baseline; Android platform root certificate rotation scheduled Feb 2026. | hardware | Any software-only "integrity hiding" without a valid OEM keybox | Nothing legitimately — see §4 hide/seek verdict |

Sources: itoolab A15 guide, Wondershare A15 walkthrough, developer.android.com Play Integrity blog, Microsoft Intune strong-integrity support note, r/Magisk May-2025 discussion.

## 2. What Google patched in Android 16 (digest)

| # | Patch | Layer | What it closed | What remains |
|---|---|---|---|---|
| P6 | **USB/debugging access limited before setup completes** — ADB-style bypass during setup "mostly fails" on updated devices. | os | ADB-before-setup (the whole precondition for the ADB ladder) | Pre-authorized ADB (rare on reset devices); below-OS lanes |
| P7 | **APK install methods blocked during setup** (carry-over hardening from P2). | app | Setup-screen APK routes | None |
| P8 | **Patch-level ratchet**: a method working on one A16 security patch fails after the next OEM update (Samsung January-2026 patch closed browser-based + APK-injection bypasses; Emergency-Call+Calculator ❌ on 15/16; TalkBack ❌ since 14; Alliance Shield ❌). | os/app | Re-farmed app-layer routes per-patch | Chipset lanes + IMEI-server services + official recovery |
| P9 | **Samsung Binary 18 / KG-State Prenormal**: on recent binaries, the processor-level Knox Guard blocks USB *data channels* (MTP/ADB/serial) while the OS is on — only charging passes; `*#0808#` USB-routing commands and the `*#0*#` test menu are blocked. | bootloader/hardware | The SamFW-class test-mode→ADB flow on newest Samsung firmware | Download-Mode tool classes (TFM-class), EDL/Brom, official routes |
| P10 | **Pixel strictness**: settings/browser blocked during setup; device talks directly to Google servers; per-patch closures on 14→15→16. | os/server | All manual tricks on Pixel | Owner recovery / official only (as our band model already routes) |

Sources: Wondershare A16 walkthrough, mobifirms A15/A16 method-status table, r/FRPbypassSamsung (Binary 18 / KG Prenormal field report), nokiamob Pixel analysis.

### 2.1 Field-method status table (aggregated, labeled as community-reported)

| Method class | A14 | A15 | A16 | Our catalog status |
|---|---|---|---|---|
| Pre-authorized ADB ladder | conditional | conditional (rare) | conditional (rare) | `adb_flags` — window-gated |
| `*#0*#` test-mode → ADB | narrowing | ❌ mostly | ❌ (Binary 18 blocks) | `samsung_test_mode` — contested→blocked |
| TalkBack / browser / SIM-PIN | ❌ mostly | ❌ | ❌ | legacy age-tagged, ≥12 only |
| Emergency-dialer shortcuts | ⚠️ some | ❌ | ❌ | `emergency_dialer_shortcut` ≤13 |
| Download-Mode tool class (TFM-class, combination+ADB) | ✅ | ✅ | ✅ (tool-updated) | `exynos_download_mode` runbook |
| "MTP-mode" tool claims (Griffin-class) | ✅ claimed | ✅ claimed | ✅ claimed | ⚠️ see §2.2 |
| EDL / Brom / SPD (below-OS) | ✅ where supported | ✅ | ✅ | `qualcomm_edl` / `mediatek_brom` / `spd_bootloader` |
| IMEI-server services / official recovery | ✅ | ✅ | ✅ | `official_recovery` terminal node |

### 2.2 The "MTP exploit" claim — why we keep it out of the catalog

Community pages claim "MTP Mode" FRP removal at "95%+" (Griffin-Unlocker class). Our own protocol
analysis (`docs/PROTOCOL-MATRIX-2026.md`) holds: **MTP is a file-transfer protocol with no command
channel** — "bypass via MTP" is a category error. What those tools almost certainly ride is a
hidden vendor USB serial/diagnostic mode that enumerates *alongside* MTP on Samsung firmware —
i.e., the Download-Mode/diagnostic class, not MTP itself. Until a bench session identifies the
actual channel (which we can legally probe on owned hardware), the claim stays out of the catalog
and is logged as a bench-to-do. This is exactly the "lab test knowledge" gate working.

---

## 3. "Hide & Seek" — what the research actually supports

The brief asked for "hiding from Google's detection trick". The research above resolves it into
two halves with very different legitimacy:

### 3.1 SEEK — read-only protection mapping (built: `GOOGLE_PROTECTION_MAP`)
Reading the state of Google's protections is plain device diagnostics (same class as the existing
`frp_detect`), and it is what makes routing honest:

| Signal (read-only) | What it tells us | Routing effect |
|---|---|---|
| `ro.boot.verifiedbootstate` / `ro.boot.vbmeta.device_state` | AVB enforcing vs relaxed | Enforcing → below-OS lanes only; relaxed → fastboot-class re-checked |
| `ro.build.version.security_patch` | Patch ratchet position | Bands + catalog decay (P8) |
| Binary/bit version + `ro.build.version.knox` | Samsung KG gate (P9) | Binary ≥18 class → ADB-lane flag "USB data path may be blocked while OS is on" |
| `ro.build.version.release`/SDK | A15/A16 closures (P1, P6) | Band selection |
| Play Integrity verdict itself | NOT readable via getprop on a locked device — declared, never faked | N/A |

### 3.2 HIDE — footprint minimization (what "stealth" legitimately means)
- No persistent modifications by default; every persistent step demands dump→hash→rollback (existing law).
- Humanized, budgeted behavior: **do not churn** USB replugs / repeated `*#0*#` dials on KG-Prenormal
  devices — recent Samsung firmware reacts to abnormal setup behavior (P9 field report). The FSM's
  probe budget (3) already encodes this; the research layer surfaces it explicitly as a behavior budget.
- Restore-to-stock as a *mandatory* final step of the Odin-class lane (already in the patch planner).

### 3.3 The hard line (what research confirms is NOT a software problem)
Hiding from the **server-side account check** and from **Play Integrity hardware attestation**
(P5) requires a valid OEM keybox / platform key — i.e., leaked vendor key material. That is:
physically not computable in software, a ToS/legal violation to use, and contrary to this repo's
own-device law. **The engine therefore does detection-aware routing and never attestation
spoofing.** Tests (`verify-parallel-research.mts`) enforce this: no spoof/evade/obfuscate
primitives may be exported by the research layer.

---

## 4. "Quantum" — reframed honestly

The repo's own `docs/PHYSICS-LAYER-RESEARCH.md` already establishes that marketed "quantum FRP"
is a scam: there is no quantum computation in FRP removal, and no quantum advantage exists for
attacking a classical lock. The only honest quantum-adjacent concepts worth engineering are:

1. **Superposition → collapse**: evaluate ALL three algorithm lanes *in parallel* for the same
   fingerprint, then collapse to a measured choice (`evaluateParallelLanes`). Deterministic,
   testable, and it is the literal implementation of "juggling in a parallel way".
2. **Measurement**: verification is observation of state (BEFORE/AFTER snapshots, reboot
   observation) — no assumption without a measurement.
3. **Entropy**: seeded humanization (already shipped) — randomness is the only "quantumness"
   the physics allows here.

The parallel evaluator merges lane expectations with union math (`1 − ∏(1 − rᵢ)`, capped at the
97 honesty ceiling) so the team can SEE the gap per device class — including where the union
still lands near zero (patched A16 software-only), which is the honest answer.

---

## 5. Lab expectations (evidence-banded, never promised)

`LAB_LEDGER` in `parallel.ts` — rates are evidence bands from the sources above + repo research,
labeled with sample-class and source. Direction of travel: bench sessions move these numbers,
**downward only** until hardware evidence supports an upward move (same law as catalog calibration).

| Lane / condition | Band | Expected rate | Basis |
|---|---|---|---|
| ADB ladder, pre-authorized window | high | 88 | RESEARCH-2026-FRP.md §2; XDA field reports |
| ADB ladder, A15/16 without pre-authorization | low | 5 | P6 (USB restricted pre-setup) |
| `*#0*#` test-mode, A13–14 | medium | 55 | contested band; model/patch dependent |
| `*#0*#` test-mode, A15/16 / Binary 18 | low | 10 | P9 field report; imobie guidance |
| Setup tricks (TalkBack/browser), A15/16 | low | 5 | wondershare/mobifirms status tables |
| MTK Brom erase | high | 80 | open mtkclient protocol class; SLA/DAA gate noted |
| SPD bootrom | high | 75 | XDA SPD tools |
| Qualcomm EDL | medium | 65 | firehose-loader gated |
| Exynos Download-Mode class | medium | 70 | TFM-class claims; KG-Prenormal caveat (P9) |
| Official owner recovery | high | 90 | legitimate owner route (not a bypass) |

**Target honesty:** decision coverage = 100% (every fingerprint gets a measured plan — achieved
and tested). *Unlock* success is lab-gated: ≥50% evidence-band exists only for the pre-authorized
ADB window and the below-OS chipset lanes; patched A15/16 software-only lanes are 5–15% by all
public evidence, and no honest tool can change that from a keyboard.

---

## 6. Impact on the three algorithms (the gap, seen)

| Algorithm | A15/16 patch impact | Engine response (already or now) |
|---|---|---|
| #1 Exploit automation | ADB ladder precondition (P6) mostly gone; app layer gone (P2/P4/P7) | Band model routes to chipset lanes; research layer adds P1–P10 digest + protection map so the fingerprint reads the patch ratchet (P8) |
| #2 UI interaction | Test-mode + dialer flows blocked on newest firmware (P9); Pixel has no UI lane (P10) | FSM probe budget = behavior budget; parallel evaluator marks UI lane blocked where the digest says so |
| #3 Partition patching | OEM-unlock no longer clears FRP (P3); KG-Prenormal USB gate (P9) | Patch planner already refuses vbmeta writes; research layer adds the KG/USB-gate signal to the preconditions + lab ledger for lane expectations |

---

## 7. Bench to-dos (declared, not faked)

1. Identify the real channel behind "MTP-mode" tool claims on owned Samsung A15 hardware (serial/Diag enumeration via `lsusb`).
2. Measure Binary-18 KG-Prenormal timing/behavior budget on a donor device (how long until USB data normalizes).
3. Validate Brom/EDL lanes on owned A15/16 MediaTek/Qualcomm units; feed `LAB_LEDGER` downward-only.
4. Re-run this dossier after the Feb-2026 platform root-certificate rotation lands.
