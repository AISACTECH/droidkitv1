// =====================================================================
// FRP Adaptive Engine — analytics + catalog calibration (WBS A1-2.4,
// A1-4.2, CA2)
// ---------------------------------------------------------------------
// Centralized success/failure aggregation from journal entries, and a
// calibration loop that adjusts catalog evidence weights DOWNWARD ONLY
// (upward moves require bench verification — that asymmetry is the
// honesty law, made executable).
// =====================================================================

import type {
  AnalyticsReport,
  CalibrationSuggestion,
  JournalEntry,
  MethodEntry,
  MethodStats,
} from "./types.ts";

/** Extract outcome records from journal entries carrying method meta. */
export function outcomesFromEntries(
  entries: JournalEntry[],
): { methodId: string; success: boolean; ts: string }[] {
  const out: { methodId: string; success: boolean; ts: string }[] = [];
  for (const e of entries) {
    const methodId = e.meta?.method;
    const outcome = e.meta?.outcome;
    if (typeof methodId === "string" && (outcome === "success" || outcome === "failure")) {
      out.push({ methodId, success: outcome === "success", ts: e.ts });
    }
  }
  return out;
}

/** Aggregate per-method statistics. */
export function methodStats(
  records: { methodId: string; success: boolean }[],
): MethodStats[] {
  const map = new Map<string, { attempts: number; successes: number; failures: number }>();
  for (const r of records) {
    const s = map.get(r.methodId) ?? { attempts: 0, successes: 0, failures: 0 };
    s.attempts += 1;
    if (r.success) s.successes += 1;
    else s.failures += 1;
    map.set(r.methodId, s);
  }
  return [...map.entries()]
    .map(([methodId, s]) => ({
      methodId,
      attempts: s.attempts,
      successes: s.successes,
      failures: s.failures,
      successRatio: s.attempts === 0 ? 0 : Math.round((s.successes / s.attempts) * 100),
    }))
    .sort((a, b) => b.attempts - a.attempts);
}

export const MIN_ATTEMPTS = 3;

/**
 * Downward-only calibration suggestions. Success ratio < 50% with at
 * least MIN_ATTEMPTS attempts → lower the evidence weight. Never raises.
 */
export function calibrateCatalog(
  catalog: MethodEntry[],
  records: { methodId: string; success: boolean }[],
): CalibrationSuggestion[] {
  const stats = methodStats(records);
  const suggestions: CalibrationSuggestion[] = [];
  for (const s of stats) {
    const method = catalog.find((m) => m.id === s.methodId);
    if (!method || s.attempts < MIN_ATTEMPTS) continue;
    const ratio = s.successes / s.attempts;
    if (ratio >= 0.5) continue;
    const drop = ratio < 0.2 ? 20 : 10;
    const suggested = Math.max(5, method.evidenceWeight - drop);
    suggestions.push({
      methodId: s.methodId,
      currentWeight: method.evidenceWeight,
      suggestedWeight: suggested,
      attempts: s.attempts,
      successes: s.successes,
      reason:
        `${s.successes}/${s.attempts} success (${s.successRatio}%). Downward-only rule: weight lowered by ${drop}. ` +
        "Upward moves are never auto-applied — they require bench verification evidence.",
    });
  }
  return suggestions;
}

/** Full analytics report from journal entries. */
export function buildAnalyticsReport(
  entries: JournalEntry[],
  catalog: MethodEntry[],
): AnalyticsReport {
  const records = outcomesFromEntries(entries);
  const totals = {
    attempts: records.length,
    successes: records.filter((r) => r.success).length,
    failures: records.filter((r) => !r.success).length,
  };
  return {
    generatedAt: new Date().toISOString(),
    totals,
    methods: methodStats(records),
    calibration: calibrateCatalog(catalog, records),
  };
}
