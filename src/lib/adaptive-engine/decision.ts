// =====================================================================
// FRP Adaptive Engine — decision tree (T4)
// ---------------------------------------------------------------------
// Fingerprint → feasibility band → ranked exploit chain with fallbacks.
// Algorithm #1 from the brief (Adaptive Exploit Automation), non-AI:
// deterministic rules, no ML. Ranking key:
//   1. band-fit class priority (what the 2026 evidence supports for
//      this device),
//   2. evidence weight desc,
//   3. risk ascending.
// The chain always terminates in official account recovery — the one
// node that is always valid for the legitimate owner. Refusal plans are
// emitted for bands where software attempts are dishonest.
// =====================================================================

import { computeBand } from "./bands.ts";
import { CATALOG } from "./catalog.ts";
import type {
  ChainPlan,
  EscalationPolicy,
  ExploitClass,
  FeasibilityBand,
  Fingerprint,
  RiskLevel,
} from "./types.ts";

const RISK_ORDER: Record<RiskLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };

/** Class priority per band (lower index = earlier attempt). */
const CLASS_PRIORITY: Record<FeasibilityBand, ExploitClass[]> = {
  none_needed: [],
  adb_live: ["adb_flags", "adb_packages", "test_mode", "setup_screen"],
  testmode_contested: ["test_mode", "adb_flags", "adb_packages", "setup_screen"],
  chipset_hardware: ["chipset_bootrom", "chipset_bootloader"],
  official_only: ["official"],
  unknown: ["official"],
};

const MAX_CHAIN = 4;

/** Priority index of a class for a band; -1 = excluded from the chain. */
function classPriority(band: FeasibilityBand, klass: ExploitClass): number {
  const idx = CLASS_PRIORITY[band].indexOf(klass);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export function buildAdaptivePlan(fp: Fingerprint): ChainPlan {
  const band = computeBand(fp);

  // FRP inactive: nothing to do.
  if (band.band === "none_needed") {
    return {
      fingerprint: fp,
      band,
      chain: [],
      escalationPolicy: "refuse",
      refusal: {
        route: "Stop — FRP is not active on this device.",
        note: "Do not run removal methods on an unlocked device; re-run detection to confirm.",
      },
      verification: [],
      warnings: [],
      sources: ["RESEARCH-2026-FRP.md"],
    };
  }

  // Unknown band: conservative — official route only.
  if (band.band === "unknown") {
    const official = CATALOG.find((m) => m.id === "official_recovery")!;
    return {
      fingerprint: fp,
      band,
      chain: [official],
      escalationPolicy: "refuse",
      refusal: {
        route: "Official Google account recovery / authorized service center.",
        note: "The fingerprint is incomplete (Android version unparseable). Gather full device data before any attempt.",
      },
      verification: [],
      warnings: ["Fingerprint incomplete — refusing software attempts until the profile is filled."],
      sources: ["RESEARCH-2026-FRP.md"],
    };
  }

  // Candidate pool: preconditions pass, excluding the terminal official node.
  const candidates = CATALOG.filter(
    (m) => m.id !== "official_recovery" && m.preconditions(fp),
  );

  // Band-fit filter: a method class must be in the band's priority list.
  const fitted = candidates.filter((m) => classPriority(band.band, m.klass) !== Number.MAX_SAFE_INTEGER);

  // Rank: class priority → evidence weight desc → risk ascending → name.
  const ranked = [...fitted].sort((a, b) => {
    const pa = classPriority(band.band, a.klass);
    const pb = classPriority(band.band, b.klass);
    if (pa !== pb) return pa - pb;
    if (a.evidenceWeight !== b.evidenceWeight) return b.evidenceWeight - a.evidenceWeight;
    if (RISK_ORDER[a.risk] !== RISK_ORDER[b.risk]) return RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
    return a.name.localeCompare(b.name);
  });

  const chain = ranked.slice(0, MAX_CHAIN);
  const official = CATALOG.find((m) => m.id === "official_recovery")!;
  chain.push(official); // terminal fallback, always.

  // Escalation policy.
  let escalationPolicy: EscalationPolicy = "sequential_verify";
  let refusal: ChainPlan["refusal"] = null;
  if (band.band === "official_only") {
    escalationPolicy = "refuse";
    refusal = {
      route: "Official Google account recovery (owner credentials) or an authorized service center.",
      note: `Android ${fp.androidMajor ?? "?"} with a recent patch closes all software routes, and the ${fp.chipsetFamily} chipset has no public hardware path integrated. The engine refuses software attempts on this device — that refusal is the honest outcome.`,
    };
  } else if (ranked.length === 0) {
    escalationPolicy = "refuse";
    refusal = {
      route: "Official Google account recovery / authorized service center.",
      note: "No catalog method passes preconditions for this fingerprint.",
    };
  }

  // Warnings.
  const warnings: string[] = [];
  const persistent = chain.filter((m) => m.persistence === "firmware_flash");
  if (persistent.length > 0) {
    warnings.push(
      `Persistent steps (${persistent.map((m) => m.name).join(", ")}) touch firmware — a full partition backup, captured vbmeta digests and a stock-firmware reflash path are mandatory before execution (rollback plan).`,
    );
    warnings.push(
      "Verified Boot (AVB) honesty: any change to a vbmeta-protected partition without the vendor signing key is detected at next boot. Persistent steps are only offered on the chipset/bootloader paths below the OS, and always with rollback.",
    );
  }
  const highRisk = chain.filter((m) => m.risk === "high");
  if (highRisk.length > 0) {
    warnings.push(`High-risk rungs present (${highRisk.map((m) => m.name).join(", ")}): brick risk. Bit/version gating must be checked before any flash.`);
  }
  if (band.band === "chipset_hardware") {
    warnings.push(
      "Hardware-assisted path: EDL cables, signed firehose loaders or signed Download Agents may be required depending on the exact model — these are not shipped by this app.",
    );
  }
  const needsAdb = chain.some((m) => ["adb_flags", "adb_packages"].includes(m.klass));
  if (needsAdb && fp.adbState !== "Authorized") {
    warnings.push(
      "The chain contains ADB rungs but ADB is not authorized — the test-mode flow must succeed first, otherwise the chain stops at its hardware/official rungs.",
    );
  }

  const verification = [
    "After every rung: re-run frp_detect and compare BEFORE/AFTER state (measured verdict, never assumed).",
    ...(persistent.length > 0
      ? ["After any persistent step: adb reboot and re-run detection — the reboot observation is the final honest check."]
      : []),
    "Record the outcome in the session journal (success AND failure — the catalog is calibrated from both).",
  ];

  return {
    fingerprint: fp,
    band,
    chain,
    escalationPolicy,
    refusal,
    verification,
    warnings,
    sources: [
      "RESEARCH-2026-FRP.md (Aug-2026 evidence envelope)",
      "FRP-ALGORITHM-ANALYSIS.md (chipset-branched method selection)",
      "docs/PHYSICS-LAYER-RESEARCH.md (patchability stack)",
    ],
  };
}

/** Human-readable chain summary for logs/UI. */
export function chainSummary(plan: ChainPlan): string {
  if (plan.chain.length === 0) return "No chain (FRP inactive — stop).";
  return plan.chain.map((m, i) => `${i === 0 ? "primary" : `fallback ${i}`}: ${m.name}`).join(" → ");
}
