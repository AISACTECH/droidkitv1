// =====================================================================
// Virtual donors — public-spec synthetic fingerprints
// --------------------------------------------------------------------
// These are NOT captures from locked customer devices. Each row is a
// published device class (brand / SoC / Android major) used to prove
// the engine routes that class correctly. Replay success ≠ unlock
// success. Stretch blockers stay visible.
// =====================================================================

import type { Fingerprint } from "../adaptive-engine/types.ts"
import type { VirtualDonor } from "./types.ts"

function donorFp(partial: Partial<Fingerprint> & Pick<Fingerprint, "brand" | "brandRaw" | "modelCode" | "chipsetFamily" | "androidMajor" | "androidVersionRaw">): Fingerprint {
  return {
    marketingName: null,
    chipsetName: "unknown",
    sdkVersion: "",
    securityPatch: null,
    binaryVersion: null,
    bootloaderVersion: null,
    buildFingerprint: null,
    knoxVersion: null,
    frpState: "Active",
    adbState: "Unauthorized",
    deviceMode: "Normal",
    hasSim: true,
    hasWifi: true,
    ...partial,
  }
}

function dump(lines: Record<string, string>): string {
  return Object.entries(lines)
    .map(([k, v]) => `[${k}]: [${v}]`)
    .join("\n")
}

export const VIRTUAL_DONORS: VirtualDonor[] = [
  {
    deviceId: "samsung-a05s",
    label: "Samsung Galaxy A05s (MT6768, A14 pre-2024 patch)",
    fingerprint: donorFp({
      brand: "samsung", brandRaw: "samsung", modelCode: "SM-A057F", marketingName: "Galaxy A05s",
      chipsetFamily: "MediaTek", chipsetName: "mt6768",
      androidMajor: 14, androidVersionRaw: "14", sdkVersion: "34", securityPatch: "2023-11-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "samsung", "ro.product.model": "SM-A057F",
      "ro.build.version.release": "14", "ro.build.version.sdk": "34",
      "ro.build.version.security_patch": "2023-11-01", "ro.hardware": "mt6768",
    }),
    expectedBand: "testmode_contested",
    expectedPrimary: "samsung_test_mode",
    stretchStatus: "documented",
    blocker: "none — already at the documented Brom-class band in FRP_STRETCH.",
    notes: "A14 + patch 2023 is the contested test-mode window. Brom remains the stretch lane.",
  },
  {
    deviceId: "samsung-a13",
    label: "Samsung Galaxy A13 (Exynos, A14)",
    fingerprint: donorFp({
      brand: "samsung", brandRaw: "samsung", modelCode: "SM-A137F", marketingName: "Galaxy A13",
      chipsetFamily: "Exynos", chipsetName: "exynos850",
      androidMajor: 14, androidVersionRaw: "14", sdkVersion: "34", securityPatch: "2024-06-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "samsung", "ro.product.model": "SM-A137F",
      "ro.build.version.release": "14", "ro.build.version.sdk": "34",
      "ro.build.version.security_patch": "2024-06-01", "ro.hardware": "exynos850",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "exynos_download_mode",
    stretchStatus: "documented",
    blocker: "bench-confirm one owned Exynos A13 donor before promoting the stretch band.",
    notes: "A14 + 2024 patch closes software; Download-Mode is the engine primary.",
  },
  {
    deviceId: "samsung-a15",
    label: "Samsung Galaxy A15 (MT6789, Android 15)",
    fingerprint: donorFp({
      brand: "samsung", brandRaw: "samsung", modelCode: "SM-A155F", marketingName: "Galaxy A15",
      chipsetFamily: "MediaTek", chipsetName: "mt6789",
      androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01",
      binaryVersion: "U7", knoxVersion: "3.9",
    }),
    getpropDump: dump({
      "ro.product.brand": "samsung", "ro.product.model": "SM-A155F",
      "ro.build.version.release": "15", "ro.build.version.sdk": "35",
      "ro.build.version.security_patch": "2025-09-01", "ro.hardware": "mt6789",
      "ro.boot.verifiedbootstate": "green", "ro.boot.vbmeta.device_state": "locked",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "mediatek_brom",
    stretchStatus: "bench-pending",
    blocker: "bench: confirm MT6789 Brom entry + DA acceptance on an owned donor.",
    notes: "A15 software window closed. Engine primary is Brom. SLA/DAA is the open silicon question.",
  },
  {
    deviceId: "samsung-a16",
    label: "Samsung Galaxy A16 (Exynos, Android 16, Binary 18)",
    fingerprint: donorFp({
      brand: "samsung", brandRaw: "samsung", modelCode: "SM-A166B", marketingName: "Galaxy A16",
      chipsetFamily: "Exynos", chipsetName: "exynos1330",
      androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01",
      binaryVersion: "U18", knoxVersion: "3.10",
    }),
    getpropDump: dump({
      "ro.product.brand": "samsung", "ro.product.model": "SM-A166B",
      "ro.build.version.release": "16", "ro.build.version.sdk": "36",
      "ro.build.version.security_patch": "2025-12-01", "ro.hardware": "exynos1330",
      "ro.build.version.incremental": "A166BXXS8BYA1",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "exynos_download_mode",
    stretchStatus: "documented",
    blocker: "physics: KG-Prenormal USB gate is processor-level. No honest upward move.",
    notes: "Binary ≥18 does not change the engine band; it caps the USB-while-OS-on lane (P9).",
  },
  {
    deviceId: "samsung-s25",
    label: "Samsung Galaxy S25 (Qualcomm, Android 16)",
    fingerprint: donorFp({
      brand: "samsung", brandRaw: "samsung", modelCode: "SM-S931B", marketingName: "Galaxy S25",
      chipsetFamily: "Qualcomm", chipsetName: "sm8750",
      androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "samsung", "ro.product.model": "SM-S931B",
      "ro.build.version.release": "16", "ro.build.version.sdk": "36",
      "ro.build.version.security_patch": "2025-12-01", "ro.board.platform": "sm8750",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "qualcomm_edl",
    stretchStatus: "documented",
    blocker: "signed firehose loader is per-model vendor material — not a software gap.",
    notes: "EDL is the engine primary. Without a signed loader the lane is gated, honestly.",
  },
  {
    deviceId: "google-pixel9",
    label: "Google Pixel 9 (Tensor, Android 16)",
    fingerprint: donorFp({
      brand: "google", brandRaw: "google", modelCode: "Pixel 9", marketingName: "Pixel 9",
      chipsetFamily: "Unknown", chipsetName: "tensor",
      androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "google", "ro.product.model": "Pixel 9",
      "ro.build.version.release": "16", "ro.build.version.sdk": "36",
      "ro.build.version.security_patch": "2025-12-01", "ro.hardware": "tensor",
    }),
    expectedBand: "official_only",
    expectedPrimary: "official_recovery",
    stretchStatus: "documented",
    blocker: "physics: 0 is the correct number for every tool. Owner credentials only.",
    notes: "Tensor is not in the chipset enum → Unknown → official_only. Correct.",
  },
  {
    deviceId: "tecno-spark30",
    label: "Tecno Spark 30 (MT6769, Android 15)",
    fingerprint: donorFp({
      brand: "transsion", brandRaw: "tecno", modelCode: "KJ5", marketingName: "Spark 30",
      chipsetFamily: "MediaTek", chipsetName: "mt6769",
      androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-08-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "tecno", "ro.product.model": "KJ5",
      "ro.build.version.release": "15", "ro.build.version.sdk": "35",
      "ro.build.version.security_patch": "2025-08-01", "ro.hardware": "mt6769",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "mediatek_brom",
    stretchStatus: "bench-pending",
    blocker: "bench: one owned Spark 30 donor, Brom erase + reboot observation.",
    notes: "HiOS A15. Engine primary Brom. SLA/DAA on 2025 patches unconfirmed.",
  },
  {
    deviceId: "infinix-hot50",
    label: "Infinix Hot 50 (UMS9230, Android 15)",
    fingerprint: donorFp({
      brand: "transsion", brandRaw: "infinix", modelCode: "X6882", marketingName: "Hot 50",
      chipsetFamily: "Spreadtrum", chipsetName: "ums9230",
      androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-07-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "infinix", "ro.product.model": "X6882",
      "ro.build.version.release": "15", "ro.build.version.sdk": "35",
      "ro.build.version.security_patch": "2025-07-01", "ro.hardware": "ums9230",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "spd_bootloader",
    stretchStatus: "documented",
    blocker: "bench-confirm UMS9230 revision on a donor before promoting.",
    notes: "SPD bootrom class. Engine primary spd_bootloader.",
  },
  {
    deviceId: "itel-a80",
    label: "Itel A80 (UMS9230, Android 14)",
    fingerprint: donorFp({
      brand: "transsion", brandRaw: "itel", modelCode: "A665L", marketingName: "A80",
      chipsetFamily: "Spreadtrum", chipsetName: "ums9230",
      androidMajor: 14, androidVersionRaw: "14", sdkVersion: "34", securityPatch: "2024-08-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "itel", "ro.product.model": "A665L",
      "ro.build.version.release": "14", "ro.build.version.sdk": "34",
      "ro.build.version.security_patch": "2024-08-01", "ro.hardware": "ums9230",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "spd_bootloader",
    stretchStatus: "documented",
    blocker: "bench-confirm on the A14 donor.",
    notes: "A14 + 2024 patch → chipset_hardware. Same SPD class as Hot 50.",
  },
  {
    deviceId: "xiaomi-redmi14c",
    label: "Xiaomi Redmi 14C (MT6769, Android 15)",
    fingerprint: donorFp({
      brand: "xiaomi", brandRaw: "redmi", modelCode: "2411DRN47C", marketingName: "Redmi 14C",
      chipsetFamily: "MediaTek", chipsetName: "mt6769",
      androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "redmi", "ro.product.model": "2411DRN47C",
      "ro.build.version.release": "15", "ro.build.version.sdk": "35",
      "ro.build.version.security_patch": "2025-09-01", "ro.hardware": "mt6769",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "mediatek_brom",
    stretchStatus: "bench-pending",
    blocker: "bench: donor unit; verify Brom + whether Mi-account re-prompts post-erase.",
    notes: "HyperOS may co-gate. Engine still routes Brom first.",
  },
  {
    deviceId: "oppo-a3x",
    label: "OPPO A3x (SM4450, Android 15)",
    fingerprint: donorFp({
      brand: "oppo", brandRaw: "oppo", modelCode: "CPH2681", marketingName: "A3x",
      chipsetFamily: "Qualcomm", chipsetName: "sm4450",
      androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-08-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "oppo", "ro.product.model": "CPH2681",
      "ro.build.version.release": "15", "ro.build.version.sdk": "35",
      "ro.build.version.security_patch": "2025-08-01", "ro.board.platform": "sm4450",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "qualcomm_edl",
    stretchStatus: "documented",
    blocker: "vendor loader material — not closable in software.",
    notes: "Firehose not public. Engine names the lane; it does not ship a loader.",
  },
  {
    deviceId: "moto-g24",
    label: "Motorola Moto G24 (MT6769, Android 14)",
    fingerprint: donorFp({
      brand: "motorola", brandRaw: "motorola", modelCode: "XT2423-3", marketingName: "moto g24",
      chipsetFamily: "MediaTek", chipsetName: "mt6769",
      androidMajor: 14, androidVersionRaw: "14", sdkVersion: "34", securityPatch: "2024-09-01",
    }),
    getpropDump: dump({
      "ro.product.brand": "motorola", "ro.product.model": "XT2423-3",
      "ro.build.version.release": "14", "ro.build.version.sdk": "34",
      "ro.build.version.security_patch": "2024-09-01", "ro.hardware": "mt6769",
    }),
    expectedBand: "chipset_hardware",
    expectedPrimary: "mediatek_brom",
    stretchStatus: "bench-pending",
    blocker: "bench: donor Moto G24, Brom erase + post-reboot detection.",
    notes: "Near-stock A14 + 2024 patch. Engine primary Brom.",
  },
]

export function donorById(id: string): VirtualDonor | undefined {
  return VIRTUAL_DONORS.find((d) => d.deviceId === id)
}
