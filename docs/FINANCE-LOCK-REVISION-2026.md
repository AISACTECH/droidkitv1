# 🔒 Finance-Lock Revision — M-KOPA / Watu / PayJoy-class on Android 14 & 15

> Revision date: 2026-08-13. This document revises the circulated "financing apps cannot be
> permanently removed" text with **accurate mechanics**, keeps the correct conclusion, and states
> the one path that is actually 100%. It is also the knowledge source for the finance-lock
> section of the test-generated `docs/COMPARISON-SHEET-2026.md`.

---

## Revised statement (replaces the original paragraph)

> **No — a financing lock (M-KOPA / Watu / PayJoy / lender-MDM class) cannot be permanently
> removed on Android 14 or 15 by the device holder using software, rooting, or flashing.**
> The correct mechanism is **server-side enrollment, not "hardcoding into system partitions"**:
> the lock app is a device-owner/device-admin app enrolled by the lender's MDM (DPC), usually
> provisioned through Google Zero-Touch or DM enrollment (Samsung models: Knox Guard). After
> every factory reset the device queries the enrollment server with its IMEI; while that IMEI
> stays flagged as financed, the server re-provisions the device and the lock app is
> re-downloaded, re-installed and force-enabled during setup. The **only** permanent fix is the
> server-side one only the lender can perform: settle the balance → the lender de-enrolls the
> device (Zero-Touch/MDM removal, IMEI flag cleared) → the app becomes uninstallable and the
> device resets clean. That path is 100% and costs a paid-off balance — nothing else is.

---

## Where the original text went wrong (and the corrections)

| Original claim | Correction |
|---|---|
| "Deeply hardcoded into the device's secure read-only system partitions" | ❌ The M-KOPA app lives in **userdata** as a device-admin/device-owner app. What makes it survive resets is **server-side enrollment** (Zero-Touch / MDM re-provisioning), not its location in the filesystem. |
| "Read-only system partitions (EROFS/APEX) block deleting core provider packages" | ⚠️ EROFS/APEX are real (system partitions are read-only and APEX packages are signed), but this is **not** why the financing app persists — it is not a core provider package. The EROFS point matters only for *system-level* lock managers some Transsion finance units ship; those survive via re-flashing resistance, and server re-enrollment defeats even a re-flash. |
| "Server re-enrollment: the device queries the manufacturer or financing server… re-download, reinstall, force-enable" | ✅ This part is accurate and is the **real** mechanism — keep it. Refine it: the query goes to the lender's MDM via Google Zero-Touch/DM enrollment (Samsung models: Knox Guard), keyed by IMEI. |
| "Rooting requires unlocking the bootloader… triggers a permanent hardware fuse trip… causing the financing software to lock the device" | ✅ Direction correct, mechanism needs precision: the fuse is the **Knox/AVB verified-boot state** (Samsung-specific); on other OEMs it is the AVB orange-state + **Play Integrity hardware-backed verdicts**. The lock app reads that attestation and hard-locks or bricks. So rooting does not remove the lock — it converts a re-enrollable lock into a bricked device. "Neither necessary nor effective" is correct. |

---

## The percentage truth (same honesty law as the rest of the repo)

| Attempt | Permanent-removal % | Why |
|---|---|---|
| Software removal by the holder (disable/uninstall/`pm` tricks) | **0%** | Server re-enrolls on next setup — and disabling a device-owner app fails outright. |
| Rooting / bootloader unlock | **0%** (worse) | Fuse/AVB trip → hardware-backed attestation fails → lock app hard-locks the device. |
| Re-flashing stock firmware | **0%** (alone) | Zero-Touch/MDM re-provisions after boot; IMEI stays flagged. |
| Settle the balance → lender de-enrolls the device | **100%** | The server-side release is the entire lock; only the lender holds it. |
| Tools claiming "M-KOPA removal 100%" | scam or the lender path resold | No tool can reach the enrollment server without lender credentials. |

---

## DroidKit's position (unchanged repo law, now with citations)

DroidKit **refuses to defeat lender locks** (Rescue Lab carrier lane: Kenya lender-MDM distinction
with refusal-to-defeat policy — defeating a financing lock on an unpaid device is unlawful
handling of someone else's property). What it ships instead:

1. **The lender-release runbook** — the 100% path above, with the exact steps (M-KOPA customer
   care / Watu / PayJoy: request de-enrollment after final payment, confirmation SMS/email as
   proof, then factory reset).
2. **Detection honesty** — the Q4 database flags finance-locked models so a technician sees the
   truth BEFORE spending an attempt (or a scam).
3. **Post-release verification** — after the lender de-enrolls: reset → FRP journey continues
   with the owner's own Google account, exactly as for a normal device.

This is why the comparison sheet scores DroidKit 100 in the finance-lock *honesty* category and
every "we remove M-KOPA" tool 0 — the sheet measures truth, not claims.
