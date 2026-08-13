// =====================================================================
// FRP Adaptive Engine — script exporters & optimization (WBS A1-3.1,
// A1-4.3, A2-2.3, A2-4.3)
// ---------------------------------------------------------------------
// Generates deterministic, humanized operator scripts from the plan and
// from FSM traces:
//   generateAdbScript         — the ADB ladder rungs + verification
//   generateUiAutomationScript — uiautomator probes + input injection
//                                (accessibility-driven coordinates)
//   optimizeLines             — dedupe, merge waits, keep human pacing
// Scripts are operator artifacts for the Shell view / a bench — the
// engine itself still refuses anything unsafe (see safety.ts).
// =====================================================================

import { createRng, delayForAction } from "./humanize.ts";
import type {
  ChainPlan,
  FsmTraceStep,
  GeneratedScript,
  ScriptLine,
} from "./types.ts";

const CONSENT_HEADER = [
  "# DroidKit Adaptive Engine — generated operator script",
  "# Preconditions (enforced): own-device consent confirmed, FRP state re-detected,",
  "# read-only partition survey completed, backups captured for any persistent step.",
];

function comment(text: string): ScriptLine {
  return { kind: "comment", line: `# ${text}`, write: false };
}

/** ADB ladder script from a chain plan (refusal plans yield a refusal script). */
export function generateAdbScript(plan: ChainPlan, seed = 7): GeneratedScript {
  const rng = createRng(seed);

  if (plan.chain.length === 0 || plan.escalationPolicy === "refuse" || plan.refusal) {
    return {
      title: "ADB ladder — REFUSED",
      header: CONSENT_HEADER,
      lines: [
        comment(`Refused: ${plan.refusal?.route ?? "no chain"} — ${plan.refusal?.note ?? ""}`),
        comment("No ADB commands will be emitted for this device. See the plan for the official/hardware route."),
      ],
      footer: ["# End — nothing executed, nothing modified."],
    };
  }

  const lines: ScriptLine[] = [
    comment("1/4 Read-only survey first (never skipped)"),
    { kind: "adb", line: "getprop ro.boot.verifiedbootstate && getprop ro.build.version.security_patch", write: false },
    comment("2/4 Handshake check before any ladder rung"),
    { kind: "adb", line: "settings get global adb_enabled", write: false },
    comment("3/4 Evidence-ranked ladder (verify after EVERY rung)"),
  ];

  const seen = new Set<string>();
  let rungIndex = 0;
  for (const method of plan.chain) {
    if (method.id === "official_recovery") break;
    const rung = method.steps.filter((s) => s.kind === "adb_cmd" && s.command);
    if (rung.length === 0) continue;
    lines.push(comment(`Rung ${rungIndex + 1}: ${method.name} (${method.klass}, risk ${method.risk})`));
    for (const step of rung) {
      if (!step.command || seen.has(step.command)) continue;
      seen.add(step.command);
      lines.push({
        kind: "adb",
        line: step.command,
        delayMs: delayForAction("keyevent", rng),
        write: false,
      });
    }
    lines.push({
      kind: "verify",
      line: `# verify: re-run frp_detect and compare BEFORE/AFTER (${method.name})`,
      write: false,
    });
    lines.push({
      kind: "adb",
      line: "getprop ro.frp.pst && settings get secure user_setup_complete",
      write: false,
    });
    rungIndex += 1;
  }

  lines.push(comment("4/4 Final honest check — reboot observation"));
  lines.push({ kind: "manual", line: "adb reboot  # then re-run detection after boot; only Inactive after reboot = removed_verified", write: false });
  lines.push(comment("If every rung failed → follow the plan's chipset/official rung. Journal ALL outcomes."));

  return {
    title: "ADB ladder — generated",
    header: CONSENT_HEADER,
    lines,
    footer: [
      "# End — verification is part of the script, never an afterthought.",
      "# This script WRITES NOTHING outside ADB settings/pm commands listed above;",
      "# any flash/erase step is emitted by the patch planner, never here.",
    ],
  };
}

/** UI automation script from an FSM trace (uiautomator + input injection). */
export function generateUiAutomationScript(trace: FsmTraceStep[], seed = 7): GeneratedScript {
  const rng = createRng(seed);
  const lines: ScriptLine[] = [
    comment("UI automation — accessibility-driven (uiautomator dump → classify → act)"),
    comment("Coordinates come from the dump XML bounds; re-dump after every action."),
  ];

  for (const t of trace) {
    lines.push(comment(`${t.index}: ${t.state} → ${t.next} (${t.note})`));
    lines.push({
      kind: "adb",
      line: "uiautomator dump /sdcard/dk_ui.xml && cat /sdcard/dk_ui.xml | head -c 400",
      write: false,
    });
    for (const action of t.actions) {
      switch (action.kind) {
        case "tap":
          lines.push({ kind: "ui", line: `adb shell input tap <x> <y>   # target: ${action.target}`, delayMs: delayForAction("tap", rng), write: false });
          break;
        case "type_text":
          lines.push({ kind: "ui", line: `adb shell input text "${action.text}"`, delayMs: delayForAction("type_text", rng), write: false });
          break;
        case "swipe":
          lines.push({ kind: "ui", line: "adb shell input swipe <x1> <y1> <x2> <y2> 300", delayMs: delayForAction("swipe", rng), write: false });
          break;
        case "keyevent":
          lines.push({ kind: "ui", line: `adb shell input keyevent ${action.code}`, delayMs: delayForAction("keyevent", rng), write: false });
          break;
        case "wait":
          lines.push({ kind: "ui", line: `sleep ${(Math.max(50, action.ms) / 1000).toFixed(2)}`, write: false });
          break;
        case "adb":
          lines.push({ kind: "adb", line: action.command, write: false });
          break;
        case "verify":
          lines.push({ kind: "verify", line: "# verify: re-dump + classify + compare with the expected next state", write: false });
          break;
        case "guide":
          lines.push({ kind: "manual", line: `# MANUAL: ${action.text}`, write: false });
          break;
        case "escalate":
          lines.push({ kind: "manual", line: `# ESCALATE: ${action.reason}`, write: false });
          break;
      }
    }
  }

  return {
    title: "UI automation — generated",
    header: CONSENT_HEADER,
    lines,
    footer: [
      "# End — the FSM never sends input on a screen it could not classify;",
      "# unknown screens stop the script and ask the operator (probe budget = 3).",
    ],
  };
}

/** Optimize a script: merge consecutive waits, dedupe repeats, keep pacing. */
export function optimizeLines(lines: ScriptLine[]): ScriptLine[] {
  const out: ScriptLine[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (prev && prev.line === line.line && line.kind === prev.kind) continue; // dedupe
    if (prev && prev.kind === "comment" && line.kind === "comment") continue; // collapse comment runs
    out.push(line);
  }
  return out.filter((l) => !(l.kind === "ui" && l.line.startsWith("sleep 0.00")));
}

/** Total script duration estimate (sum of delayMs + per-line pacing). */
export function scriptDurationMs(lines: ScriptLine[]): number {
  return lines.reduce((sum, l) => sum + (l.delayMs ?? 300), 0);
}
