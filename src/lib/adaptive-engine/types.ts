// =====================================================================
// FRP Adaptive Engine — shared types
// ---------------------------------------------------------------------
// Pure, dependency-free type definitions for the Adaptive Engine
// (bands → catalog → decision tree → UI FSM → humanization →
// partition safety → journal). No React, no Tauri imports: these
// modules must run under `node --experimental-strip-types` so the
// decision logic is verifiable without Rust or a connected device.
//
// Honesty contract: same as FrpRemoval/RealityCheck and the Patch
// Oracle — feasibility is expressed in evidence bands, never as a
// promised success percentage.
// =====================================================================

/** Chipset family (mirrors the Rust `ChipsetFamily` enum, `frp/algorithm.rs`). */
export type ChipsetFamily =
  | "Exynos"
  | "Qualcomm"
  | "MediaTek"
  | "Spreadtrum"
  | "Kirin"
  | "Unknown";

/** ADB connection state (mirrors Rust `AdbState`). */
export type AdbState = "Authorized" | "Unauthorized" | "Unavailable";

/** Current device boot mode (mirrors Rust `DeviceMode`). */
export type DeviceMode =
  | "Normal"
  | "DownloadMode"
  | "EDL"
  | "Recovery"
  | "BromMode"
  | "Fastboot"
  | "Unknown";

/** FRP lock state (mirrors Rust `FrpState`). */
export type FrpState = "Active" | "Inactive" | "Unknown";

/** OEM brand id used by the catalog, FSM flow tables and decision tree. */
export type BrandId =
  | "samsung"
  | "google"
  | "xiaomi"
  | "oppo"
  | "vivo"
  | "transsion"
  | "huawei"
  | "motorola"
  | "other";

/**
 * Normalized device fingerprint — the single input to the decision tree.
 * Built from the existing `DeviceProfile` + `FrpDetectionResult` Tauri
 * commands (no new device I/O required for the decision engine).
 */
export interface Fingerprint {
  brand: BrandId;
  brandRaw: string;
  modelCode: string;
  marketingName: string | null;
  chipsetFamily: ChipsetFamily;
  chipsetName: string;
  /** Parsed Android major version (e.g. 16), null when unparseable. */
  androidMajor: number | null;
  androidVersionRaw: string;
  sdkVersion: string;
  /** Security patch in YYYY-MM-DD (or null). */
  securityPatch: string | null;
  binaryVersion: string | null;
  bootloaderVersion: string | null;
  buildFingerprint: string | null;
  knoxVersion: string | null;
  frpState: FrpState;
  adbState: AdbState;
  deviceMode: DeviceMode;
  hasSim: boolean;
  hasWifi: boolean;
}

// ---------------------------------------------------------------------
// Feasibility bands
// ---------------------------------------------------------------------

/**
 * Feasibility band — what the Aug-2026 evidence envelope says is
 * actually reachable for this device. Derived from RESEARCH-2026-FRP.md
 * and the RealityCheck windows (open/narrow/closed), extended with the
 * engine's routing granularity.
 */
export type FeasibilityBand =
  /** FRP not active — no removal needed. */
  | "none_needed"
  /** ADB live: pre-authorized ADB or an open ADB window (Android ≤12 era). */
  | "adb_live"
  /** Test-mode contested: *#0*# / diagnostic-menu era (Android 13–14). */
  | "testmode_contested"
  /** Software window closed: route to chipset hardware paths (Brom/EDL/Odin/SPD). */
  | "chipset_hardware"
  /** No public path: official Google account recovery / service center. */
  | "official_only"
  /** Not enough information to band. */
  | "unknown";

export interface BandAssessment {
  band: FeasibilityBand;
  /** Evidence-based feasibility 0–97 (never 100 — see honesty contract). */
  feasibility: number;
  label: string;
  detail: string;
  rationale: string[];
  nextRoute: string;
}

// ---------------------------------------------------------------------
// Exploit catalog
// ---------------------------------------------------------------------

/** Which physical layer a method operates on (Patch Oracle's stack). */
export type StackLayer =
  | "app"
  | "os"
  | "server"
  | "bootloader"
  | "bootrom"
  | "hardware";

/** Method class — groups methods the decision tree ranks per band. */
export type ExploitClass =
  | "adb_flags" // settings/content-provider provisioning flags
  | "adb_packages" // pm disable/uninstall of setup wizards
  | "setup_screen" // on-device UI tricks (dialer, talkback, browser…)
  | "test_mode" // *#0*# / diagnostic menu → enable ADB
  | "chipset_bootrom" // MTK Brom / SPD bootrom class
  | "chipset_bootloader" // Exynos Download Mode, Qualcomm EDL, fastboot
  | "official"; // Google account recovery / service center — always valid

export type RiskLevel = "none" | "low" | "medium" | "high";

/** Whether a method leaves persistent changes on the device. */
export type Persistence = "none" | "flags_only" | "package_changes" | "firmware_flash";

/** One step inside a method (guidance-level; actual execution stays in Rust). */
export interface MethodStep {
  kind: "adb_cmd" | "manual" | "boot_mode" | "flash" | "verify";
  label: string;
  detail: string;
}

export interface MethodEntry {
  id: string;
  name: string;
  klass: ExploitClass;
  layer: StackLayer;
  risk: RiskLevel;
  persistence: Persistence;
  /** Evidence-ranked weight 0–100 (higher = stronger evidence today). */
  evidenceWeight: number;
  /** Preconditions evaluated against the fingerprint. */
  preconditions: (fp: Fingerprint) => boolean;
  /** Human-readable reason when preconditions fail. */
  preconditionNote: string;
  /** Patch-decay facts (honest, dated). */
  decay: {
    androidSoft: number | null; // last major where evidence was broadly positive
    patchSoft: string | null; // YYYY
    note: string;
  };
  fallbackTo: string[];
  steps: MethodStep[];
  /** Evidence citations (repo docs / public research). */
  evidence: string[];
}

// ---------------------------------------------------------------------
// Decision tree output
// ---------------------------------------------------------------------

export type EscalationPolicy = "sequential_verify" | "stop_after_primary" | "refuse";

export interface ChainPlan {
  fingerprint: Fingerprint;
  band: BandAssessment;
  /** Ranked chain: index 0 = primary attempt. */
  chain: MethodEntry[];
  escalationPolicy: EscalationPolicy;
  /** Hard refusal: software/unsafe paths are blocked and routed to this. */
  refusal: {
    route: string;
    note: string;
  } | null;
  /** Post-step verification steps (re-detect FRP state, reboot observation…). */
  verification: string[];
  /** Warnings shown before execution (brick risk, AVB, hardware needed…). */
  warnings: string[];
  sources: string[];
}

// ---------------------------------------------------------------------
// UI & behavior interaction FSM
// ---------------------------------------------------------------------

export type FsmStateId =
  | "unknown"
  | "welcome" // setup wizard start / language select
  | "network_select"
  | "wifi_setup"
  | "copy_apps"
  | "google_verify" // "This device was reset. Sign in…"
  | "account_email"
  | "account_password"
  | "2fa_consent"
  | "emergency_dialer"
  | "test_mode_menu" // *#0*# hardware test menu (Samsung-era)
  | "settings_app"
  | "developer_options"
  | "usb_debug_toggle"
  | "rsa_prompt" // "Allow USB debugging?" authorization dialog
  | "launcher_home" // reached home screen — success marker
  | "recovery_menu"
  | "bootloader_menu"
  | "locked_out" // no UI route remains — hardware/official band
  | "done";

export type FsmEvent =
  | { type: "ui_observed"; hints: string[] }
  | { type: "timeout" }
  | { type: "error"; detail: string }
  | { type: "adb_authorized" }
  | { type: "manual_confirmed" }
  | { type: "blocked"; reason: string };

export type FsmAction =
  | { kind: "tap"; target: string }
  | { kind: "type_text"; target: string; text: string }
  | { kind: "swipe" }
  | { kind: "keyevent"; code: string }
  | { kind: "adb"; command: string }
  | { kind: "wait"; ms: number }
  | { kind: "guide"; text: string }
  | { kind: "escalate"; reason: string }
  | { kind: "verify" };

export interface FsmTransition {
  state: FsmStateId;
  event: FsmEvent["type"];
  next: FsmStateId;
  actions: FsmAction[];
  /** Expected humanized wait before the next probe (ms range base). */
  expectedDelayMs: number;
  note: string;
}

export interface FsmTraceStep {
  index: number;
  state: FsmStateId;
  event: FsmEvent["type"];
  next: FsmStateId;
  actions: FsmAction[];
  delayMs: number;
  note: string;
}

// ---------------------------------------------------------------------
// Partition safety
// ---------------------------------------------------------------------

export interface PartitionSurvey {
  readOnly: boolean;
  /** getprop samples collected by the Rust command. */
  properties: { name: string; value: string | null }[];
  /** `/dev/block/by-name` listing lines (capped). */
  blockDevices: string[];
}

export interface AvbAssessment {
  verifiedBootState: string | null;
  vbmetaDeviceState: string | null;
  buildTags: string | null;
  bootloaderLocked: boolean | null;
  verdict: "avb_enforcing" | "avb_relaxed" | "unknown";
  honesty: string;
}

export interface RollbackPlan {
  applicable: boolean;
  requiredBackups: string[];
  restoreSteps: string[];
  refusalNote: string | null;
}

// ---------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------

export type JournalKind =
  | "plan"
  | "step"
  | "verify"
  | "fail"
  | "rollback"
  | "info";

export interface JournalEntry {
  ts: string;
  kind: JournalKind;
  fingerprintKey: string;
  text: string;
}

export interface AdaptiveSession {
  fingerprint: Fingerprint;
  band: BandAssessment;
  plan: ChainPlan;
  fsmStartState: FsmStateId;
  journalEntry: JournalEntry;
}
