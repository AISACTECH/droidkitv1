# Physics-Layer FRP Research — the honest "quantum engineer" digest

**Status:** Experimental research lane · **Date:** 2026-08-12 · **Companion code:** `src/lib/patch-oracle.ts` + the **Patch Oracle 🔮** panel inside **FRP Lab 🧪** (the experimental Developer Lab view). Nothing in this document changes any existing feature.

> **Honesty contract (unchanged, repo-wide):** we never claim 100% against
> enforcement that happens on someone else's server. What we *can* do — and
> this document is the plan — is attack the layers physics makes
> unpatchable, and turn "we think" into "we measured" with a falsifiable
> forecast log.

---

## 0. What was asked, digested

1. Work the FRP problem like a physics/hardware engineer, at maximum depth.
2. Do not alter existing features — live entirely in the experimental lane.
3. Aim for the highest truthful accuracy, and **predict future patches** so
   we move *before* Google/Samsung/MediaTek do.

That is exactly what a security research lab does: build a threat model of
the *patch process itself*, date every prediction, and keep score. So that
is what we built.

---

## 1. The quantum question, answered like an engineer

**Can a quantum computer bypass FRP? Today: no. Usefully ever: no — and the
reason has nothing to do with qubits.**

- FRP on Android 15/16 is **not a cryptography problem sitting on the
  phone**. It is a *question the phone asks Google's server*: "is this
  Android-ID/IMEI pair still bound to an account?" You cannot compute your
  way around a question that is asked to somebody else's database — the
  same way no computer, quantum or otherwise, can guess what is in your
  bank's ledger. **(June 2026, XDA consensus: no public/free route defeats
  the server-side check.)**
- For completeness on the math ([speculative, order-of-magnitude only]):
  Grover's algorithm gives a quadratic speedup against symmetric crypto, so
  AES-256 falls to ~2^128 Grover iterations — still astronomically beyond
  any machine on any published roadmap this decade. Breaking RSA/ECC
  attestation keys (Shor) would need millions of *physical* error-corrected
  qubits; the largest machines in August 2026 are orders of magnitude
  short, and the attestation keys are the *least* of the barriers anyway
  (you would also have to clone Google's enrollment DB — impossible by
  physics: information you don't have and can't infer has no attack).
- **If anyone sells you a "quantum FRP unlocker," it is a scam.** Full stop.

The useful reframe, and the one this project adopts: the *deepest layer of
the phone* is not quantum — it is **silicon physics**. And silicon physics
has one property that changes everything: **the factory cannot reach it
after sale.**

## 2. The layers physics can never patch (the real deep layer)

| Layer | Can the vendor change it after sale? | Why (physics) | Consequence for FRP |
|---|---|---|---|
| Apps / setup wizard / TalkBack | Yes — OTA, trivially | It's just code in flash | **Every** app-layer bypass in history died: TalkBack, browser APK, QuickShortcutMaker. Never build a strategy here. |
| Android framework / settings DB | Yes — OTA | Same | Provisioning-flag ("70%") tricks closed progressively A11→A14. |
| **Server-side check** | Not a layer on the device at all | The answer lives in Google's DB | Out of reach of *any* device-side physics. Official channel or verified no-enrollment only. |
| Bootloader / EDL / fastboot | Only via signed updates at service level | Signature keys never leave the OEM | Firehose/AVB routes are gated, not patchable-by-you. Access = possessing the right signed artifact per model. |
| **Mask Boot ROM** | **Never** | Mask ROM is photolithography — the bits are physical transistor presence/absence, burned at the fab | A bug here (Kamakiri-class MediaTek, SPD auto-ADB) is **alive for the chip's entire commercial life**. Vendors can only *gate* it (SLA/DAA auth), by adding a check *before* it — and the gating logic itself is also ROM, hence also fixed at tape-out. |
| **Bus/flash physics** (ISP, JTAG, chip-off) | **Never** | The eMMC/UFS chip obeys whoever drives its pins | The deterministic repair-bench floor. Costs: equipment ($150–400 class), brick risk, RPMB caveats (below). |
| eFuses | One-way physics (blow = irreversible) | Anti-rollback and DAA-enable are *burned* | Good for the vendor (can't undo), occasionally good for us (a shipped-insecure chip stays insecure). |

**Fault injection — the "physics hacking" that is real.** Clock/voltage
glitching (a.k.a. fault injection) works by violating the chip's
setup-and-hold timing for a few nanoseconds so a single instruction —
usually an authentication check — executes wrongly. This is how whole
classes of bootrom and secure-boot breaks happen in the literature, and it
is the physics genuinely adjacent to what a "quantum engineer" would reach
for. Practical truth for our roadmap: it needs a bench, a contestable per-
chip characterization effort, and it is **research**, not a product feature.
We keep it documented, not promised.

**RPMB — the honest hardware exception.** On many modern devices FRP state
moved from the `persist` partition to the **RPMB** (Replay-Protected Memory
Block) region, which is keyed to the device. Offline flash edits can't
replay RPMB writes. So even the ISP floor is *contested*, not absolute, on
RPMB-backed models. The Oracle engine says exactly this instead of a
heroic claim.

## 3. Nairobi-practical bench program (Transsion-first)

Tecno/Infinix/Itel are overwhelmingly **MediaTek and Unisoc (SPD)** — which
is lucky, because both expose bootrom-layer surfaces. Escalation ladder,
cheapest first:

1. **$0 — mtkclient-class Brom** (`mtk e frp` / `mtk reset`): works when the
   chip's SLA/DAA is off or a public bootrom exploit covers it. Verify DAA
   state first; log the result in the Patch Oracle bench log.
2. **$0–30 — Unisoc auto-ADB / fastboot** routes on T606/T616-class devices;
   SPD research-download with the correct signed `.pac` per model when
   bootrom is gated.
3. **$150–400 — ISP boxes (UFI/Easy-JTAG class)** for persist-level work
   when software is dead. Know RPMB limits before soldering anything.
4. **Official unlock / Google account recovery** — unglamorous, but on a
   fully IMEI-enrolled Android 15/16 unit it is frequently the *only*
   truthful route, and saying so is what separates us from every scam tool
   in the comparison table.

Every rung ends in the same verification ritual (existing lab feature):
reboot, confirm boot-to-welcome with no Google verification, re-scan, and
log BEFORE/AFTER. **The bench log is calibration data for the forecasts.**

## 4. How we predict future patches (the theory)

Prediction here is not mysticism — a vendor's *remaining degrees of
freedom* are enumerable:

- They can only patch **code** → so app/os-layer bypasses keep dying first,
  fastest. (History: TalkBack → wizard → flags → test menu. Sequence held
  2021→2026.)
- They can only add **checks in front of ROM** (SLA/DAA, eFuse) → so expect
  auth-gates to become universal on *new* silicon, while **already-shipped
  silicon stays exploitable forever** (ROM invariant).
- They can move state **server-side** → they did (June 2026). Next moves
  predicted by the engine, each with a **falsifier and a decide-by date**:
  IMEI enrollment universal by mid-2027 (high), SLA/DAA always-on by 2028
  (high), hardware attestation mandatory at first boot on A17 (medium),
  Transsion eFuse-locking SPD bootrom by 2027 (medium), Odin shrinking
  further (low).
- Each prediction lives in `FORECASTS` (patch-oracle.ts), and the resolved
  ones feed a **calibration meter**. One of the three seeded resolved
  predictions is a **miss** (we over-estimated how long leaked EDL loaders
  would survive) — it stays visible forever, because a lab that hides its
  misses is a marketing page, not a lab.

**That meter is the honest road to "100%":** not a claim — a growing,
dated, falsifiable score we are not allowed to inflate.

## 5. What we will *never* print (banned claims)

- "100% FRP on Android 15/16" — impossible while enforcement is server-side; banned repo-wide.
- "Quantum bypass" anything — scam vocabulary; banned.
- Percentages without a dated evidence event behind them.
- Silent removal of a falsified forecast.

## 6. References & provenance

- `RESEARCH-2026-FRP.md` — 2026 patch-wall research (primary).
- XDA (June 2026): server-side FRP check on Android 15 — no public bypass.
- mtkclient / bkerler — MTK Brom, Kamakiri-class payloads, SLA/DAA behavior.
- Qualcomm EDL/firehose signing documentation; Samsung Knox (KG/RMM) docs.
- Jan-2026 Samsung patch — browser/APK/test-menu closures (repair-tool changelogs).
- Fault-injection literature: clock/voltage glitch setup-and-hold violations (kept as research context only).
- Calibration seed predictions: two hits (Jan-2026 Samsung route closure; A15 server-side move), one miss (EDL loader longevity) — recorded with dates in `FORECASTS`.

### Roadmap note

A native MTK Brom backend (design sketched in the lost-session
`RFC-MTK-BROM-BACKEND.md`) remains the next session's hardware-bench
project. The Patch Oracle's dataset absorbs that RFC's per-chipset
playbook essence, so the knowledge is no longer blocked on the backend.
