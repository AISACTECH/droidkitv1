// =====================================================================
// FRP Adaptive Engine — FRP-related partition knowledge (WBS A3-1.1)
// ---------------------------------------------------------------------
// By-name partition conventions per chipset family, with roles and
// backup recommendations. These names are CONVENTIONS — the read-only
// survey (`ls /dev/block/by-name`) confirms the actual table on-device
// and the dump manifest is generated from the survey, not from here.
// =====================================================================

import type { ChipsetFamily } from "./types.ts";

export interface PartitionRecord {
  name: string;
  role: string;
  frpRelevant: boolean;
  backupRecommended: "always" | "recommended" | "no";
  note: string;
}

const COMMON: PartitionRecord[] = [
  {
    name: "frp",
    role: "FRP persistent flag block (ro.frp.pst). THE target partition of every hardware erase lane.",
    frpRelevant: true,
    backupRecommended: "always",
    note: "Erasing it removes the lock; dumping it first is what makes rollback possible.",
  },
  {
    name: "vbmeta",
    role: "AVB root of trust: digests + rollback index for every protected partition.",
    frpRelevant: true,
    backupRecommended: "always",
    note: "NEVER written by this engine — unsigned vbmeta changes are detected at boot (see AVB_HONESTY).",
  },
  {
    name: "boot",
    role: "Kernel + ramdisk. Verified by vbmeta.",
    frpRelevant: false,
    backupRecommended: "recommended",
    note: "Backed up as part of a full firmware archive, not patched.",
  },
  {
    name: "userdata",
    role: "FBE-encrypted user data. Wiping removes FBE keys with the data.",
    frpRelevant: false,
    backupRecommended: "recommended",
    note: "Erase lanes wipe it only when the user chooses the factory-reset mode (data-loss warning).",
  },
  {
    name: "metadata",
    role: "FBE metadata + key blob (Keymaster).",
    frpRelevant: false,
    backupRecommended: "recommended",
    note: "Wiped together with userdata on factory-reset lanes.",
  },
  {
    name: "misc",
    role: "Bootloader message flags (recovery instructions, wipe requests).",
    frpRelevant: false,
    backupRecommended: "recommended",
    note: "Read-only in our plans; written by recovery when the user requests a wipe.",
  },
];

const FAMILY_EXTRA: Partial<Record<ChipsetFamily, PartitionRecord[]>> = {
  Qualcomm: [
    { name: "persist", role: "Calibration + QC FRP-related persistent data (some vendors mirror FRP bits here).", frpRelevant: true, backupRecommended: "always", note: "Backed up before any EDL erase on QC devices." },
    { name: "abl", role: "Android BootLoader (ABL) — boot chain stage.", frpRelevant: false, backupRecommended: "recommended", note: "Signed; not modified." },
    { name: "xbl", role: "eXtensible Boot Loader.", frpRelevant: false, backupRecommended: "no", note: "Signed; documented for completeness." },
  ],
  MediaTek: [
    { name: "proinfo", role: "MTK persistent info block.", frpRelevant: true, backupRecommended: "always", note: "Contains FRP-related bits on some MTK designs; dumped before Brom erase." },
    { name: "nvram", role: "Radio calibration data.", frpRelevant: false, backupRecommended: "always", note: "Loss = broken IMEI/WiFi — never touched, always dumped." },
    { name: "nvdata", role: "NV data extension.", frpRelevant: false, backupRecommended: "always", note: "Same protection as nvram." },
    { name: "protect1", role: "Protected block 1 (lock flags).", frpRelevant: false, backupRecommended: "always", note: "Required for rollback of bootloader-state changes." },
    { name: "protect2", role: "Protected block 2.", frpRelevant: false, backupRecommended: "always", note: "Required for rollback." },
    { name: "seccfg", role: "Security config (boot state flags).", frpRelevant: false, backupRecommended: "always", note: "Read-only in our plans." },
    { name: "lk", role: "Little Kernel bootloader.", frpRelevant: false, backupRecommended: "recommended", note: "Signed; not modified." },
  ],
  Spreadtrum: [
    { name: "splloader", role: "SPD bootloader stage.", frpRelevant: false, backupRecommended: "recommended", note: "SPD bootrom tools operate below it." },
    { name: "prodnv", role: "Production NV data.", frpRelevant: false, backupRecommended: "always", note: "Radio calibration — never touched." },
    { name: "wcnmodem", role: "WCN modem firmware.", frpRelevant: false, backupRecommended: "recommended", note: "Signed; not modified." },
  ],
  Exynos: [
    { name: "up_param", role: "Samsung boot parameter block (screen state on some models).", frpRelevant: false, backupRecommended: "recommended", note: "Backed up with firmware archive." },
    { name: "param", role: "Samsung parameter block.", frpRelevant: false, backupRecommended: "recommended", note: "Signed; not modified." },
    { name: "steady", role: "Samsung steady state data.", frpRelevant: false, backupRecommended: "recommended", note: "Documented for completeness." },
  ],
  Kirin: [
    { name: "xloader", role: "HiSilicon first-stage loader.", frpRelevant: false, backupRecommended: "no", note: "Signed; no public erase path — official recovery applies." },
  ],
};

export function partitionsFor(chipset: ChipsetFamily): PartitionRecord[] {
  return [...COMMON, ...(FAMILY_EXTRA[chipset] ?? [])];
}

export const ANDROID_1516_NOTE =
  "Android 15/16 did not move the FRP flag to a new partition — enforcement shifted: pre-setup USB/ADB " +
  "restrictions closed the OS lanes, and verification pressure moved server-side. The partition-level " +
  "surface (frp block, vbmeta, FBE metadata) is unchanged, which is exactly why the chipset bootrom/bootloader " +
  "lanes remain the reachable path below the patch wall (RESEARCH-2026-FRP.md §3).";
