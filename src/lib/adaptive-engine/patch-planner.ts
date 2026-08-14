// =====================================================================
// FRP Adaptive Engine — patch planner (WBS A3-1.2, A3-2.1, A3-2.2,
// A3-2.3, A3-3.2, A3-4.2, A3-4.3)
// ---------------------------------------------------------------------
// The safe half of Algorithm #3:
//   * dump manifest  — read-only partition dumps (dd if=<block>
//                      of=/sdcard/...) + pull + hash; reading does NOT
//                      trip Verified Boot (only unsigned writes do)
//   * patch plan     — the MINIMAL patch per chipset lane: erase the
//                      FRP block below the OS (Brom/EDL/SPD/Odin-ADB),
//                      never a vbmeta-protected write
//   * flash gates    — refuse semantics: backups, bit/version match,
//                      firmware archive, hash check
//   * recovery script — restore-from-backup steps, gated + ordered
// =====================================================================

import { partitionsFor } from "./partition-knowledge.ts";
import type {
  ChipsetFamily,
  DumpManifest,
  DumpManifestItem,
  FeasibilityBand,
  FlashGateCheck,
  PatchPlan,
  RecoveryScript,
} from "./types.ts";

/** Is a dd command a READ of a block device (dump to /sdcard)? */
export function isReadOnlyDump(cmd: string): boolean {
  const c = cmd.trim();
  const mIf = c.match(/if=(\S+)/);
  const mOf = c.match(/of=(\S+)/);
  if (!mIf || !mOf) return false;
  const ifTarget = mIf[1];
  const ofTarget = mOf[1];
  return (
    ifTarget.startsWith("/dev/block") &&
    !ofTarget.startsWith("/dev/") &&
    !/fastboot|erase/.test(c.toLowerCase())
  );
}

/** Build the read-only dump manifest for a chipset. */
export function buildDumpManifest(chipset: ChipsetFamily, blockDevices: string[] = []): DumpManifest {
  const items: DumpManifestItem[] = partitionsFor(chipset)
    .filter((p) => p.backupRecommended !== "no")
    .map((p) => {
      const name = p.name;
      const known = blockDevices.some((line) => line.includes(`${name} ->`) || line.includes(` ${name} ->`));
      const devicePath = known ? `/dev/block/by-name/${name}` : `/dev/block/by-name/${name}  # verify path from survey`;
      return {
        partition: name,
        role: p.role,
        backupRecommended: p.backupRecommended,
        commands: [
          `adb shell mkdir -p /sdcard/paralock-backup`,
          `adb shell dd if=${devicePath} of=/sdcard/paralock-backup/${name}.img bs=4096`,
          `adb pull /sdcard/paralock-backup/${name}.img`,
          `sha256sum ${name}.img | tee paralock-backup/${name}.img.sha256`,
        ],
      };
    });
  return {
    chipset,
    readOnly: true,
    avbSafeNote:
      "Dumping READS partitions — it does not modify vbmeta digests, so Verified Boot does not react. " +
      "Only unsigned WRITES trip AVB at next boot; this manifest contains none.",
    items,
  };
}

/** Minimal patch plan per chipset lane. Never touches vbmeta. */
export function buildPatchPlan(
  chipset: ChipsetFamily,
  band: FeasibilityBand,
): PatchPlan {
  if (band === "official_only" || band === "unknown" || band === "none_needed") {
    return {
      lane: "none",
      minimal: true,
      touches: [],
      refusesVbmetaWrites: true,
      preconditions: ["No lane exists for this band — the refusal is the plan."],
      steps: ["Official Google account recovery / authorized service center."],
      warning: null,
    };
  }
  switch (chipset) {
    case "MediaTek":
      return {
        lane: "brom_erase",
        minimal: true,
        touches: ["frp"],
        refusesVbmetaWrites: true,
        preconditions: [
          "Brom/Preloader entry possible (Vol keys + USB).",
          "frp partition dumped + sha256 recorded (rollback manifest).",
          "SLA/DAA-signed DA availability checked for this exact chip (else refuse).",
        ],
        steps: [
          "1. Enter Brom mode; verify detection (device id / handshake).",
          "2. Erase ONLY the frp partition (minimal footprint — userdata untouched).",
          "3. Reboot; re-run detection; reboot observation = final check.",
          "4. Journal the outcome; on failure restore frp from the dump (recovery script).",
        ],
        warning: "Some MTK designs mirror FRP bits in proinfo — verify the survey before erasing; never touch nvram/nvdata.",
      };
    case "Spreadtrum":
      return {
        lane: "spd_erase",
        minimal: true,
        touches: ["frp"],
        refusesVbmetaWrites: true,
        preconditions: ["SPD bootrom entry works (Vol Down + USB).", "frp dumped + hashed first."],
        steps: [
          "1. Enter SPD bootloader; tool auto-enables ADB on the bootrom path.",
          "2. Erase ONLY frp.",
          "3. Reboot observation + journal.",
        ],
        warning: "prodnv carries radio calibration — outside the patch plan by law.",
      };
    case "Exynos":
      return {
        lane: "odin_enable_adb",
        minimal: true,
        touches: ["(temporary) enable-adb package", "stock reflash"],
        refusesVbmetaWrites: true,
        preconditions: [
          "Download Mode entry confirmed.",
          "Bit/version gate checked against the enable-adb package (wrong bit = brick).",
          "Stock firmware archive downloaded + hashed for reflash.",
        ],
        steps: [
          "1. Flash enable-adb package via Odin/Heimdall class tool.",
          "2. Run the ADB ladder (flags → packages) with verification.",
          "3. Reflash STOCK firmware (restores normal boot + signature state).",
          "4. Reboot observation + journal.",
        ],
        warning: "The enable-adb package is temporary BY DESIGN — the stock reflash step is not optional.",
      };
    case "Qualcomm":
      return {
        lane: "edl_erase",
        minimal: true,
        touches: ["frp"],
        refusesVbmetaWrites: true,
        preconditions: [
          "EDL 9008 entry (EDL cable / test point).",
          "Signed firehose loader for this exact model + bit (else refuse).",
          "persist + frp dumped and hashed first.",
        ],
        steps: [
          "1. Load firehose; verify storage handshake.",
          "2. Erase ONLY frp (persist left intact unless the survey shows FRP mirroring).",
          "3. Reboot observation + journal.",
        ],
        warning: "Recent QC devices gate EDL behind signed loaders — no loader, no plan (refuse, don't improvise).",
      };
    default:
      return {
        lane: "none",
        minimal: true,
        touches: [],
        refusesVbmetaWrites: true,
        preconditions: ["No public lane for this chipset."],
        steps: ["Official recovery / authorized service center."],
        warning: null,
      };
  }
}

/** Flash safety gates — any failed CRITICAL gate refuses the plan. */
export function evaluateFlashGates(state: {
  backupsReady: boolean;
  bitVersionChecked: boolean;
  firmwareArchived: boolean;
  hashesVerified: boolean;
}): FlashGateCheck[] {
  return [
    {
      id: "backups",
      label: "Partition backups captured + hashed",
      passed: state.backupsReady,
      critical: true,
      detail: state.backupsReady ? "Dump manifest completed with sha256 records." : "MISSING — refuse to flash without a rollback path.",
    },
    {
      id: "bit_version",
      label: "Bit/version gate checked",
      passed: state.bitVersionChecked,
      critical: true,
      detail: state.bitVersionChecked ? "Flash file matches device bit/binary version." : "MISMATCH RISK — wrong bit/version is the classic brick cause.",
    },
    {
      id: "firmware_archive",
      label: "Stock firmware archive ready",
      passed: state.firmwareArchived,
      critical: true,
      detail: state.firmwareArchived ? "Reflash path exists." : "MISSING — refuse; a failed flash would leave the device unrecoverable.",
    },
    {
      id: "hashes",
      label: "Backup hashes re-verified pre-flash",
      passed: state.hashesVerified,
      critical: false,
      detail: state.hashesVerified ? "Hashes match the capture records." : "Recommended before any write.",
    },
  ];
}

/** Recovery script from a dump manifest — WRITE steps, always gated. */
export function generateRecoveryScript(manifest: DumpManifest): RecoveryScript {
  const steps: RecoveryScript["steps"] = [
    { line: "# RECOVERY — restores original partitions from the backup set. GATED: run only after evaluateFlashGates passes.", write: false, note: "Header" },
    { line: "adb reboot bootloader   # enter the lane used for the patch (Brom/EDL/Odin/SPD as applicable)", write: false, note: "Re-enter lane" },
  ];
  for (const item of manifest.items) {
    steps.push({
      line: `# verify backup hash before writing: sha256sum paralock-backup/${item.partition}.img`,
      write: false,
      note: "Hash check",
    });
    steps.push({
      line: `adb push paralock-backup/${item.partition}.img /sdcard/paralock-backup/${item.partition}.img`,
      write: false,
      note: "Stage backup",
    });
    steps.push({
      line: `adb shell dd if=/sdcard/paralock-backup/${item.partition}.img of=/dev/block/by-name/${item.partition} bs=4096`,
      write: true,
      note: `WRITE ${item.partition} — restore original (the only sanctioned write path)`,
    });
  }
  steps.push({ line: "adb reboot   # then re-run the survey and confirm verifiedbootstate/vbmeta back to baseline", write: false, note: "Verify rollback" });
  steps.push({ line: "# Journal the rollback outcome — success AND failure feed the calibration loop.", write: false, note: "Journal" });
  return { title: "Recovery script — restore from backup", steps };
}
