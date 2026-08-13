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

---

## Round 2 (2026-08-12) — MiFi unlock correction + feature phones

**Correction we publicly own:** round 1 lumped modems under "server-side —
can't compute." That was over-generalized. A modem/MiFi verifies its NCK
**locally, inside the device** — no carrier server in the loop (that is
precisely why the public Huawei calculators worked for a decade). The lane
now states the corrected physics in both directions: carrier-locked PHONES
(iPhone/modern carrier Android) remain server-side; carrier-locked MODEMS
/MiFis are local and genuinely free-able — including stock from carriers
that no longer exist (Orange Kenya, Telkom-era units). Self-unlocking your
own device is legal; the app says so.

**Verified code shipped:** `src/lib/nck-modem.ts` — pure MD5 + CRC32 +
Huawei V1/V2/V201 NCK candidate engine, ported from the long-public
reference (ket-c/huaweiv3calculator `calc.php`) and corroborated by
xnuxer/huawei-modem-calc. `npm run test:nck` proves it against REAL
published examples — IMEI 867648011803309 → V1 34560983 + flash 34591526;
IMEI 968480435684491 → V2 23823444 — plus RFC MD5 vectors, zlib-matching
CRC32, and IMEI Luhn validation. The V201 (2012+) candidate ships labelled
**UNVERIFIED — bench first** (faithful port, no published vector found);
labels, not lies.

**Safety law encoded in UI:** attempt counters are the one real enemy
(Huawei ~10, Alcatel ~3–10, ZTE ~5). The generator demands `AT^CARDLOCK?`
/ `AT+CLCK="PN",2` pre-flight, validates IMEI checksum (catches typos
before they burn attempts), and instructs ONE-era entry, never sequential
guessing.

**New lane: Button Phone ☎️** — Itel/Tecno/Nokia keypad locks: SIM-PIN-vs-
phone-lock triage (PUK is free from the carrier — never flash for a SIM
PIN!), factory default codes, then the Unisoc/SPD service route
(open-source `spd_dump` with matched FDL loaders / one-click boxes) with
the honest data-loss warning; KaiOS flagged as its own beast.

**PC lane accuracy upgrades:** mandatory BitLocker pre-check card
(`manage-bde -status C:` + recovery-key retrieval before any offline edit —
the 2-minute step that separates a rescue from an unreadable drive), free
chntpw/Linux route with exact commands, Domain/AzureAD honesty card
(servers again — org admin only), explicit "desktop == laptop" note, and
the "reset everything" honest card (Windows Reset-this-PC — no cable
between computers can reset a PC password; the bootable USB IS the cable
method).

## Round 3 (2026-08-12) — USB handshake + cable myths, plainly

**Built:** Auto-Session workflow (`src/lib/modem-session.ts` + Modem lane):
full plug-in pipeline (port → AT handshake → ATI/CGSN/^CARDLOCK? → IMEI
checksum → era-matched ONE candidate → human-confirmed entry → verify →
bench-log), with hard interlocks I1–I5 (never past dead handshake; ≤2
attempts → flow locks; no Luhn pass → no code; exactly one era; human fires
the entry, always). A live probe for a future native serial backend makes
the same UI autofire the moment the backend lands — frontend needs zero
edits (`docs/RFC-MODEM-SERIAL-BACKEND.md` is the ready-to-build spec with
its own safety contract: allowlisted AT commands, one-entry-per-session,
no IMEI writes, TX/RX journal).

**Cable physics, printed in-app:**
- HDMI/DP = picture + sound ONLY. No command channel exists in the cable.
  It cannot remove a password, cannot bypass FRP, cannot unlock — on any
  device, of any age. "HDMI bypass" claims are scams. What display-out
  genuinely does (and we use it): broken-screen phones with DeX/DP-out can
  be SEEN, and with an OTG mouse, CLICKED — rescue through visibility,
  already in the Black Screen lane.
- PC to PC over USB/HDMI: no password-reset protocol exists — the bootable
  rescue USB IS the cable method; Windows' own Reset-this-PC is the
  built-in no-cable version.
- The 100% rule, per class, in-app: legacy Huawei modem math IS
  deterministic for its generation (vector-verified), button phones are
  near-total via defaults/service route, server-side classes are 0% for
  everyone — one blanket number for everything would be the lie.

### Roadmap (bench-gated, like the MTK RFC)

- Serial-port AT terminal + lock-state auto-detection (needs Rust bench session).
- Rescue-USB builder (Ventoy/Rufus orchestration) — needs disk-write priv escalation design.
- Legacy NCK candidate generators — only after bench-calibration against donor units; logged in the Patch Oracle bench log before any UI exposes them.
