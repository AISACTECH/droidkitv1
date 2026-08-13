// =====================================================================
// FRP Adaptive Engine — public API (T9)
// ---------------------------------------------------------------------
// One entry point for the UI: fingerprint → band → plan → FSM start →
// journal entry. Everything below is pure, deterministic and
// node-testable (scripts/verify-adaptive-engine.mts).
// =====================================================================

import { computeBand } from "./bands.ts";
import { buildAdaptivePlan, chainSummary } from "./decision.ts";
import { AdaptiveJournal, fingerprintKey } from "./journal.ts";
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
export type * from "./types.ts";

/**
 * Build a full adaptive session for a fingerprint: band assessment,
 * ranked exploit chain, FSM starting point and a journaled plan entry.
 */
export function createAdaptiveSession(
  fp: Fingerprint,
  journal?: AdaptiveJournal,
): AdaptiveSession {
  const band = computeBand(fp);
  const plan = buildAdaptivePlan(fp);
  const flow = flowForBrand(fp.brand);
  const key = fingerprintKey(fp);

  const journalEntry = (journal ?? new AdaptiveJournal()).append(
    "plan",
    key,
    `${band.label} → ${chainSummary(plan)}`,
  );

  return {
    fingerprint: fp,
    band,
    plan,
    fsmStartState: flow.path[0] ?? "welcome",
    journalEntry,
  };
}
