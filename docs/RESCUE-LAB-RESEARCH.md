# Rescue Lab — evidence & honesty notes per lane

**Status:** Experimental lane · **Date:** 2026-08-12 · **Code:** `src/lib/rescue-data.ts`, `src/lib/gesture-crack.ts`, `src/components/views/RescueLab*`. Additive — no existing feature altered.

The in-app honesty law, applied lane by lane. Bands: **DOABLE** (verified/reliable), **CONDITIONAL** (real but gate-dependent), **NOT-BY-SOFTWARE** (server/encryption/parts — nobody's app does it).

---

## 💻 PC / laptop passwords

| Reality | Evidence-based claim |
|---|---|
| Local Windows accounts | Offline reset (NTPWEdit/chntpw class or an existing admin + `net user`) is a decades-proven bench route — DOABLE/CONDITIONAL on Secure Boot/BitLocker state. |
| BitLocker/Device Encryption | Win11 24H2 enables it by default; offline edits without the 48-digit recovery key strand data. We warn before the method, not after the brick. |
| Microsoft accounts | Server-side. Only account.live.com reset. Nobody'sUSB tool changes a cloud password — same law as Android 15/16 FRP. |
| macOS FileVault | ON by default → Apple-ID recovery only. NOT-BY-SOFTWARE, printed as such. |

## 📶 Carrier unlock

- Lock state for iPhones and carrier-branded Androids lives in **carrier/Apple databases** — not computable locally (identical physics to server-side FRP). Banned claim accordingly.
- DOABLE: truthful detection ( dialer/service menus, SIM-swap test) + official carrier unlock routes (AT&T/T-Mobile/Verizon auto-60-day; UK/EU portals), which are genuinely near-100% when eligible.
- Kenya truth: KE-sold devices are normally unlocked; a "locked" KE phone is usually a **lender MDM** (Lipa Mdogo Mdogo/M-Kopa/Watu) — we refuse to defeat lender locks and route to the lender (ethics + law).
- Legacy NCK era (pre-2013 Huawei/ZTE/Alcatel) is real but **attempt-counter-limited**; we teach verify-on-donor-first + bench logging instead of code roulette.

## 📡 Modems

- AT-command diagnosis (HDSPA-era to current Qualcomm/Balong mods) is standard, verifiable, harmless read-only practice — DOABLE. Included `AT^CARDLOCK?` (lock + remaining attempts) before any unlock talk.
- "Uninstall firmware" reframed truthfully: firmware is **replaced**, via vendor updater (DOABLE) / WebUI (DOABLE) / Balong USB-loader deep unbrick (CONDITIONAL, brick-risk priced in).
- Legal: IMEI rewriting illegal in Kenya (CA) — we read IMEIs, never write them. Printed in-lane.

## 🔓 Phone screen locks

- **The star: legacy pattern cracker.** Android ≤8 `gesture.key` = raw SHA-1 over dot bytes. Our implementation is **unit-verified** (`scripts/verify-gesture-crack.mts`): SHA-1 against RFC/node-crypto vectors incl. binary inputs; pattern space enumerates to exactly the published forensic counts (1624/7152/26016/72912/140704/140704 = **389,112**); end-to-end crack round-trips pass. Offline → zero attempt-counter risk. Data preserved — the honest "keep everything" window.
- Android 9+: Gatekeeper/Weaver + FBE — NOT-BY-SOFTWARE (with data). Honest routes: Samsung SmartThings Find Remote Unlock (DOABLE, official, data kept), else recovery reset (data erased — declared to customer FIRST), then FRP journey continues inside DroidKit.
- Lender/finance locks: out of scope, permanently.

## 🖥️ Black screens

- Triage engineering: signs-of-life split → data-first via the app's **existing** Screen-mirror + Files views (reflection control works with dead panels when ADB was authorized — that's the app's documented design), OTG mouse, HDMI/DeX outputs, force-restart/recovery combo table per brand, then parts.
- Myth-busting committed in code: rice doesn't fix water damage; "dead screen ≠ dead phone"; dead phone seen by PC in Brom/EDL = revivable, and the app already has that runbook.

---

### Verification record

- `node scripts/verify-gesture-crack.mts` (wired as `npm run test:rescue`): ALL CHECKS GREEN on 2026-08-12 — SHA-1 vectors, enumeration counts 389,112/389,112, crack round-trips, invalid-input handling.
- Content sources: Microsoft account/BitLocker recovery documentation, AT&T/T-Mobile/Verizon official unlock policies, Android lockscreen-forensics literature (gesture.key SHA-1 era), Huawei AT-command references for Balong-class modems, CA (Kenya) IMEI rules.
- Everything else in the lanes is teach/checklist content and makes **no success-rate claim** — that is deliberate.

### Roadmap (bench-gated, like the MTK RFC)

- Serial-port AT terminal + lock-state auto-detection (needs Rust bench session).
- Rescue-USB builder (Ventoy/Rufus orchestration) — needs disk-write priv escalation design.
- Legacy NCK candidate generators — only after bench-calibration against donor units; logged in the Patch Oracle bench log before any UI exposes them.
