// =====================================================================
// FRP Adaptive Engine — Google verification stack knowledge (WBS A1-1.2,
// A1-1.3, A3-1.3, A3-3.1)
// ---------------------------------------------------------------------
// A structured, sourced map of the enforcement layers and entry points
// the engine reasons about. Every fact below is public knowledge
// (AOSP source, vendor documentation, the repo's own Aug-2026 research
// digest) — this module is NOT a decompilation of Google binaries and
// does not claim to be.
// =====================================================================

import type { StackLayer } from "./types.ts";

export interface StackComponent {
  id: string;
  layer: StackLayer;
  role: string;
  /** Whether this is an exploitable entry point in some band. */
  entryPoint: boolean;
  /** Patchability + Android 15/16 notes. */
  notes: string;
  sources: string[];
}

export const VERIFICATION_STACK: StackComponent[] = [
  {
    id: "frp_partition",
    layer: "bootloader",
    role: "Persistent FRP flag block (AOSP PersistentDataBlockService; exposed as ro.frp.pst). The lock the whole industry targets at block level.",
    entryPoint: false,
    notes:
      "Erased below the OS by Brom/EDL/SPD-class tools or gated fastboot. On Android 15/16 the flag itself is unchanged; what changed is that reaching it via the OS got closed.",
    sources: ["AOSP PersistentDataBlockService", "RESEARCH-2026-FRP.md §1 (MTKClient erases frp,persistence)"],
  },
  {
    id: "settings_provider",
    layer: "os",
    role: "Settings.Global.DEVICE_PROVISIONED + Settings.Secure.USER_SETUP_COMPLETE — the provisioning flags ADB methods write.",
    entryPoint: true,
    notes:
      "Writable only when ADB is authorized. The flag path still works where the pre-authorized window exists; it cannot be reached on a patched 15/16 device before setup.",
    sources: ["RESEARCH-2026-FRP.md §2", "frp/bypass.rs (DeviceProvisioning method)"],
  },
  {
    id: "content_provider",
    layer: "os",
    role: "content://settings/secure inserts — the content-provider variant of flag injection (bypassed some Knox blocks on older builds).",
    entryPoint: true,
    notes: "Same ADB authorization precondition; age-tagged in the catalog (Android ≤12 evidence).",
    sources: ["RESEARCH-2026-FRP.md §2 (quitehacker/ADB-FRP-Bypass class)"],
  },
  {
    id: "setup_wizard",
    layer: "app",
    role: "com.google.android.setupwizard (+ OEM variants: Samsung, Transsion, Xiaomi…) — gates completion until the account check passes.",
    entryPoint: true,
    notes:
      "Disable/uninstall works only behind authorized ADB. The wizard itself is the UI surface Algorithm #2's FSM navigates.",
    sources: ["frp/bypass.rs (SetupWizardDisable)", "ui-fsm.ts OEM flow tables"],
  },
  {
    id: "google_account_check",
    layer: "server",
    role: "com.google.android.gsf.login verifies the last synced account against Google's servers (Android ID + IMEI bound to the account).",
    entryPoint: false,
    notes:
      "A question asked to someone else's database — cannot be computed around. The one layer every honest tool routes through or around (never through).",
    sources: ["DEBATE-AI-VS-GOOGLE.md", "RESEARCH-2026-FRP.md §3"],
  },
  {
    id: "accessibility_uiautomator",
    layer: "os",
    role: "uiautomator dump/click + accessibility traversal — the read/act channel the UI FSM uses to recognize and drive FRP screens.",
    entryPoint: true,
    notes: "Interaction lane only: it drives the UI, it does not unlock anything by itself.",
    sources: ["ScreenControl reflection layer (screen_mirror.rs)"],
  },
  {
    id: "adb_shell",
    layer: "os",
    role: "The transport for every OS-layer method (getprop/settings/pm/content/am).",
    entryPoint: true,
    notes:
      "Android 16 restricts USB/debugging access before setup completes — the 2026 consensus: ADB-before-setup mostly fails on 15/16 (the honest precondition).",
    sources: ["RESEARCH-2026-FRP.md §3 patch-wall table"],
  },
  {
    id: "oem_test_modes",
    layer: "app",
    role: "OEM diagnostic menus (Samsung *#0*# → HWModuleTest) that historically exposed settings/USB-debugging toggles from the FRP screen.",
    entryPoint: true,
    notes: "Mostly patched on One UI 6 / Android 14+; the FSM probes reachability and escalates when absent.",
    sources: ["FRP-ALGORITHM-ANALYSIS.md (SamFW flow)", "RESEARCH-2026-FRP.md §3"],
  },
  {
    id: "bootloader_fastboot",
    layer: "bootloader",
    role: "fastboot erase frp / oem unlock — gated by the bootloader lock; rejected on locked modern devices.",
    entryPoint: true,
    notes: "Only viable when OEM unlocking was enabled BEFORE the reset; otherwise refused by the device itself.",
    sources: ["frp/fastboot.rs (gated command surface)"],
  },
  {
    id: "chipset_bootroms",
    layer: "bootrom",
    role: "Mask-ROM protocols: MTK Brom (mtkclient class), SPD bootrom auto-ADB, QC EDL firehose, Exynos Download Mode (Odin).",
    entryPoint: true,
    notes:
      "Silicon bugs cannot be OTA-patched — the patch-proof lane that stays open on Android 15/16 where the vendor's ROM exposes it (SLA/DAA-signed chips may still gate it).",
    sources: ["RESEARCH-2026-FRP.md §1", "docs/PHYSICS-LAYER-RESEARCH.md"],
  },
  {
    id: "avb_vbmeta",
    layer: "bootloader",
    role: "Verified Boot: vbmeta digests + hashtrees + rollback index. Detects any unsigned change to protected partitions at next boot.",
    entryPoint: false,
    notes:
      "The physics wall behind the engine's refusal to offer 'undetectable patching'. Below-AVB lanes (bootrom) are the legitimate route; AVB-protected writes are never planned.",
    sources: ["partition-safety.ts AVB_HONESTY", "docs/PHYSICS-LAYER-RESEARCH.md"],
  },
  {
    id: "fbe_metadata",
    layer: "os",
    role: "File-Based Encryption: userdata keys via Keymaster/TEE; key blob + FBE metadata live in the metadata partition.",
    entryPoint: false,
    notes:
      "Erasing frp alone does not touch user data; wiping userdata also removes the FBE keys — hence the dump-first rollback law in the patch planner.",
    sources: ["AOSP FBE documentation"],
  },
  {
    id: "rpmb",
    layer: "hardware",
    role: "Replay-Protected Memory Block (eMMC/UFS) — rollback counters and key storage outside the visible partitions.",
    entryPoint: false,
    notes: "Why 'patch the rollback counter' is not a software operation; RPMB writes need the eMMC vendor key.",
    sources: ["docs/PHYSICS-LAYER-RESEARCH.md"],
  },
];

/** Entry points the decision tree / validation harness reason about. */
export const ENTRY_POINTS = VERIFICATION_STACK.filter((c) => c.entryPoint).map((c) => c.id);

/** Honesty statement for the research lane (surfaced in UI + docs). */
export const RESEARCH_HONESTY =
  "Facts in this module are compiled from public sources (AOSP, vendor documentation, and the repo's " +
  "Aug-2026 research digest) — not from decompiling Google binaries. Where the evidence is field-reported, " +
  "the source says so; where it is bench-gated, the task board says so.";
