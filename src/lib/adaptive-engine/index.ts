// =====================================================================
// FRP Adaptive Engine — public API (T9 + round-2 registry)
// ---------------------------------------------------------------------
// One entry point for the UI: fingerprint → band → plan → FSM start →
// journal entry. Everything below is pure, deterministic and
// node-testable (scripts/verify-adaptive-engine.mts).
//
// Module registry (CA1 — modular architecture): each module below maps
// to the WBS task ids from docs/FRP-ADAPTIVE-ENGINE-PLAN.md round 2.
// =====================================================================

import { computeBand } from "./bands.ts";
import { buildAdaptivePlan, chainSummary } from "./decision.ts";
import { fingerprintKey } from "./journal.ts";
import { flowForBrand } from "./ui-fsm.ts";
import type { AdaptiveSession, Fingerprint } from "./types.ts";

export { computeBand, parsePatchYear, parseAndroidMajor, brandIdOf } from "./bands.ts";
export { buildAdaptivePlan, chainSummary } from "./decision.ts";
export { CATALOG, getMethod } from "./catalog.ts";
export { classifyFromDump, advance, createRuntime, simulatePath, OEM_FLOWS, flowForBrand } from "./ui-fsm.ts";
export { createRng, createTimeRng, jitterDelay, tapPoint, typePaceMs, delayForAction, DELAY_BOUNDS } from "./humanize.ts";
export {
  SURVEY_COMMANDS,
  assertReadOnly,
  AVB_HONESTY,
  assessAvb,
  planRollback,
} from "./partition-safety.ts";
export { AdaptiveJournal, defaultStorage, fingerprintKey } from "./journal.ts";

// Round-2 modules
export { VERIFICATION_STACK, ENTRY_POINTS, RESEARCH_HONESTY } from "./verification-stack.ts";
export { partitionsFor, ANDROID_1516_NOTE } from "./partition-knowledge.ts";
export { UI_SAMPLES } from "./ui-samples.ts";
export {
  runMethodValidation,
  runValidationMatrix,
  verdictLabel,
  DEFAULT_STATE_KEYS,
  type ValidationMatrixRow,
} from "./validation.ts";
export {
  outcomesFromEntries,
  methodStats,
  calibrateCatalog,
  buildAnalyticsReport,
  MIN_ATTEMPTS,
} from "./analytics.ts";
export {
  generateAdbScript,
  generateUiAutomationScript,
  optimizeLines,
  scriptDurationMs,
} from "./execution.ts";
export {
  isReadOnlyDump,
  buildDumpManifest,
  buildPatchPlan,
  evaluateFlashGates,
  generateRecoveryScript,
} from "./patch-planner.ts";
export { evaluateSafety } from "./safety.ts";
export {
  ExploitUpdateSchema,
  UiFlowUpdateSchema,
  PatchUpdateSchema,
  validateUpdatePack,
} from "./update-pack.ts";

export type * from "./types.ts";

/** Module → WBS task-id mapping (the digest of the full breakdown). */
export const WBS_MAP: { module: string; algorithm: string; tasks: string[] }[] = [
  { module: "index.ts (module registry)", algorithm: "CA", tasks: ["CA1"] },
  { module: "verification-stack.ts", algorithm: "A1+A3", tasks: ["A1-1.2", "A1-1.3", "A3-1.3", "A3-3.1"] },
  { module: "partition-knowledge.ts", algorithm: "A3", tasks: ["A3-1.1"] },
  { module: "catalog.ts", algorithm: "A1", tasks: ["A1-1.4", "A1-2.1", "A1-2.2"] },
  { module: "decision.ts", algorithm: "A1", tasks: ["A1-3.2"] },
  { module: "validation.ts", algorithm: "A1", tasks: ["A1-2.3", "A1-3.3"] },
  { module: "analytics.ts", algorithm: "A1+CA", tasks: ["A1-2.4", "A1-4.2", "CA2"] },
  { module: "execution.ts", algorithm: "A1+A2", tasks: ["A1-3.1", "A1-4.3", "A2-2.3", "A2-4.3"] },
  { module: "humanize.ts", algorithm: "A1+A2", tasks: ["A1-3.4", "A2-2.4"] },
  { module: "ui-fsm.ts", algorithm: "A2", tasks: ["A2-1.2", "A2-1.3", "A2-2.1", "A2-2.2", "A2-3.1"] },
  { module: "ui-samples.ts", algorithm: "A2", tasks: ["A2-1.1"] },
  { module: "journal.ts + refine-ui-flows.mts", algorithm: "A2", tasks: ["A2-3.2", "A2-3.3"] },
  { module: "patch-planner.ts", algorithm: "A3", tasks: ["A3-1.2", "A3-2.1", "A3-2.2", "A3-2.3", "A3-3.2", "A3-4.2", "A3-4.3"] },
  { module: "safety.ts", algorithm: "CA", tasks: ["A1-4.4", "CA5"] },
  { module: "update-pack.ts", algorithm: "CA", tasks: ["CA3", "A1-2.1"] },
  { module: "AdaptiveEngine.tsx (view)", algorithm: "CA", tasks: ["CA4"] },
];

/**
 * Build a full adaptive session for a fingerprint: band assessment,
 * ranked exploit chain, FSM starting point and a journaled plan entry.
 */
export function createAdaptiveSession(fp: Fingerprint): AdaptiveSession {
  const band = computeBand(fp);
  const plan = buildAdaptivePlan(fp);
  const flow = flowForBrand(fp.brand);
  const key = fingerprintKey(fp);

  return {
    fingerprint: fp,
    band,
    plan,
    fsmStartState: flow.path[0] ?? "welcome",
    journalEntry: {
      ts: new Date().toISOString(),
      kind: "plan",
      fingerprintKey: key,
      text: `${band.label} → ${chainSummary(plan)}`,
    },
  };
}
