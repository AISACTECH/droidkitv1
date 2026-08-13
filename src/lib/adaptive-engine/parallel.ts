// =====================================================================
// FRP Adaptive Engine — round 3 research layer (ISOLATED)
// ---------------------------------------------------------------------
// Consumes the Aug-2026 patch research (docs/ANDROID-15-16-PATCH-RESEARCH.md)
// and applies it to the three algorithms in a PARALLEL way ("quantum
// juggling", honestly reframed — see the dossier §4):
//
//   1. GOOGLE_PROTECTION_MAP — read-only "seek": map the protection
//      state (AVB, KG/binary gate, patch ratchet) from getprop-class
//      signals. Detection-aware routing, never evasion.
//   2. A15_16_PATCH_DIGEST — what Google patched, what remains, per
//      stack layer, with the impact on each of the three algorithms.
//   3. LAB_LEDGER — evidence-banded expected rates (lab-gated, never
//      promised; downward-only by law).
//   4. evaluateParallelLanes — superposition → collapse: all three
//      algorithm lanes evaluated concurrently for one fingerprint,
//      merged into a gap report with union coverage.
//
// HARD LINE (dossier §3.3): hiding from the server-side account check
// and Play Integrity hardware attestation requires leaked OEM key
// material — not software. This module ships detection + routing, and
// NO spoofing/evasion primitives (enforced by test:research).
//
// ISOLATION CONTRACT: this file only ADDS to the engine. bands.ts,
// decision.ts, catalog.ts, ui-fsm.ts, humanize.ts, partition-safety.ts,
// patch-planner.ts are untouched — the regression snapshot test locks
// their outputs.
// =====================================================================

import { buildAdaptivePlan } from "./decision.ts";
import { buildPatchPlan } from "./patch-planner.ts";
import { flowForBrand, simulatePath } from "./ui-fsm.ts";
import type { FeasibilityBand, Fingerprint, StackLayer } from "./types.ts";

// ---------------------------------------------------------------------
// 1. Patch digest (data distilled from the dossier)
// ---------------------------------------------------------------------

export interface PatchRecord {
  id: string;
  title: string;
  android: "15" | "16" | "15+16" | "oem";
  layer: StackLayer;
  whatClosed: string;
  whatRemains: string;
  impact: { exploit: "closes" | "narrows" | "none"; ui: "closes" | "narrows" | "none"; patch: "closes" | "narrows" | "none" };
  source: string;
}

export const A15_16_PATCH_DIGEST: PatchRecord[] = [
  {
    id: "p1_system_core_frp",
    title: "FRP enforcement moved into the system core (not just the wizard)",
    android: "15",
    layer: "os",
    whatClosed: "Wizard-skip persistence; partial-setup 'finishes' no longer clear the lock (new accounts/screen locks/app installs stay blocked).",
    whatRemains: "Below-OS lanes; the pre-authorized ADB window.",
    impact: { exploit: "closes", ui: "closes", patch: "none" },
    source: "itoolab A15 guide; Wondershare A15 walkthrough",
  },
  {
    id: "p2_ownership_install_gate",
    title: "Ownership-verified install gate during setup",
    android: "15",
    layer: "app",
    whatClosed: "Random FRP helper APK sideloads (Alliance Shield / QuickShortcutMaker class).",
    whatRemains: "Nothing at the app layer — the class is gone.",
    impact: { exploit: "closes", ui: "closes", patch: "none" },
    source: "itoolab A15 guide",
  },
  {
    id: "p3_oem_unlock_frp",
    title: "OEM unlock no longer disables FRP",
    android: "15",
    layer: "bootloader",
    whatClosed: "Fastboot erase-frp via unlocked bootloader on many models.",
    whatRemains: "Chipset bootrom lanes; Download-Mode tool classes.",
    impact: { exploit: "none", ui: "none", patch: "narrows" },
    source: "itoolab A15 guide",
  },
  {
    id: "p4_legacy_tricks",
    title: "TalkBack / hidden-settings / browser-hop routes patched",
    android: "15+16",
    layer: "app",
    whatClosed: "The Android ≤12-era trick suite.",
    whatRemains: "Legacy devices only (correctly age-tagged in the catalog).",
    impact: { exploit: "none", ui: "closes", patch: "none" },
    source: "Wondershare; nokiamob Pixel analysis",
  },
  {
    id: "p5_play_integrity_hw",
    title: "Play Integrity May-2025 baseline: all verdicts hardware-backed",
    android: "15+16",
    layer: "hardware",
    whatClosed: "Software-only integrity hiding without a valid OEM keybox (key attestation is hardware-backed for every verdict).",
    whatRemains: "Nothing legitimate without leaked key material — the engine does detection, never attestation spoofing.",
    impact: { exploit: "narrows", ui: "none", patch: "none" },
    source: "developer.android.com Play Integrity blog; Microsoft Intune note; r/Magisk",
  },
  {
    id: "p6_usb_pre_setup",
    title: "USB/debugging access limited before setup completes",
    android: "16",
    layer: "os",
    whatClosed: "ADB-before-setup — the whole precondition of the ADB ladder on reset devices.",
    whatRemains: "Pre-authorized ADB (rare); below-OS lanes.",
    impact: { exploit: "closes", ui: "none", patch: "none" },
    source: "Wondershare A16 walkthrough",
  },
  {
    id: "p7_apk_setup_block",
    title: "APK install methods blocked during setup (A16 hardening)",
    android: "16",
    layer: "app",
    whatClosed: "Setup-screen APK routes (carry-over of P2).",
    whatRemains: "None at this layer.",
    impact: { exploit: "none", ui: "closes", patch: "none" },
    source: "Wondershare A16 walkthrough; mobifirms status table",
  },
  {
    id: "p8_patch_ratchet",
    title: "Per-patch ratchet: methods break patch-by-patch",
    android: "15+16",
    layer: "os",
    whatClosed: "Re-farmed app-layer routes per OEM update (Samsung Jan-2026 closed browser + APK-injection bypasses).",
    whatRemains: "Chipset lanes + IMEI-server services + official recovery.",
    impact: { exploit: "narrows", ui: "closes", patch: "none" },
    source: "mobifirms Samsung A15/A16 method table",
  },
  {
    id: "p9_kg_prenormal",
    title: "Samsung Binary-18 KG-Prenormal USB data gate",
    android: "oem",
    layer: "hardware",
    whatClosed: "MTP/ADB/serial data channels while the OS is on; *#0808# routing + *#0*# test menu blocked.",
    whatRemains: "Download-Mode tool classes (TFM-class); EDL/Brom; official routes.",
    impact: { exploit: "closes", ui: "closes", patch: "narrows" },
    source: "r/FRPbypassSamsung Binary-18 field report",
  },
  {
    id: "p10_pixel_strict",
    title: "Pixel: settings/browser blocked during setup; direct server verification",
    android: "15+16",
    layer: "server",
    whatClosed: "All manual tricks on Pixel.",
    whatRemains: "Owner recovery / official only (as the band model already routes).",
    impact: { exploit: "narrows", ui: "closes", patch: "none" },
    source: "nokiamob Pixel analysis",
  },
];

// ---------------------------------------------------------------------
// 2. Protection map — read-only "seek" (never evasion)
// ---------------------------------------------------------------------

export interface ProtectionMap {
  verifiedBootState: string | null;
  vbmetaDeviceState: string | null;
  buildTags: string | null;
  securityPatch: string | null;
  binaryVersion: string | null;
  knoxVersion: string | null;
  /** Play Integrity verdicts are NOT readable via getprop on a locked device — declared. */
  attestationLayer: "hardware-backed (Play Integrity class, not locally readable)" | "unknown";
  usbRisk: "high" | "medium" | "low" | "unknown";
  usbRiskNote: string;
  summary: string;
}

export interface ProtectionInput {
  verifiedBootState?: string | null;
  vbmetaDeviceState?: string | null;
  buildTags?: string | null;
  securityPatch?: string | null;
  binaryVersion?: string | null;
  knoxVersion?: string | null;
}

/** Samsung binary-version parse: "U3" → 3, "18" → 18, else null. */
export function parseBinaryNumber(binary: string | null | undefined): number | null {
  if (!binary) return null;
  const m = binary.trim().match(/^[A-Za-z]*(\d{1,2})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 99 ? n : null;
}

/**
 * Build the read-only Google-protection map from survey-class signals.
 * Detection only — the map ROUTES lanes, it never modifies anything.
 */
export function buildProtectionMap(fp: Fingerprint, props: ProtectionInput = {}): ProtectionMap {
  const verifiedBootState = props.verifiedBootState ?? null;
  const vbmetaDeviceState = props.vbmetaDeviceState ?? null;
  const buildTags = props.buildTags ?? null;
  const binaryNumber = parseBinaryNumber(props.binaryVersion ?? fp.binaryVersion);
  const isSamsung = fp.brand === "samsung";

  // P9 heuristic: recent Samsung binary (≥ 18 class) → KG-prenormal USB risk.
  let usbRisk: ProtectionMap["usbRisk"] = "unknown";
  let usbRiskNote = "No Samsung binary gate detected.";
  if (isSamsung && binaryNumber !== null && binaryNumber >= 18) {
    usbRisk = "high";
    usbRiskNote =
      "Samsung Binary ≥ 18 class: KG-Prenormal may block USB DATA channels (MTP/ADB/serial) while the OS is on. " +
      "ADB ladder unreachable until KG normalizes — apply the behavior budget (no USB churn, no repeated dial attempts).";
  } else if (isSamsung && binaryNumber !== null && binaryNumber >= 15) {
    usbRisk = "medium";
    usbRiskNote = "Samsung Binary 15–17: USB routing commands may be restricted on newer patches; probe once, then stop.";
  } else if (isSamsung) {
    usbRisk = "low";
    usbRiskNote = "Samsung binary below the KG-prenormal class — legacy USB behavior expected.";
  }

  const summaryBits: string[] = [];
  if (verifiedBootState) summaryBits.push(`AVB ${verifiedBootState}`);
  if (vbmetaDeviceState) summaryBits.push(`vbmeta ${vbmetaDeviceState}`);
  if (binaryNumber !== null) summaryBits.push(`binary ${binaryNumber}`);
  if (fp.securityPatch) summaryBits.push(`patch ${fp.securityPatch}`);
  const summary =
    (summaryBits.length > 0 ? summaryBits.join(" · ") + " — " : "") +
    (usbRisk === "high"
      ? "USB data path may be gated at the processor level; route below-OS or wait out the gate."
      : "Software lanes gated by the patch ratchet; below-OS lanes remain where the chipset supports them.");

  return {
    verifiedBootState,
    vbmetaDeviceState,
    buildTags,
    securityPatch: props.securityPatch ?? fp.securityPatch ?? null,
    binaryVersion: props.binaryVersion ?? fp.binaryVersion ?? null,
    knoxVersion: props.knoxVersion ?? fp.knoxVersion ?? null,
    attestationLayer: "hardware-backed (Play Integrity class, not locally readable)",
    usbRisk,
    usbRiskNote,
    summary,
  };
}

// ---------------------------------------------------------------------
// 3. Lab ledger — evidence-banded expectations (never promised)
// ---------------------------------------------------------------------

export interface LabExpectation {
  lane: "exploit" | "ui" | "patch";
  condition: string;
  expectedRate: number; // 0..97
  band: "high" | "medium" | "low";
  source: string;
  note: string;
}

export const LAB_LEDGER: LabExpectation[] = [
  { lane: "exploit", condition: "ADB ladder, pre-authorized window", expectedRate: 88, band: "high", source: "RESEARCH-2026-FRP.md §2; XDA field reports", note: "Measured verdict + reboot observation still required." },
  { lane: "exploit", condition: "ADB ladder, A15/16 without pre-authorization", expectedRate: 5, band: "low", source: "P6 — USB restricted pre-setup (Wondershare A16 walkthrough)", note: "The honest wall: no ADB, no ladder." },
  { lane: "ui", condition: "*#0*# test-mode, A13–14", expectedRate: 55, band: "medium", source: "contested band; model/patch dependent", note: "Probe once; stop on failure (behavior budget)." },
  { lane: "ui", condition: "*#0*# test-mode, A15/16 or Binary ≥18", expectedRate: 10, band: "low", source: "P9 field report; imobie guidance", note: "Test menu blocked on newest firmware." },
  { lane: "ui", condition: "Setup tricks (TalkBack/browser), A15/16", expectedRate: 5, band: "low", source: "Wondershare / mobifirms status tables", note: "Dead class; catalog keeps it legacy-only." },
  { lane: "patch", condition: "MediaTek Brom erase", expectedRate: 80, band: "high", source: "open mtkclient protocol class", note: "SLA/DAA-signed chips may still gate; dump-first law." },
  { lane: "patch", condition: "Spreadtrum SPD bootrom", expectedRate: 75, band: "high", source: "XDA SPD tools", note: "prodnv untouched by law." },
  { lane: "patch", condition: "Qualcomm EDL 9008", expectedRate: 65, band: "medium", source: "firehose-loader gated", note: "Signed loader per model + bit required." },
  { lane: "patch", condition: "Exynos Download-Mode class", expectedRate: 70, band: "medium", source: "TFM-class claims", note: "KG-Prenormal caveat (P9); stock reflash mandatory." },
  { lane: "exploit", condition: "Official owner recovery", expectedRate: 90, band: "high", source: "Google account recovery", note: "Legitimate-owner route — not a bypass." },
];

export function ledgerFor(lane: LabExpectation["lane"], conditionIncludes: string): LabExpectation[] {
  return LAB_LEDGER.filter((l) => l.lane === lane && l.condition.includes(conditionIncludes));
}

// ---------------------------------------------------------------------
// 4. Parallel lane evaluation — superposition → collapse
// ---------------------------------------------------------------------

export type LaneStatus = "viable" | "conditional" | "blocked" | "refused";

export interface LaneEvaluation {
  algorithm: "exploit" | "ui" | "patch";
  status: LaneStatus;
  /** Evidence score 0..97 for this lane on this fingerprint. */
  score: number;
  primaryMethod: string | null;
  expectedRate: number;
  labNote: string;
  notes: string[];
}

export interface GapReport {
  fingerprint: Fingerprint;
  protection: ProtectionMap;
  lanes: LaneEvaluation[];
  /** Union coverage: 1 − ∏(1 − rᵢ), capped at the 97 honesty ceiling. */
  unionCoverage: number;
  /** Every fingerprint receives a measured plan — 100% by construction. */
  decisionCoverage: 100;
  gaps: string[];
  recommendation: string;
  collapseNote: string;
  labTable: LabExpectation[];
}

export const QUANTUM_NOTE =
  "'Quantum' in this engine means exactly two honest things: (1) all three lanes are evaluated in " +
  "parallel before collapsing to one measured choice (superposition → collapse, as a metaphor); " +
  "(2) verification is measurement — no assumption without an observation. Marketed 'quantum FRP' " +
  "remains a scam (docs/PHYSICS-LAYER-RESEARCH.md); there is no quantum computation in FRP removal.";

export const NO_EVASION_NOTE =
  "Hard line: the engine performs read-only protection mapping (seek) and footprint minimization (hide) — " +
  "it ships NO attestation spoofing, keybox injection, IMEI/Android-ID randomization, or Play Protect " +
  "suppression. Hiding from the server-side check requires leaked OEM key material, which is not software " +
  "and not lawful. Enforced by test:research.";

export const HIDE_SEEK_POLICY =
  "HIDE = no persistent modifications by default; dump→hash→rollback for every persistent step; " +
  "humanized, budgeted behavior (probe ≤3, no USB churn on KG-prenormal devices); restore-to-stock as a " +
  "mandatory lane step. SEEK = read-only protection map from getprop-class signals, used to route — never to evade.";

function exploitLane(fp: Fingerprint): LaneEvaluation {
  const plan = buildAdaptivePlan(fp);
  const band: FeasibilityBand = plan.band.band;
  const ledgerHit = LAB_LEDGER.find((l) =>
    l.lane === "exploit" && l.condition.toLowerCase().includes(band === "adb_live" ? "pre-authorized window" : band === "testmode_contested" ? "test-mode" : "a15/16"),
  );
  let status: LaneStatus;
  let notes: string[];
  switch (band) {
    case "adb_live":
      status = "viable";
      notes = ["Pre-authorized ADB window is open — the ladder can run with post-step verification."];
      break;
    case "testmode_contested":
      status = "conditional";
      notes = ["Test-mode reachability decides; probe once and stop (behavior budget)."];
      break;
    case "chipset_hardware":
      status = "blocked";
      notes = ["Software window closed — the exploit lane hands over to the patch lane (below-OS)."];
      break;
    case "official_only":
    case "unknown":
    case "none_needed":
      status = "refused";
      notes = [plan.refusal ? plan.refusal.note : "Refused — official recovery only."];
      break;
  }
  const primary = plan.chain[0]?.id ?? null;
  const expectedRate = ledgerHit ? ledgerHit.expectedRate : band === "adb_live" ? 88 : band === "testmode_contested" ? 55 : 5;
  return {
    algorithm: "exploit",
    status,
    score: status === "viable" ? Math.min(97, plan.band.feasibility) : status === "conditional" ? Math.max(20, plan.band.feasibility) : 5,
    primaryMethod: primary,
    expectedRate,
    labNote: ledgerHit ? `${ledgerHit.source} — ${ledgerHit.note}` : "Evidence-banded, lab-gated.",
    notes,
  };
}

function uiLane(fp: Fingerprint, seed = 7): LaneEvaluation {
  const flow = flowForBrand(fp.brand);
  const sim = simulatePath(fp.brand, seed);
  const band: FeasibilityBand = fp.androidMajor !== null && fp.androidMajor >= 15 ? "chipset_hardware" : "testmode_contested";
  const notes: string[] = [`Flow: ${flow.label}. ${flow.note}`];
  let status: LaneStatus;
  let expectedRate: number;
  if (fp.brand === "google") {
    status = "blocked";
    expectedRate = 5;
    notes.push("Pixel has no dialer/settings lane during setup (P10) — the FSM never pretends otherwise.");
  } else if (sim.outcome === "locked_out" || sim.outcome === "max_steps") {
    status = "blocked";
    expectedRate = 10;
    notes.push(`Seeded FSM walk reached ${sim.outcome} — UI lane blocked; hardware/official rung takes over.`);
  } else if (band === "chipset_hardware") {
    status = "conditional";
    expectedRate = 10;
    notes.push("A15/16: test-menu + dialer flows blocked on newest firmware (P4/P8/P9). Conditional only for legacy-patch devices.");
  } else {
    status = "viable";
    expectedRate = 55;
    notes.push("Contested-band UI lane: reachability of the test menu is the deciding measurement.");
  }
  const ledgerHit = LAB_LEDGER.find((l) => l.lane === "ui" && l.expectedRate === expectedRate);
  return {
    algorithm: "ui",
    status,
    score: status === "viable" ? 55 : status === "conditional" ? 25 : 8,
    primaryMethod: fp.brand === "samsung" ? "samsung_test_mode" : flow.path.includes("google_verify") ? "flow_traversal" : null,
    expectedRate,
    labNote: ledgerHit ? `${ledgerHit.source} — ${ledgerHit.note}` : "Evidence-banded, lab-gated.",
    notes,
  };
}

function patchLane(fp: Fingerprint): LaneEvaluation {
  const plan = buildAdaptivePlan(fp);
  const patchPlan = buildPatchPlan(fp.chipsetFamily, plan.band.band);
  const notes: string[] = [];
  let status: LaneStatus;
  let expectedRate: number;
  if (patchPlan.lane === "none") {
    status = plan.band.band === "official_only" || plan.band.band === "unknown" ? "refused" : "blocked";
    expectedRate = 5;
    notes.push("No public below-OS lane for this chipset/band — the refusal is the plan.");
  } else {
    status = plan.band.band === "chipset_hardware" ? "viable" : "conditional";
    expectedRate =
      fp.chipsetFamily === "MediaTek" ? 80
      : fp.chipsetFamily === "Spreadtrum" ? 75
      : fp.chipsetFamily === "Qualcomm" ? 65
      : fp.chipsetFamily === "Exynos" ? 70
      : 40;
    notes.push(`Lane: ${patchPlan.lane} — touches ${patchPlan.touches.length === 0 ? "nothing" : patchPlan.touches.join(", ")}; vbmeta writes refused by design.`);
    notes.push(patchPlan.warning ?? "Minimal-touch plan with dump→hash→rollback preconditions.");
  }
  const ledgerHit = LAB_LEDGER.find((l) => l.lane === "patch" && l.expectedRate === expectedRate);
  return {
    algorithm: "patch",
    status,
    score: status === "viable" ? expectedRate : status === "conditional" ? 40 : 5,
    primaryMethod: patchPlan.lane !== "none" ? patchPlan.lane : null,
    expectedRate,
    labNote: ledgerHit ? `${ledgerHit.source} — ${ledgerHit.note}` : "Evidence-banded, lab-gated.",
    notes,
  };
}

/**
 * Parallel evaluation of the three algorithm lanes for one fingerprint.
 * Deterministic: same inputs → same report (tested). Union coverage is
 * the honest "parallel juggling" metric: the more lanes stay open, the
 * higher the union — and where all lanes close (patched A16,
 * software-only), the union says so instead of pretending.
 */
export function evaluateParallelLanes(
  fp: Fingerprint,
  protectionInput: ProtectionInput = {},
  seed = 7,
): GapReport {
  const protection = buildProtectionMap(fp, protectionInput);
  const lanes: LaneEvaluation[] = [
    exploitLane(fp),
    uiLane(fp, seed),
    patchLane(fp),
  ];

  const rates = lanes.map((l) => (l.status === "refused" ? 0 : l.expectedRate) / 100);
  const unionRaw = 1 - rates.reduce((acc, r) => acc * (1 - r), 1);
  const unionCoverage = Math.min(97, Math.max(5, Math.round(unionRaw * 100)));

  const gaps: string[] = [];
  if (lanes.every((l) => l.status === "blocked" || l.status === "refused")) {
    gaps.push("ALL three lanes closed for this fingerprint — official Google account recovery is the only honest route (the gap is real, not hidden).");
  }
  const exploit = lanes[0];
  const ui = lanes[1];
  const patch = lanes[2];
  if (exploit.status === "blocked" || exploit.status === "refused") {
    gaps.push(`Exploit lane closed: ${exploit.notes[0]}`);
  }
  if (ui.status === "blocked" || ui.status === "refused") {
    gaps.push(`UI lane closed: ${ui.notes.join(" ")}`);
  }
  if (patch.status === "blocked" || patch.status === "refused") {
    gaps.push(`Patch lane closed: ${patch.notes[0]}`);
  }
  if (protection.usbRisk === "high") {
    gaps.push("KG-Prenormal class USB gate (P9): even a pre-authorized ADB route is unreachable while the data path is blocked — wait out or go below-OS.");
  }
  gaps.push("Attestation gap (P5): hardware-backed Play Integrity verdicts cannot be hidden in software — declared, never faked.");

  const viable = lanes.filter((l) => l.status === "viable" || l.status === "conditional");
  const recommendation = viable.length === 0
    ? "Official Google account recovery / authorized service center — all lanes closed."
    : viable
        .slice()
        .sort((a, b) => b.expectedRate - a.expectedRate)[0].algorithm === "patch"
      ? `Primary: patch lane (${patch.primaryMethod}) — then verification + journal. UI/exploit lanes contribute where their windows exist.`
      : `Primary: ${viable[0].algorithm} lane (${viable[0].primaryMethod ?? "flow"}) — collapse after the first measured verification.`;

  return {
    fingerprint: fp,
    protection,
    lanes,
    unionCoverage,
    decisionCoverage: 100,
    gaps,
    recommendation,
    collapseNote: QUANTUM_NOTE,
    labTable: LAB_LEDGER,
  };
}
