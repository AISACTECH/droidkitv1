// =====================================================================
// FRP Adaptive Engine — partition safety (T7)
// ---------------------------------------------------------------------
// Algorithm #3 from the brief (System Partition Patching), reframed
// under the repo's honesty + safety law:
//
//   * ANALYSIS: read-only survey of boot/AVB state (getprop + `ls` only —
//     enforced by test), because that is what decides which lanes are
//     even physically reachable.
//   * HONESTY: Verified Boot compares every protected partition against
//     the signed vbmeta digest. A patched partition without the vendor's
//     signing key is detected at next boot — "undetectable patching" of
//     AVB-protected partitions is not physically available, and this
//     module never pretends it is.
//   * SAFETY: any persistent step (flash/erase) is refused unless a
//     pre-captured backup + reflash path exists (rollback manifest).
//     In-memory / non-persistent preference is encoded in the policy.
//   * ROLLBACK: restores the original state if anything fails — the
//     fail-safe that prevents bricking.
//
// This module contains NO write path. It is policy + analysis only.
// =====================================================================

import type {
  AvbAssessment,
  Fingerprint,
  PartitionSurvey,
  RollbackPlan,
} from "./types.ts";

/** Read-only shell commands the Rust survey is allowed to run. */
export const SURVEY_COMMANDS: { command: string; label: string }[] = [
  { command: "getprop ro.boot.verifiedbootstate", label: "Verified boot state (green/yellow/orange)" },
  { command: "getprop ro.boot.vbmeta.device_state", label: "vbmeta device state (locked/unlocked)" },
  { command: "getprop ro.build.tags", label: "Build tags (release-keys / dev-keys)" },
  { command: "getprop ro.oem_unlock_supported", label: "OEM unlock supported" },
  { command: "getprop ro.boot.flash.locked", label: "Bootloader flash lock" },
  { command: "getprop ro.build.version.security_patch", label: "Security patch level" },
  { command: "getprop ro.build.version.release", label: "Android release" },
  { command: "getprop ro.build.fingerprint", label: "Build fingerprint" },
  { command: "ls -l /dev/block/by-name", label: "Partition table (by-name)" },
];

const FORBIDDEN_TOKENS = ["dd ", "erase", "fastboot", "rm ", "mv ", "cp ", ">"];

/**
 * Assert a command is read-only (no writes, erases, redirects).
 * The test suite runs every SURVEY_COMMANDS entry through this.
 */
export function assertReadOnly(command: string): boolean {
  const c = ` ${command.toLowerCase()} `;
  return !FORBIDDEN_TOKENS.some((t) => c.includes(t));
}

/** AVB honesty statement — surfaced verbatim in the UI and docs. */
export const AVB_HONESTY =
  "Verified Boot (AVB) compares every protected partition against the signed vbmeta digest at boot. " +
  "A patched partition without the vendor's signing key is detected immediately and the device refuses " +
  "to start — so 'undetectable patching' of AVB-protected partitions is not physically available. " +
  "Paralock therefore treats protected-partition patching as out of scope: the engine works in the lanes " +
  "that exist below or outside AVB (chipset bootrom/bootloader paths) where the vendor supports them, " +
  "and every persistent step demands a pre-captured backup and rollback plan.";

/** Analyze a survey result into an AVB/bootloader assessment. */
export function assessAvb(survey: PartitionSurvey, fp: Fingerprint): AvbAssessment {
  const get = (name: string): string | null =>
    survey.properties.find((p) => p.name === name)?.value ?? null;

  const verifiedBootState = get("ro.boot.verifiedbootstate");
  const vbmetaDeviceState = get("ro.boot.vbmeta.device_state");
  const buildTags = get("ro.build.tags");
  const flashLocked = get("ro.boot.flash.locked");

  let bootloaderLocked: boolean | null = null;
  if (vbmetaDeviceState) bootloaderLocked = vbmetaDeviceState === "locked";
  else if (flashLocked) bootloaderLocked = flashLocked === "1";
  else if (buildTags && buildTags.includes("release-keys") && !buildTags.includes("dev-keys")) {
    bootloaderLocked = true; // release-keys + no dev-keys ⇒ locked in practice
  }

  const verdict: AvbAssessment["verdict"] =
    verifiedBootState === "green" && bootloaderLocked !== false
      ? "avb_enforcing"
      : bootloaderLocked === false
        ? "avb_relaxed"
        : "unknown";

  const chipsetNote =
    fp.chipsetFamily === "MediaTek" || fp.chipsetFamily === "Spreadtrum"
      ? " Note: Brom/SPD-class paths operate in the bootrom below AVB — they are the reachable lane when AVB is enforcing."
      : fp.chipsetFamily === "Exynos" || fp.chipsetFamily === "Qualcomm"
        ? " Note: Download-Mode/EDL paths are bootloader-gated — bit/version and signed-loader availability decide reachability."
        : "";

  return {
    verifiedBootState,
    vbmetaDeviceState,
    buildTags,
    bootloaderLocked,
    verdict,
    honesty: AVB_HONESTY + chipsetNote,
  };
}

/**
 * Rollback plan for a set of planned persistent steps.
 * Hard refusal when a flash/erase step lacks a pre-captured backup —
 * the fail-safe that prevents bricking.
 */
export function planRollback(
  persistentSteps: { label: string; kind: "flash" | "erase" | "boot_mode" }[],
  backupsReady: { partition: string; captured: boolean }[],
): RollbackPlan {
  const flashy = persistentSteps.filter((s) => s.kind === "flash" || s.kind === "erase");
  if (flashy.length === 0) {
    return { applicable: false, requiredBackups: [], restoreSteps: [], refusalNote: null };
  }

  const requiredBackups = flashy.map((s) => {
    const backup = backupsReady.find((b) => b.partition === s.label) ?? { captured: false };
    return `${s.label}: ${backup.captured ? "backup captured ✅" : "backup REQUIRED ❌"}`;
  });
  const missing = requiredBackups.filter((b) => b.includes("❌"));
  if (missing.length > 0) {
    return {
      applicable: true,
      requiredBackups,
      restoreSteps: [],
      refusalNote: `Refusing persistent steps: missing pre-captured backups for ${missing.join(", ")}. Capture a full partition image (read-only dd to the PC) and the vbmeta digests first.`,
    };
  }

  return {
    applicable: true,
    requiredBackups,
    restoreSteps: [
      "1. Verify the captured backup hash matches the partition hash recorded pre-step.",
      "2. On any failure: re-enter the boot mode and restore the original partition image.",
      "3. Reflash the stock firmware archive if the bootloader refuses the restored image.",
      "4. Re-run the survey and confirm verifiedbootstate/vbmeta are back to their pre-step values.",
      "5. Journal the rollback outcome (success or failure) for the calibration loop.",
    ],
    refusalNote: null,
  };
}
