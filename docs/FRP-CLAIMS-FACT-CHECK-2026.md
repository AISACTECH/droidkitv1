# 🔬 FRP Claims Fact-Check — 2026-08-15

Purpose: an independent, claim-by-claim review of the pasted "DR-FRP15-16-200" document and of
the claims already in `FRP-ALGORITHM-ANALYSIS.md`, measured against (a) how Android 15/16
actually enforces FRP and (b) this repo's *own* evidence base (`RESEARCH-2026-FRP.md`,
`docs/ANDROID-15-16-PATCH-RESEARCH.md`). The goal is to stop false claims from shipping — not to
add new bypasses.

---

## Part A — The pasted "DR-FRP15-16-200" document: verdict

The document is AI-generated filler wrapped in marketing ("DIG-ONE", "200% working",
"self-optimizing", "future-proof Android 17"). It is **not** a working method, and it is wrong in
almost every specific technical claim. Itemised:

| # | Claim in the document | Verdict | Reality |
|---|---|---|---|
| A1 | FRP state lives in `settings.db` / `user_setup_complete` | ❌ False | The flag is `user_setup_complete` in `settings_secure.xml` under `/data/system/users/0/` (the `settings.db` path died around Android 6), and it only controls the **setup wizard** — it is **not** the FRP lock. Deleting that row does not clear FRP. |
| A2 | FRP lives in `lockscreen.db` / `device_encryption` and can be cleared by deleting them | ❌ False | FRP is a credential blob in a dedicated `frp` / `persist` / `param` partition, bound to verified boot (AVB), bootloader-lock state and the TEE. It is not a database row. |
| A3 | "Wipe data partition removes FRP" (claimed as an Android 16 feature) | ❌ False | Wiping `/data` **is** the factory reset that FRP is designed to survive. A15/16 *hardened* FRP; they did not loosen it. |
| A4 | `adb shell` + `sqlite3` + `DELETE FROM secure WHERE name='user_setup_complete'` | ❌ Unreachable | A FRP-locked device has USB debugging off, and you cannot enable it without entering the OS that FRP blocks. `adb root` does not exist on retail/user builds. Steps 6/9 in the document are impossible at the moment they are needed. |
| A5 | `fastboot oem unlock` as step 1 | ❌ Circular | Requires the "OEM unlocking" toggle in Developer Options *inside* the OS — unreachable while FRP-locked. (Samsung does not use fastboot at all.) |
| A6 | kexec / custom kernel / Magisk for FRP removal | ❌ Unreachable | All require an unlocked bootloader or root first — which FRP blocks. `cat /proc/sys/kernel/panic` is meaningless; there is no "FRP-failure panic" to disable. |
| A7 | "Google leaks" in `device_encryption` / `lockscreen.db` | ❌ Fabricated | No such leaks exist. |
| A8 | "200% working", "self-optimizing", "adapts to new FRP patches", "stealth/hard to detect" | ❌ Marketing | No algorithm re-optimises itself against Google's patches, and "undetectable" is the stolen-device use case, not a technical property. |
| A9 | `ro.frp.pst` "cleared" as a settings step | ⚠️ Misleading | `ro.frp.pst` is a read-only property that reflects the FRP partition state; it is only cleared by wiping that partition below the OS — not by any settings edit. |

**Bottom line:** nothing in the pasted document is a usable Android 15/16 method. It is a
regression *below* the honesty the repo already established in `RESEARCH-2026-FRP.md`.

---

## Part B — `FRP-ALGORITHM-ANALYSIS.md`: specific claims that must change

This file was the "what we need to build" blueprint, written *before* the A15/16 patch research
landed. Several of its numbers now contradict the repo's own evidence base and should be
corrected so competitors and users can't point at them.

### B1. The "Reset Modes" success table (lines ~160–175)

| Claimed row | Problem |
|---|---|
| "Factory Reset + Remove FRP 100% → 100%, boots with **no Google account verification**" | Contradicts P1/P6/P8/P9 in `ANDROID-15-16-PATCH-RESEARCH.md`: on patched A15/16 devices, software-only removal is closed and "no verification" is exactly what Google blocks. "100%" is unprovable and misleading. |
| "Remove FRP 100% (No Data Wipe) → erase FRP partition, keep user data → 100%" | **Technically false.** Userdata is encrypted with a key derived from the lock/FRP state; erasing the FRP partition destroys the ability to decrypt `/data`. You cannot "keep all data" and erase FRP. This row should be deleted or reframed as "data will be lost". |
| "70% = FRP bypassed but device may re-lock on next reset" / "30% = Knox components still active" | Conflates FRP with Knox (Knox Guard is a separate mechanism), and the 100/70/30 percentages are invented — they are not measured and not evidence-banded. |

### B2. The per-phase success rates (lines ~110–150)

`Exynos DL Mode 90%`, `EDL 95%`, `EDL cable 98%`, `Brom 90%`, `SP Flash 85%`, `SPD 80%` — none
of these numbers have a source, and several contradict the lab ledger in
`ANDROID-15-16-PATCH-RESEARCH.md §5` (MTK Brom 80 evidence-band, Qualcomm EDL 65, Exynos
Download-Mode 70, and the P9 note that ADB-over-USB is blocked on Samsung Binary 18 / KG
Prenormal). **Fix:** replace with the evidence-band numbers and mark them "lab-gated, downward
only" — the exact language the rest of the repo already uses.

### B3. "Paralock (iMobie)" naming (line ~14)

"Paralock" is this project's own name. iMobie's Android unlocker is not called Paralock. This
looks like a copy-paste artifact; it should be renamed to avoid claiming a competitor ships a
product with our name.

### B4. Competitor feature table (lines ~95–110)

Claims such as "Firehose Loaders ✅ Built-in" for *every* tool, "Auto USB Debug Accept ✅" for
all, and "Verify FRP Removed ✅" for all are presented as fact without evidence. Signed firehose
loaders are per-device, per-bit-version vendor binaries — they are not "built in" to consumer
apps, and this repo's own `RESEARCH-2026-FRP.md §4` says obtaining them requires "leaked/vendor
assets, not typing ability". The table reads as speculation; it should be labelled as such or
sourced.

### B5. "Binary/bit version wrong = brick risk" (line ~148)

This one is **correct** — keep it. Flashing a mismatched Samsung binary/bit revision is a real
soft-brick risk, and it is a good reason the repo gates flashing behind pre-captured backups.

---

## Part C — What is already right (keep these as the source of truth)

- `RESEARCH-2026-FRP.md` — the honest precondition ("USB debugging enabled **and** the PC
  RSA-authorized **before** the reset, or a live route to authorize after"), the patch-wall table
  (A15 blocked / A16 "very hard"), and the statement that *even commercial leaders cannot beat a
  fully-patched device with software tricks*.
- `docs/ANDROID-15-16-PATCH-RESEARCH.md` — P1–P10 patch digest, the hard line against attestation
  spoofing / keybox injection, the "MTP is a category error" callout, and the evidence-banded lab
  ledger. This is the model for how the rest of the docs should talk about success rates.

These two files already contain the correct answer. `FRP-ALGORITHM-ANALYSIS.md` should be brought
*up to* their standard, not the other way around.

---

## Part D — The "no alteration" rule (restated)

This is the binding constraint the pasted document ignores:

> FRP removal is, by definition, either **alteration** of persistent device state (wipe/flash/
> below-OS erase) or **legitimate authentication** (sign in with the last-known Google account, or
> a vendor/Google-approved unlock with proof of ownership). There is no read-only, zero-trace
> removal.

Therefore the desired combo is impossible as a conjunction:

**100% removal + no alteration + stealth/undetectable → you can have at most one of the three.**

If "no alteration" is a hard rule, the only compliant paths are account sign-in or official
owner recovery. Every other lane (EDL/Brom/Odin/SPD, partition wipe, flashing) is alteration and
leaves traces or depends on device security state (e.g., Samsung KG). The app already routes this
honestly via the Research Reality Check / band model — the fix is to make every *document* agree
with it.

---

## Part E — Recommended concrete edits (for the next pass)

1. `FRP-ALGORITHM-ANALYSIS.md`: delete/replace B1–B4 as above; cite
   `ANDROID-15-16-PATCH-RESEARCH.md` for every success number.
2. Remove the pasted "DR-FRP15-16-200" text from wherever it was being considered (it is not in
   the repo tree — good; keep it out of the docs and the app).
3. Add a one-line "no-alteration" disclaimer to any screen that promises a percentage, matching
   the trilemma in Part D.
4. Keep the "200% working" phrasing permanently banned from user-facing copy — it is the single
   fastest way to lose the "honest scope" credibility the README has built.

---

## Resolution log (applied 2026-08-15)

| Item | Action | Status |
|---|---|---|
| Rust algorithm `success_rate()` (95/97/90/80/70/40) | Replaced with lab-gated evidence bands: Exynos DL 70 · EDL 65 · Brom 80 · SPD 75 · test-mode 55 · pre-authorized ADB 88; `description()` strings rewritten | ✅ done |
| Rust `reset.rs` "100% removed / brand new at Hi there / permanently removed (keep data)" | Rewritten to honest ADB-provisioning-scope wording; comments fixed | ✅ done |
| Model DB notes ("100% effective / 100% success rate / 90% / 80%") | Replaced with evidence-band phrasing (Brom 80, SPD 75) | ✅ done |
| `commands.rs` handshake + reset/Knox doc comments | "brand new / works 100%" removed | ✅ done |
| `FrpResetMode` labels/descriptions ("…100% / Keep Data") | Relabelled to "Provisioning Bypass / Temporary / Full wipe" — no promised % | ✅ done |
| Frontend `FrpRemoval.tsx` | Added Safety Pre-Flight card + consent gate (destructive actions locked until acknowledged); "CONFIRMED … 100% / Brand New at Hi There" copy removed; success-rate displays relabelled "evidence band" | ✅ done |
| Frontend `LegacyFrpRemoval.tsx` / `DeviceStatusPanel.tsx` / `DeveloperLab.tsx` | Success-rate badges → evidence bands (70/65/80/75) | ✅ done |
| `FRP-ALGORITHM-ANALYSIS.md` | Success numbers corrected to evidence bands; "Paralock (iMobie)" naming fixed; Reset-Modes table rewritten; "100% = brand new" section corrected | ✅ done |

**Verification:** `npm run test:adaptive` 124 ✅ · `test:research` 37 ✅ · `test:core` 79 ✅ ·
`test:brands` 67 ✅ · `test:matrix` 10 ✅ · `test:lab` 150 ✅ · `test:bench` 37 ✅ ·
`npm run lint` (tsc) clean · `npm run build` + `audit:prod` green.

**Not yet done (needs Rust toolchain):** `cargo check` on the edited Rust modules. The edits are
string/number/comment-only; run `npm run tauri:dev` or `cargo check` locally to confirm.
