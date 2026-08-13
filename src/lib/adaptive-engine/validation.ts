// =====================================================================
// FRP Adaptive Engine — exploit validation harness (WBS A1-2.3 / A1-3.3)
// ---------------------------------------------------------------------
// Runs a method's ADB steps against an injectable DeviceExecutor
// (real device, emulator, or fake), snapshots system state before and
// after, and emits a measured verdict:
//   removed_verified  — the FRP state key itself flipped
//   flags_set         — provisioning flags changed but the lock remains
//   failed            — any step failed
// The same harness drives the offline validation matrix in the UI and
// the emulator/device runs on a bench (executor = real adb).
// =====================================================================

import type {
  DeviceExecutor,
  MethodEntry,
  MethodValidationResult,
  MethodVerdict,
} from "./types.ts";

/** Default FRP state keys the harness monitors (override per executor). */
export const DEFAULT_STATE_KEYS = {
  frp: "frp_active",
  provisioned: "device_provisioned",
  setupComplete: "user_setup_complete",
} as const;

export interface ValidationOptions {
  /** State key that represents the actual FRP lock. */
  frpKey?: string;
}

/** Run one method against the executor and produce a measured verdict. */
export async function runMethodValidation(
  method: MethodEntry,
  executor: DeviceExecutor,
  options: ValidationOptions = {},
): Promise<MethodValidationResult> {
  const frpKey = options.frpKey ?? DEFAULT_STATE_KEYS.frp;
  const stateBefore = await executor.detectState();
  const steps: MethodValidationResult["steps"] = [];

  for (const step of method.steps) {
    if (step.kind !== "adb_cmd" || !step.command) continue;
    try {
      const output = await executor.runAdb(step.command);
      steps.push({ command: step.command, ok: true, output });
    } catch (e) {
      steps.push({ command: step.command, ok: false, output: String(e) });
    }
  }

  const stateAfter = await executor.detectState();
  const anyStepFailed = steps.some((s) => !s.ok);

  let verdict: MethodVerdict;
  if (anyStepFailed) {
    verdict = "failed";
  } else if (stateBefore[frpKey] !== undefined && stateAfter[frpKey] !== stateBefore[frpKey]) {
    verdict = "removed_verified";
  } else if (
    stateAfter[DEFAULT_STATE_KEYS.provisioned] !== stateBefore[DEFAULT_STATE_KEYS.provisioned] ||
    stateAfter[DEFAULT_STATE_KEYS.setupComplete] !== stateBefore[DEFAULT_STATE_KEYS.setupComplete]
  ) {
    verdict = "flags_set";
  } else {
    verdict = "failed"; // nothing observably changed — never call it success
  }

  return {
    methodId: method.id,
    methodName: method.name,
    verdict,
    stateBefore,
    stateAfter,
    steps,
  };
}

export interface ValidationMatrixRow {
  methodId: string;
  verdict: MethodVerdict;
  note: string;
}

/** Run several methods sequentially; stops on the first removed_verified. */
export async function runValidationMatrix(
  methods: MethodEntry[],
  executor: DeviceExecutor,
  options: ValidationOptions = {},
): Promise<{ rows: ValidationMatrixRow[]; winner: string | null }> {
  const rows: ValidationMatrixRow[] = [];
  let winner: string | null = null;
  for (const method of methods) {
    const result = await runMethodValidation(method, executor, options);
    rows.push({ methodId: method.id, verdict: result.verdict, note: method.name });
    if (result.verdict === "removed_verified" && winner === null) {
      winner = method.id;
    }
  }
  return { rows, winner };
}

/** Human verdict explanation (measured, never promised). */
export function verdictLabel(verdict: MethodVerdict): string {
  switch (verdict) {
    case "removed_verified":
      return "FRP state key flipped — removed_verified (reboot observation still required for the final check)";
    case "flags_set":
      return "Provisioning flags changed but the lock remains — flags_set_unverified";
    case "failed":
      return "No observable state change — failed";
  }
}
