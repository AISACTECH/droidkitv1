// =====================================================================
// FRP Adaptive Engine — cross-module safety coordinator (WBS A1-4.4,
// CA5)
// ---------------------------------------------------------------------
// One place where every module's fail-safe invariants are enforced:
//   consent → FRP actually active → backups for persistent steps →
//   bit/version checked → hardware lane reality → refusal respected.
// The decision tree, execution scripts and patch planner all defer to
// this verdict before anything runs.
// =====================================================================

import type { ChainPlan, SafetyState, SafetyVerdict } from "./types.ts";

export function evaluateSafety(plan: ChainPlan, state: SafetyState): SafetyVerdict {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!state.consentOwnership) {
    failures.push("Ownership/authorization consent not confirmed — engine refuses to run.");
  }
  if (!state.frpActive) {
    warnings.push("FRP is not active — verify the detection result before running anything.");
  }
  if (plan.refusal) {
    failures.push(`Plan refused: ${plan.refusal.route} — ${plan.refusal.note}`);
  }
  if (plan.chain.length === 0) {
    failures.push("No chain exists for this fingerprint (FRP inactive or unbanded).");
  }

  const persistent = plan.chain.filter((m) => m.persistence === "firmware_flash");
  if (persistent.length > 0) {
    if (!state.backupsReady) {
      failures.push(
        `Persistent steps present (${persistent.map((m) => m.name).join(", ")}) but backups are not captured — refuse.`,
      );
    }
    if (!state.bitVersionChecked) {
      failures.push(
        "Persistent steps present but the bit/version gate was not checked — refuse (brick risk).",
      );
    }
  }

  if (plan.chain.some((m) => m.risk === "high") && !state.hardwareLaneOk) {
    warnings.push(
      "High-risk rung present: EDL cable / signed firehose / Download-Mode kit may be required — confirm the hardware lane before starting.",
    );
  }

  return { allowed: failures.length === 0, failures, warnings };
}
