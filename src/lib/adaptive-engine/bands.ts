// =====================================================================
// FRP Adaptive Engine — feasibility bands (T2)
// ---------------------------------------------------------------------
// Pure function: Fingerprint → BandAssessment. Distills the Aug-2026
// evidence envelope (RESEARCH-2026-FRP.md) into the engine's routing
// bands. Mirrors the RealityCheck windows (open / narrow / closed) and
// extends them with the engine's granularity:
//
//   Android ≤ 12, patch ≤ 2022            → adb_live
//   Android 13–14 (patch < 2024)          → testmode_contested
//   Android 14 + patch ≥ 2024, 15, 16     → chipset_hardware
//   chipset Unknown/Kirin, closed window  → official_only
//
// Two live re-openers are honored because the evidence supports them:
//   * adbState == "Authorized" (USB debugging authorized BEFORE the
//     reset) reopens the ADB window on any Android version.
//   * deviceMode in DownloadMode/EDL/BromMode routes to chipset paths.
//
// Honesty: feasibility is capped at 97 — a server-verifiable lock can
// never be promised 100%.
// =====================================================================

import type { BandAssessment, FeasibilityBand, Fingerprint } from "./types.ts";

/** Parse "YYYY-MM-DD" (or "YYYY-MM", "YYYY") security patch into a year. */
export function parsePatchYear(patch: string | null): number | null {
  if (!patch) return null;
  const m = patch.trim().match(/^(20\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}

/** Parse "15.1.2" / "15" style version strings into the major number. */
export function parseAndroidMajor(version: string): number | null {
  const m = version.trim().match(/^(\d{1,2})/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return v >= 1 && v <= 99 ? v : null;
}

export function brandIdOf(brandRaw: string): Fingerprint["brand"] {
  const b = brandRaw.trim().toLowerCase();
  if (b.includes("samsung")) return "samsung";
  if (b.includes("google") || b.includes("pixel")) return "google";
  if (b.includes("xiaomi") || b.includes("redmi") || b.includes("poco")) return "xiaomi";
  if (b.includes("oppo") || b.includes("realme") || b.includes("oneplus")) return "oppo";
  if (b.includes("vivo") || b.includes("iqoo")) return "vivo";
  if (
    b.includes("tecno") || b.includes("infinix") || b.includes("itel") ||
    b.includes("transsion")
  ) {
    return "transsion";
  }
  if (b.includes("huawei") || b.includes("honor")) return "huawei";
  if (b.includes("motorola") || b.includes("moto")) return "motorola";
  return "other";
}

const CHIPSET_ROUTES: Record<string, string> = {
  Exynos: "Download Mode + Odin enable-ADB package, then ADB removal, then reflash stock",
  Qualcomm: "EDL 9008 + chipset firehose loader → erase FRP partition (may need EDL cable)",
  MediaTek: "Brom/Preloader → erase FRP partition (open-source mtkclient protocol class)",
  Spreadtrum: "SPD bootrom tool (auto-enables ADB on Tecno/Infinix/Itel class devices)",
  Kirin: "No public low-level route — official recovery / authorized service center",
  Unknown: "Unknown chipset — no public hardware erase path integrated",
};

/**
 * Compute the feasibility band for a fingerprint.
 * Pure and deterministic: same input → same output (test matrix in
 * scripts/verify-adaptive-engine.mts).
 */
export function computeBand(fp: Fingerprint): BandAssessment {
  const major = fp.androidMajor;
  const patchYear = parsePatchYear(fp.securityPatch);
  const rationale: string[] = [];

  // 0. FRP not active → nothing to remove.
  if (fp.frpState === "Inactive") {
    return {
      band: "none_needed",
      feasibility: 0,
      label: "FRP not active",
      detail:
        "The device reports no active Google account lock. No removal is needed — do not run methods on an unlocked device.",
      rationale: ["Detector reported frp_state = Inactive."],
      nextRoute: "Stop. No action. (Re-run detection to confirm before proceeding.)",
    };
  }

  // 1. Live reopeners: ADB already authorized before reset, or a chipset
  //    boot mode is already active.
  if (fp.adbState === "Authorized") {
    rationale.push(
      "adbState = Authorized — USB debugging was authorized (typically before the reset), which is the one precondition the 2026 consensus says still completes ADB removal on any Android version.",
    );
    return {
      band: "adb_live",
      feasibility: 92,
      label: "ADB window: LIVE (pre-authorized)",
      detail:
        "ADB is authorized on this device. The provisioning/packages ladder can run now, with post-step FRP re-detection after every method.",
      rationale,
      nextRoute: "Run the adb_flags → adb_packages ladder with verification after each step.",
    };
  }
  if (fp.deviceMode === "DownloadMode" || fp.deviceMode === "EDL" || fp.deviceMode === "BromMode") {
    rationale.push(`deviceMode = ${fp.deviceMode} — a chipset-level mode is already active; route below the OS.`);
    const feas = fp.chipsetFamily === "MediaTek" || fp.chipsetFamily === "Spreadtrum" ? 80 : 70;
    return {
      band: "chipset_hardware",
      feasibility: feas,
      label: "Chipset mode active",
      detail: `Device is already in ${fp.deviceMode}. Execute the matching chipset path (runbook) — software methods are irrelevant in this mode.`,
      rationale,
      nextRoute: CHIPSET_ROUTES[fp.chipsetFamily] ?? CHIPSET_ROUTES.Unknown,
    };
  }

  // 2. Version/patch banding (RealityCheck-compatible).
  let band: FeasibilityBand = "unknown";
  let base = 15;
  let label = "";
  let detail = "";

  if (major === null) {
    band = "unknown";
    base = 20;
    label = "Fingerprint incomplete";
    detail =
      "Android version could not be parsed — assume the middle band and gather more data before running anything destructive.";
    rationale.push("androidMajor unparseable from the profile.");
  } else if (major <= 12 && (patchYear === null || patchYear <= 2022)) {
    band = "adb_live";
    base = 88;
    label = "ADB window: OPEN";
    detail =
      "Android ≤ 12 with pre-2023 patch — the era where ADB provisioning, test-mode and setup-screen methods broadly succeed.";
    rationale.push(`Android ${major} with patch ${fp.securityPatch ?? "unknown"} falls inside the open ADB window.`);
  } else if (major === 13 || (major === 14 && (patchYear === null || patchYear < 2024))) {
    band = "testmode_contested";
    base = 55;
    label = "ADB window: NARROW (test-mode contested)";
    detail =
      "Android 13–14 era — model- and patch-dependent. The *#0*# diagnostic menu / live ADB route is the deciding factor.";
    rationale.push(`Android ${major} with patch ${fp.securityPatch ?? "unknown"} falls inside the narrow window.`);
  } else {
    // Android 14 + patch ≥ 2024, Android 15, Android 16 — software window closed.
    if (fp.chipsetFamily === "Unknown" || fp.chipsetFamily === "Kirin") {
      band = "official_only";
      base = 5;
      label = "Software window CLOSED — no public route";
      detail =
        `Android ${major} with a recent patch: setup-screen and ADB-before-setup routes are closed industry-wide, and this chipset (${fp.chipsetFamily}) has no public hardware erase path.`;
      rationale.push(
        `Android ${major} / patch ${fp.securityPatch ?? "unknown"} closes the software window; ${fp.chipsetFamily} offers no integrated hardware path.`,
      );
    } else {
      band = "chipset_hardware";
      base = 15;
      label = "Software window CLOSED — chipset route";
      detail = `Android ${major} with a recent patch: software-only routes are patched. The ${fp.chipsetFamily} hardware path sits below the OS patch wall.`;
      rationale.push(
        `Android ${major} / patch ${fp.securityPatch ?? "unknown"} closes the software window; ${fp.chipsetFamily} hardware path remains.`,
      );
    }
  }

  // 3. Band feasibility shaping.
  let feasibility = base;
  if (band === "chipset_hardware") {
    const bonus =
      fp.chipsetFamily === "MediaTek" ? 35
      : fp.chipsetFamily === "Spreadtrum" ? 30
      : fp.chipsetFamily === "Exynos" || fp.chipsetFamily === "Qualcomm" ? 25
      : 0;
    feasibility += bonus;
    rationale.push(`Chipset evidence bonus +${bonus} (Brom/SPD paths are the most open in 2026).`);
  }
  if (fp.marketingName) {
    feasibility += 3;
    rationale.push("Model is in the local database (+3 known-model confidence).");
  }
  feasibility = Math.min(97, Math.max(5, feasibility));

  const nextRoute =
    band === "adb_live"
      ? "Run the ADB ladder now — verify handshake, then flags → packages, re-detecting FRP after each method."
      : band === "testmode_contested"
        ? "Attempt the test-mode flow first (dialer → *#0*# → enable USB debugging → RSA accept). If the diagnostic menu never opens, fall back to the chipset route."
        : band === "chipset_hardware"
          ? `${CHIPSET_ROUTES[fp.chipsetFamily]} — phase-by-phase runbook with pre-flash backup and rollback.`
          : "Official Google account recovery (owner credentials) or an authorized service center. The engine refuses software attempts on this device.";

  return {
    band,
    feasibility,
    label,
    detail,
    rationale,
    nextRoute,
  };
}
