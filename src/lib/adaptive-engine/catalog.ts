// =====================================================================
// FRP Adaptive Engine — exploit catalog (T3)
// ---------------------------------------------------------------------
// Evidence-gated method catalogue. Every entry carries:
//   * preconditions evaluated against the device fingerprint,
//   * patch-decay facts (dated, honest),
//   * persistence + risk classification (drives warnings/rollback),
//   * a fallback chain id and evidence citations.
// The decision tree (decision.ts) ranks these per feasibility band.
// Guidance only — actual execution stays in the existing Rust modules
// (frp/bypass.rs, frp/reset.rs) and the runbook UI.
// =====================================================================

import type { ExploitClass, Fingerprint, MethodEntry, RiskLevel, Persistence } from "./types.ts";

const adbAuthorized = (fp: Fingerprint): boolean => fp.adbState === "Authorized";
const isSamsung = (fp: Fingerprint): boolean => fp.brand === "samsung";
const chipsetIs =
  (c: Fingerprint["chipsetFamily"]) =>
  (fp: Fingerprint): boolean =>
    fp.chipsetFamily === c;
const androidAtMost =
  (max: number) =>
  (fp: Fingerprint): boolean =>
    fp.androidMajor !== null && fp.androidMajor <= max;
const frpActive = (fp: Fingerprint): boolean => fp.frpState !== "Inactive";

function entry(p: {
  id: string;
  name: string;
  klass: ExploitClass;
  layer: MethodEntry["layer"];
  risk: RiskLevel;
  persistence: Persistence;
  evidenceWeight: number;
  preconditions: (fp: Fingerprint) => boolean;
  preconditionNote: string;
  androidSoft: number | null;
  patchSoft: string | null;
  decayNote: string;
  fallbackTo: string[];
  steps: MethodEntry["steps"];
  evidence: string[];
}): MethodEntry {
  return {
    id: p.id,
    name: p.name,
    klass: p.klass,
    layer: p.layer,
    risk: p.risk,
    persistence: p.persistence,
    evidenceWeight: p.evidenceWeight,
    preconditions: p.preconditions,
    preconditionNote: p.preconditionNote,
    decay: { androidSoft: p.androidSoft, patchSoft: p.patchSoft, note: p.decayNote },
    fallbackTo: p.fallbackTo,
    steps: p.steps,
    evidence: p.evidence,
  };
}

export const CATALOG: MethodEntry[] = [
  // ---------------------------------------------------------------
  // ADB ladder — requires the pre-authorized window (or a live route
  // that just authorized it, e.g. test-mode / SPD auto-ADB).
  // ---------------------------------------------------------------
  entry({
    id: "adb_provisioning_flags",
    name: "ADB provisioning flags",
    klass: "adb_flags",
    layer: "os",
    risk: "low",
    persistence: "flags_only",
    evidenceWeight: 80,
    preconditions: (fp) => adbAuthorized(fp) && frpActive(fp),
    preconditionNote: "Requires ADB authorized (USB debugging enabled + RSA-accepted before the reset).",
    androidSoft: 12,
    patchSoft: "2022",
    decayNote:
      "Broadly effective Android ≤12 / pre-2023 patches; on 13+ it only applies when the ADB window was pre-authorized — that precondition is the whole game.",
    fallbackTo: ["content_provider_injection"],
    steps: [
      { kind: "adb_cmd", label: "Verify handshake", detail: "getprop ro.build.version.release + settings get global adb_enabled" },
      { kind: "adb_cmd", label: "Set provisioning flags", detail: "settings put global device_provisioned 1; settings put secure user_setup_complete 1" },
      { kind: "verify", label: "Re-detect FRP state", detail: "frp_detect before/after comparison (flags_set vs removed_verified)" },
    ],
    evidence: [
      "RESEARCH-2026-FRP.md §2 — the exact flag sequences are the publicly documented, independently verified ones (quitehacker/ADB-FRP-Bypass class).",
      "Developer Lab verification loop: every method re-detects FRP state and emits a measured verdict.",
    ],
  }),
  entry({
    id: "content_provider_injection",
    name: "Content-provider injection",
    klass: "adb_flags",
    layer: "os",
    risk: "low",
    persistence: "flags_only",
    evidenceWeight: 72,
    preconditions: (fp) => adbAuthorized(fp) && frpActive(fp),
    preconditionNote: "Requires ADB authorized.",
    androidSoft: 12,
    patchSoft: "2022",
    decayNote: "Same window as the flags method; bypasses some Knox blocks on older Samsung builds.",
    fallbackTo: ["setup_wizard_disable"],
    steps: [
      { kind: "adb_cmd", label: "Insert via content provider", detail: "content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1" },
      { kind: "verify", label: "Re-detect FRP state", detail: "frp_detect before/after comparison" },
    ],
    evidence: ["RESEARCH-2026-FRP.md §2 — content insert sequences verified against public references."],
  }),
  entry({
    id: "setup_wizard_disable",
    name: "Setup-wizard disable",
    klass: "adb_packages",
    layer: "os",
    risk: "low",
    persistence: "package_changes",
    evidenceWeight: 66,
    preconditions: (fp) => adbAuthorized(fp) && frpActive(fp),
    preconditionNote: "Requires ADB authorized.",
    androidSoft: 12,
    patchSoft: "2022",
    decayNote: "Google + OEM setup wizards; Samsung package names included (com.samsung.android.app.setupwizard*).",
    fallbackTo: ["setup_wizard_uninstall"],
    steps: [
      { kind: "adb_cmd", label: "Disable wizards", detail: "pm disable-user --user 0 com.google.android.setupwizard (+ Samsung variants)" },
      { kind: "verify", label: "Reboot observation", detail: "adb reboot then re-run detection — the honest final check" },
    ],
    evidence: ["frp/bypass.rs method 1 (SetupWizardDisable) — shipped and verified in v1."],
  }),
  entry({
    id: "setup_wizard_uninstall",
    name: "Setup-wizard uninstall (user 0)",
    klass: "adb_packages",
    layer: "os",
    risk: "medium",
    persistence: "package_changes",
    evidenceWeight: 58,
    preconditions: (fp) => adbAuthorized(fp) && frpActive(fp),
    preconditionNote: "Requires ADB authorized; more aggressive than disable.",
    androidSoft: 12,
    patchSoft: "2022",
    decayNote: "Same window; use only after disable fails.",
    fallbackTo: ["account_manager_launch"],
    steps: [
      { kind: "adb_cmd", label: "Uninstall for user 0", detail: "pm uninstall -k --user 0 com.google.android.setupwizard" },
      { kind: "verify", label: "Re-detect FRP state", detail: "frp_detect before/after comparison" },
    ],
    evidence: ["Developer Lab AUTO_LADDER (setup_wizard_uninstall) — evidence-ranked escalation rung."],
  }),
  entry({
    id: "account_manager_launch",
    name: "Account-manager launch",
    klass: "adb_packages",
    layer: "app",
    risk: "low",
    persistence: "none",
    evidenceWeight: 42,
    preconditions: (fp) => adbAuthorized(fp) && frpActive(fp),
    preconditionNote: "Requires ADB authorized (am start against gsf.login).",
    androidSoft: 11,
    patchSoft: "2021",
    decayNote: "Oldest ADB trick in the book; modern gsf.login refuses or loops. Legacy rung only.",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "adb_cmd", label: "Launch login activity", detail: "am start -n com.google.android.gsf.login/" },
      { kind: "verify", label: "Observe UI state", detail: "dumpsys activity — check the wizard advanced" },
    ],
    evidence: ["frp/bypass.rs AccountManagerLaunch (legacy-rung, kept for old devices)."],
  }),

  // ---------------------------------------------------------------
  // Setup-screen / test-mode interaction — the FSM drives these
  // ---------------------------------------------------------------
  entry({
    id: "samsung_test_mode",
    name: "Samsung test mode (*#0*#)",
    klass: "test_mode",
    layer: "app",
    risk: "low",
    persistence: "none",
    evidenceWeight: 62,
    preconditions: (fp) => isSamsung(fp) && frpActive(fp),
    preconditionNote: "Samsung only; the emergency dialer must be reachable on the FRP screen.",
    androidSoft: 13,
    patchSoft: "2023",
    decayNote:
      "SamFw-class primary flow. Broadly alive Android ≤13 / pre-2024 patches; mostly patched on One UI 6 (14) and blocked on 15/16. The FSM probes it before escalating.",
    fallbackTo: ["adb_provisioning_flags"],
    steps: [
      { kind: "manual", label: "Open emergency dialer", detail: "Tap Emergency Call on the FRP screen" },
      { kind: "manual", label: "Dial *#0*#", detail: "Test-mode menu opens (HWModuleTest)" },
      { kind: "manual", label: "Enable USB debugging", detail: "Navigate test menu → settings → developer options" },
      { kind: "manual", label: "Accept RSA prompt", detail: "Allow USB debugging on-device" },
      { kind: "verify", label: "ADB handshake check", detail: "frp_verify_handshake → then the ADB ladder runs" },
    ],
    evidence: [
      "RESEARCH-2026-FRP.md §3 — test-mode + ADB flow still succeeds where the diagnostic menu is reachable (r/FRPbypassSamsung field reports).",
      "FRP-ALGORITHM-ANALYSIS.md — SamFW primary flow.",
    ],
  }),
  entry({
    id: "emergency_dialer_shortcut",
    name: "Emergency-dialer shortcut",
    klass: "setup_screen",
    layer: "app",
    risk: "low",
    persistence: "none",
    evidenceWeight: 38,
    preconditions: (fp) => androidAtMost(13)(fp) && frpActive(fp),
    preconditionNote: "Dialer must be reachable (Android ≤13 era, brand-dependent).",
    androidSoft: 13,
    patchSoft: "2023",
    decayNote: "Reachability decayed hard on 14+; kept for the contested band.",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "manual", label: "Open emergency dialer", detail: "Probe reachability from the FRP screen" },
      { kind: "verify", label: "Report reachability", detail: "FSM records whether the dialer opened" },
    ],
    evidence: ["RESEARCH-2026-FRP.md §3 patch-wall table (dialer-class tricks: 13 hit-and-miss)."],
  }),
  entry({
    id: "talkback_legacy",
    name: "TalkBack (legacy)",
    klass: "setup_screen",
    layer: "app",
    risk: "low",
    persistence: "none",
    evidenceWeight: 24,
    preconditions: (fp) => androidAtMost(11)(fp) && frpActive(fp),
    preconditionNote: "Android ≤11 only — patched afterwards.",
    androidSoft: 11,
    patchSoft: "2021",
    decayNote: "Dead on 12+; kept for the open-window legacy stack.",
    fallbackTo: ["sim_pin_legacy"],
    steps: [
      { kind: "manual", label: "TalkBack gesture route", detail: "Legacy gesture + help-menu flow" },
    ],
    evidence: ["RESEARCH-2026-FRP.md §3 — 'Old TalkBack/SIM/APK tricks — mostly fail' on modern Android (legacy only)."],
  }),
  entry({
    id: "sim_pin_legacy",
    name: "SIM-PIN (legacy)",
    klass: "setup_screen",
    layer: "app",
    risk: "low",
    persistence: "none",
    evidenceWeight: 20,
    preconditions: (fp) => androidAtMost(10)(fp) && fp.hasSim && frpActive(fp),
    preconditionNote: "Android ≤10 + SIM present.",
    androidSoft: 10,
    patchSoft: "2020",
    decayNote: "Ancient; catalogued for completeness on the open band.",
    fallbackTo: ["browser_apk_legacy"],
    steps: [{ kind: "manual", label: "SIM-PIN flow", detail: "Legacy PIN-entry route to settings" }],
    evidence: ["RESEARCH-2026-FRP.md §3 (legacy trick list)."],
  }),
  entry({
    id: "browser_apk_legacy",
    name: "Browser-APK (legacy)",
    klass: "setup_screen",
    layer: "app",
    risk: "medium",
    persistence: "none",
    evidenceWeight: 30,
    preconditions: (fp) => androidAtMost(12)(fp) && frpActive(fp),
    preconditionNote: "Android ≤12 era; needs an embedded browser hop.",
    androidSoft: 12,
    patchSoft: "2022",
    decayNote: "The classic pre-2023 route; closed progressively 13+.",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "manual", label: "Browser hop", detail: "Help/legal link → browser → download manager class flow" },
      { kind: "verify", label: "Settings reached?", detail: "FSM checks whether Settings opened" },
    ],
    evidence: ["RESEARCH-2026-FRP.md §3 patch wall (browser-APK: Android ≤12 broadly works)."],
  }),

  // ---------------------------------------------------------------
  // Chipset paths — below the OS patch wall. Runbook-guided until a
  // hardware-validated backend lands (repo rule #3).
  // ---------------------------------------------------------------
  entry({
    id: "exynos_download_mode",
    name: "Exynos Download Mode (Odin class)",
    klass: "chipset_bootloader",
    layer: "bootloader",
    risk: "high",
    persistence: "firmware_flash",
    evidenceWeight: 55,
    preconditions: (fp) => isSamsung(fp) && chipsetIs("Exynos")(fp) && frpActive(fp),
    preconditionNote: "Samsung + Exynos. Full backup + stock firmware archive required first.",
    androidSoft: null,
    patchSoft: null,
    decayNote: "Lives below the OS patch wall; constrained by bootloader bit/version gating — wrong bit = brick risk (FRP-ALGORITHM-ANALYSIS.md).",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "boot_mode", label: "Enter Download Mode", detail: "Vol Down + Power, connect USB" },
      { kind: "flash", label: "Flash enable-ADB package", detail: "Odin/Heimdall class flash (bit/version check first)" },
      { kind: "adb_cmd", label: "Run ADB ladder", detail: "Hand over to the ADB methods" },
      { kind: "flash", label: "Reflash stock firmware", detail: "Restore the original build" },
      { kind: "verify", label: "Reboot observation", detail: "Re-run detection after boot" },
    ],
    evidence: [
      "FRP-ALGORITHM-ANALYSIS.md — Exynos Download-Mode flow (SamFw/TSM class).",
      "RESEARCH-2026-FRP.md §3 — Odin + test-mode flow cited for Android 14 era.",
    ],
  }),
  entry({
    id: "qualcomm_edl",
    name: "Qualcomm EDL 9008",
    klass: "chipset_bootloader",
    layer: "bootloader",
    risk: "high",
    persistence: "firmware_flash",
    evidenceWeight: 50,
    preconditions: (fp) => chipsetIs("Qualcomm")(fp) && frpActive(fp),
    preconditionNote: "Qualcomm device; may require an EDL engineering cable + signed firehose loader.",
    androidSoft: null,
    patchSoft: null,
    decayNote: "Patch-independent at the OS layer; gated by firehose loader availability (model/bit specific).",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "boot_mode", label: "Enter EDL 9008", detail: "EDL cable / test-point entry" },
      { kind: "flash", label: "Load firehose programmer", detail: "Chipset-specific signed loader" },
      { kind: "flash", label: "Erase FRP partition", detail: "Block-level erase with pre-captured backup" },
      { kind: "verify", label: "Reboot observation", detail: "Re-run detection after boot" },
    ],
    evidence: ["FRP-ALGORITHM-ANALYSIS.md — EDL/firehose path; RESEARCH-2026-FRP.md §1 (industry standard)."],
  }),
  entry({
    id: "mediatek_brom",
    name: "MediaTek Brom (mtkclient class)",
    klass: "chipset_bootrom",
    layer: "bootrom",
    risk: "medium",
    persistence: "firmware_flash",
    evidenceWeight: 65,
    preconditions: (fp) => chipsetIs("MediaTek")(fp) && frpActive(fp),
    preconditionNote: "MediaTek device. Newer secured chips may demand a signed Download Agent (SLA/DAA).",
    androidSoft: null,
    patchSoft: null,
    decayNote: "BootROM bugs are silicon — un-patchable by OTA. The most open 2026 path (open-source protocol class).",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "boot_mode", label: "Enter Brom/Preloader", detail: "Vol keys + USB entry" },
      { kind: "flash", label: "Erase FRP partition", detail: "Brom protocol erase (backup first)" },
      { kind: "verify", label: "Reboot observation", detail: "Re-run detection after boot" },
    ],
    evidence: [
      "RESEARCH-2026-FRP.md §1 — MTKClient open-source BootROM FRP erasure (bkerler + community).",
      "docs/PHYSICS-LAYER-RESEARCH.md — mask-ROM patchability axis.",
    ],
  }),
  entry({
    id: "spd_bootloader",
    name: "SPD bootrom auto-ADB",
    klass: "chipset_bootrom",
    layer: "bootrom",
    risk: "medium",
    persistence: "firmware_flash",
    evidenceWeight: 58,
    preconditions: (fp) => chipsetIs("Spreadtrum")(fp) && frpActive(fp),
    preconditionNote: "Spreadtrum/Unisoc (Tecno/Infinix/Itel class).",
    androidSoft: null,
    patchSoft: null,
    decayNote: "Community SPD tools auto-enable ADB on bootrom entry — patch-proof at the silicon layer.",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "boot_mode", label: "Enter SPD bootloader", detail: "Vol Down + USB entry" },
      { kind: "adb_cmd", label: "Auto-enabled ADB", detail: "SPD tool enables ADB + developer prompt" },
      { kind: "flash", label: "Erase FRP", detail: "SPD protocol erase (backup first)" },
      { kind: "verify", label: "Reboot observation", detail: "Re-run detection after boot" },
    ],
    evidence: ["RESEARCH-2026-FRP.md §1 — XDA SPD FRP tools (Tecno/Infinix/Itel)."],
  }),
  entry({
    id: "fastboot_erase_frp",
    name: "Fastboot FRP erase",
    klass: "chipset_bootloader",
    layer: "bootloader",
    risk: "high",
    persistence: "firmware_flash",
    evidenceWeight: 40,
    preconditions: (fp) => fp.deviceMode === "Fastboot" && frpActive(fp),
    preconditionNote: "Device must already be in Fastboot with an unlocked/allowable bootloader.",
    androidSoft: null,
    patchSoft: null,
    decayNote: "Modern locked bootloaders reject it; only viable when OEM unlocking was enabled before reset.",
    fallbackTo: ["official_recovery"],
    steps: [
      { kind: "adb_cmd", label: "fastboot erase frp", detail: "Only after getvar confirms state" },
      { kind: "verify", label: "Reboot observation", detail: "Re-run detection after boot" },
    ],
    evidence: ["frp/fastboot.rs — existing fastboot command surface (gated by availability check)."],
  }),

  // ---------------------------------------------------------------
  // Terminal node — always valid, always last.
  // ---------------------------------------------------------------
  entry({
    id: "official_recovery",
    name: "Official Google account recovery",
    klass: "official",
    layer: "server",
    risk: "none",
    persistence: "none",
    evidenceWeight: 100,
    preconditions: () => true,
    preconditionNote: "Always available to the legitimate owner.",
    androidSoft: null,
    patchSoft: null,
    decayNote: "Server-side verification — cannot be computed around. The truthful terminal node for every chain.",
    fallbackTo: [],
    steps: [
      { kind: "manual", label: "Google account recovery", detail: "Owner signs in / resets password via Google account recovery" },
      { kind: "manual", label: "Authorized service center", detail: "Proof-of-purchase path where applicable" },
    ],
    evidence: ["RESEARCH-2026-FRP.md §3 — Android 16 verdict: official recovery, service center."],
  }),
];

export function getMethod(id: string): MethodEntry | undefined {
  return CATALOG.find((m) => m.id === id);
}
