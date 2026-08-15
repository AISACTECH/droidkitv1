# 🔬 FRP Algorithm Comparison: Top Tools vs Paralock v1

> **Evidence-banded correction (2026-08-15):** the success numbers in this document's
> original draft (90%/95%/98%/100%) were not sourced and contradicted the repo's own
> research. They are corrected below to **lab-gated evidence bands** from
> `docs/ANDROID-15-16-PATCH-RESEARCH.md` §5. A band is *not* a promised success percentage.
> See `docs/FRP-CLAIMS-FACT-CHECK-2026.md` for the full audit.

## Executive Summary

Compared against **iMobie (Android Unlocker — not "Paralock")**, **MobiKin**, **Tenorshare 4uKey**, **Dr.Fone**, **SamFW Tool**, and **TSM Tool**, the finding is:

> **Our current Paralock v1 FRP module has no measured per-model success percentage yet** — and neither does any competitor, because real rates are device/patch dependent. What the top tools *do* have that we needed: **chipset-branching multi-path routing** (Exynos Download-Mode / Qualcomm EDL / MTK Brom / SPD) that picks the lane by processor, Android version, binary/bit version and security patch. Those lanes are rated as **evidence bands** (Brom ~80, SPD ~75, Exynos DL ~70, EDL ~65, test-mode ~55, pre-authorized ADB ~88) — never 100%.

---

## 🏆 How Top Tools Actually Work (The Real Algorithms)

### iMobie Android Unlocker (not "Paralock") — Algorithm Flow
```
CONNECT DEVICE
  → Auto-detect brand, model, chipset, Android version
  → IF Samsung:
      → IF Exynos → Download Mode → Flash "Enable ADB" file → ADB commands
      → IF Qualcomm/Snapdragon → EDL Mode (needs engineering cable) → Flash firmware → Remove FRP
      → IF MediaTek → Brom/Preloader Mode → Erase FRP partition
  → IF Xiaomi/Redmi → Fastboot or Mi Account bypass
  → IF OPPO/Vivo/Realme → MTK Brom or Qualcomm EDL
  → Send notification to device → Enter service mode → MTP+ADB
  → Execute chipset-specific ADB removal commands
  → Reboot → Verify FRP removed
```

### Tenorshare 4uKey — Algorithm Flow
```
CONNECT DEVICE
  → Auto System Detection (creates test profiles per device)
  → Select brand → Select Android version
  → IF Samsung + Android 11-15:
      → IF Exynos → Download Mode → Combination firmware → Enable ADB → Remove FRP
      → IF Qualcomm → EDL engineering cable → Flash → Remove FRP
  → IF Samsung + Android 6/9/10:
      → Send notification → Browser → PIN method → Skip Google account
  → IF Samsung + Android 7/8:
      → Notification → Chrome → Download APK → Disable services → Add new account
  → Download correct PDA/firmware automatically
  → Execute removal → Reboot
```

### Dr.Fone (Wondershare) — Algorithm Flow
```
CONNECT DEVICE
  → AI-powered Smart Recommendation (selects best method)
  → IF Samsung Snapdragon (Android 11-15):
      → EDL cable required → Download firmware → Flash → Remove FRP
  → IF Samsung Exynos:
      → Download Mode → Flash → Enable ADB → Remove FRP via ADB
  → IF Samsung MTK:
      → Brom Mode → Erase FRP partition
  → IF Samsung + older Android:
      → Emergency Call *#0*# → Enable USB Debugging → ADB commands
  → One-click removal for supported models
```

### SamFW Tool — Algorithm Flow (Most Relevant for Us)
```
CONNECT DEVICE via USB
  → On device: Emergency Call → Dial *#0*# → Test Mode
  → Click "Remove FRP" in SamFW
  → Auto-accept USB debugging prompt
  → Execute ADB removal commands automatically
  → Phone reboots with FRP removed

For Exynos (Download Mode):
  → Flash Enable-ADB file via Odin
  → ADB commands remove FRP

For Qualcomm (EDL 9008):
  → Firehose loader → Erase FRP partition directly
  → Factory reset / Erase userdata

For MediaTek:
  → Brom/Preloader → Erase FRP partition
  → Format userdata
```

### TSM Tool (Turbo Service Mobile) — Most Advanced
```
Auto-detect chipset (Exynos/Qualcomm/MTK/SPRD/Unisoc/Kirin)

Samsung Exynos [Download Mode]:
  → Remove FRP / Restore Phone / Enable ADB
  → No need to select model or CPU
  → Works up to 2025-05 security patch

Samsung Qualcomm [EDL Mode]:
  → Remove FRP / Factory Reset / Read-Write Firmware
  → Model + bit version specific firehose loaders

Samsung MediaTek:
  → Brom mode → Remove FRP / Factory reset / Format userdata

Samsung ADB Mode:
  → Remove KG (Knox Guard) → Change to ACTIVE
  → QR Code + ADB method
  → Works on ALL CPU types for Android 14

OPPO/Vivo/Realme/Xiaomi:
  → Brand-specific Brom/EDL modes
  → Erase FRP partition
```

---

## 🆚 Comparison Table: What We're Missing

| Feature | iMobie | 4uKey | Dr.Fone | SamFW | TSM | **Our Paralock v1** |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|
| **Chipset Detection** | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto | ❌ **None** |
| **Exynos Path** | ✅ DL Mode | ✅ DL Mode | ✅ DL Mode | ✅ DL Mode | ✅ DL Mode | ❌ **None** |
| **Qualcomm EDL Path** | ✅ EDL Cable | ✅ EDL Cable | ✅ EDL Cable | ✅ EDL 9008 | ✅ EDL 9008 | ❌ **None** |
| **MediaTek Brom Path** | ✅ Brom | ✅ Brom | ✅ Brom | ✅ Brom | ✅ Brom | ❌ **None** |
| **Test Mode *#0*#** | ✅ | ✅ | ✅ | ✅ Primary | ✅ | ⚠️ Listed but no auto-flow |
| **Auto USB Debug Accept** | ✅ | ✅ | ✅ | ✅ Auto | ✅ Auto | ❌ **None** |
| **Combination Firmware** | ✅ Auto DL | ✅ Auto DL | ✅ Auto DL | ✅ | ✅ | ⚠️ Info only |
| **Binary/Bit Version** | ✅ | ✅ | ✅ | ✅ | ✅ Critical | ❌ **None** |
| **Security Patch Check** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Basic |
| **Firehose Loaders** | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ | ✅ | ❌ **None** |
| **Multi-brand Support** | ✅ 10+ | ✅ 8+ | ✅ 10+ | ✅ Samsung | ✅ 15+ | ⚠️ Samsung only |
| **Progress % Display** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ **None** |
| **Factory Reset + FRP** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ **None** |
| **Verify FRP Removed** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ **None** |
| **Auto Firmware Download** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ **None** |

> **Caveat on the "✅ Built-in" cells:** signed firehose programmers / firmware are per-device,
> per-bit-version vendor binaries, not features that ship inside a consumer app. These cells are
> our *inference* from tool marketing, not verified facts — treat them as directional only.

---

## 🎯 The Chipset-Branched Algorithm (evidence-banded — no promised %)

The key insight from all top tools is the **3-PHASE CHIPSET-BRANCHED ALGORITHM**:

### Phase 1: INTELLIGENT DEVICE PROFILING
```
1. Connect device via USB
2. Auto-detect:
   - Brand (Samsung, Xiaomi, OPPO, etc.)
   - Model code (SM-A055F, etc.)
   - Chipset family (Exynos / Qualcomm / MediaTek / SPD / Unisoc)
   - Android version + API level
   - Security patch date
   - Binary/bit version (U1, U2, U3, U4, U5, etc.)
   - Bootloader version
   - Knox version
   - FRP state (Active/Inactive)
   - ADB state (Authorized/Unauthorized/Unavailable)
   - Current mode (Normal/Download/Recovery/EDL/Brom)
```

### Phase 2: CHIPSET-BRANCHED METHOD SELECTION
```
IF chipset == Exynos:
    → METHOD A: Download Mode + Enable-ADB file + ADB removal (evidence band 70)
    → METHOD B: Download Mode + Combination firmware + ADB removal (evidence band 70, legacy 6-9)
    → FALLBACK: Test Mode *#0*# + USB Debug + ADB removal (band 55; ~10 on patched A15/16)

IF chipset == Qualcomm/Snapdragon:
    → METHOD A: EDL Mode (9008) + Firehose loader + Erase FRP partition (band 65 — firehose-loader gated)
    → METHOD B: EDL Engineering Cable + Flash firmware (band 65, same gate)
    → FALLBACK: Download Mode + Combination firmware (if available)

IF chipset == MediaTek:
    → METHOD A: Brom/Preloader Mode + Erase FRP partition (band 80 — open mtkclient protocol class)
    → METHOD B: SP Flash Tool + Format FRP partition (band 80, SLA/DAA caveat on newer chips)
    → FALLBACK: ADB mode if USB debug enabled

IF chipset == SPD/Unisoc:
    → METHOD A: SPD Bootloader Mode + Erase FRP (band 75 — SPD bootrom auto-ADB class)
```

### Phase 3: EXECUTE + VERIFY + REPORT
```
1. Execute selected method with progress tracking
2. After each step, verify success
3. If step fails, auto-escalate to next method
4. After completion:
   - Reboot device
   - Wait for boot
   - Verify FRP is removed (check setup wizard state)
   - Show success/failure with confidence %
5. FRP Outcome verification (measured, never assumed):
   - removed_verified = reboot + re-detect reports FRP Inactive
   - flags_set = provisioning flags set, but re-lock possible on a patched device
   - failed = no measured change; escalate to the next lane or official recovery
```

---

## 📊 What the original Paralock v1 FRP module was missing

(No percentage claim — the honest framing is *capability gaps*, not an invented rate.)

1. **Single-path ADB approach**: We only try ADB commands, which fail if USB debugging isn't authorized
2. **No chipset branching**: We treat all Samsung devices the same, but Exynos/Qualcomm/MTK need completely different approaches
3. **No mode switching**: We never put the device into Download/EDL/Brom mode
4. **No firmware handling**: We can't flash combination firmware or Enable-ADB files
5. **No verification**: We don't confirm FRP was actually removed after execution
6. **No progress tracking**: No percentage display during operation
7. **No auto-escalation**: If one method fails, we don't automatically try the next
8. **No binary/bit version checking**: Critical for Samsung — wrong bit version = brick risk

---

## ✅ The Fix: Universal Multi-Path Algorithm

### Reset Modes We Support (honest scope)

| Mode (UI label) | What it actually does | Result |
|------|-------------|--------|
| **Factory Reset + Provisioning Bypass (full wipe)** | Factory reset + clear setup/provisioning flags via ADB | Data erased; flags cleared — but the encrypted FRP partition is NOT erased. Reboot + re-check required. |
| **Factory Reset + Temporary Bypass (full wipe)** | Factory reset + flag bypass only | Data erased; FRP partition untouched — may re-lock on next reset. |
| **Provisioning Bypass (Keep Data)** | Clear flags only, no data wipe | Keeps data; does NOT remove the FRP partition — temporary, not permanent. |
| **Quick Bypass (Keep Data)** | Flag bypass only, no data wipe | Temporary; FRP partition untouched. |

> **Key correction:** a *true* FRP partition erase (`/dev/block/by-name/frp`) is a **below-OS**
> operation (EDL/Brom/Odin/SPD) and it **destroys the ability to decrypt /data**. You cannot
> "erase FRP and keep all user data" — those two goals conflict. The ADB ladder clears flags only.
> `ro.frp.pst` is read-only and only reflects a real below-OS erase; it is not a setting.

---

## 🔑 Key Algorithms to Implement (Priority Order)

1. **Chipset Auto-Detection** — Read `ro.hardware.chipname`, `ro.board.platform`, `ro.product.cpu.abi` to determine Exynos/Qualcomm/MTK
2. **Samsung Test Mode Flow** — Emergency dial *#0*# → auto-accept USB debugging → ADB removal
3. **Exynos Download Mode Flow** — Odin/Heimdall flash Enable-ADB → ADB removal → reflash stock
4. **Qualcomm EDL Flow** — 9008 mode → firehose loader → erase FRP partition
5. **MediaTek Brom Flow** — Preloader mode → erase FRP partition
6. **Multi-Phase Verification** — After each step, check FRP state
7. **Auto-Escalation** — If method A fails, try B, then C
8. **Progress Tracking** — Real-time % completion
9. **Binary/Bit Version Matching** — Prevent bricking
10. **Multi-Brand Support** — Xiaomi, OPPO, Vivo, etc.
