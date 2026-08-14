// =====================================================================
// FRP Adaptive Engine — UI & behavior interaction FSM (T5)
// ---------------------------------------------------------------------
// Algorithm #2 from the brief (UI & Behavior Interaction, non-AI):
//   * a comprehensive state machine of FRP setup-wizard UI states,
//   * a rule-based interaction engine (scripted sequences per state,
//     conditional branches for errors / unexpected dialogs),
//   * heuristic timers + randomized delays (humanize.ts),
//   * fallback routines for unknown or changed flows (probe budget →
//     manual guidance + journaled failure for analysis).
//
// Pure and deterministic under a seeded RNG — fully testable without a
// device (scripts/verify-adaptive-engine.mts). Real input injection is
// performed by the existing screen-control / ADB layer; this module is
// the brain that decides what to do next.
// =====================================================================

import { createRng, delayForAction, jitterDelay } from "./humanize.ts";
import type {
  BrandId,
  FsmAction,
  FsmEvent,
  FsmStateId,
  FsmTraceStep,
  FsmTransition,
} from "./types.ts";

// ---------------------------------------------------------------------
// 1. UI classifier — uiautomator-dump text / activity hints → state
// ---------------------------------------------------------------------

const KEYWORDS: [FsmStateId, string[]][] = [
  ["google_verify", ["this device was reset", "verify your account", "gsf.login", "google account", "sign in to continue", "previously synced"]],
  ["account_email", ["enter your email", "email or phone", "forgot email", "add your account"]],
  ["account_password", ["enter your password", "forgot password", "type your password", "password:"]],
  ["2fa_consent", ["2-step verification", "google terms of service", "agree", "privacy policy"]],
  ["emergency_dialer", ["emergencydialer", "emergency call", "dialpad"]],
  ["test_mode_menu", ["hwmoduletest", "test mode", "0*#", "dimming", "megacam", "tof", "barometer"]],
  ["developer_options", ["developer options", "oem unlocking", "build number"]],
  ["usb_debug_toggle", ["usb debugging", "android debugging"]],
  ["rsa_prompt", ["allow usb debugging", "rsa key fingerprint", "always allow from this computer"]],
  ["settings_app", ["com.android.settings", "system settings", "connections", "about phone"]],
  ["wifi_setup", ["wi-fi", "wifi", "wireless", "network & internet"]],
  ["network_select", ["mobile data", "sim card", "cellular", "data network"]],
  ["copy_apps", ["copy apps", "copy data", "apps & data", "transfer"]],
  ["welcome", ["hi there", "welcome", "get started", "let's go", "language", "start"]],
  ["recovery_menu", ["android recovery", "wipe data/factory reset", "reboot system now"]],
  ["bootloader_menu", ["fastboot mode", "download mode", "odin mode", "do not turn off target"]],
  ["locked_out", ["too many attempts", "locked for", "try again in", "wait 24"]],
  ["launcher_home", ["launcher3", "oneui.home", "miui.home", "com.transsion", "nova launcher", "app drawer", "recents"]],
];

const BRAND_BOOST: Partial<Record<BrandId, [FsmStateId, string[]][]>> = {
  samsung: [["google_verify", ["samsung account", "find my mobile"]]],
  transsion: [["welcome", ["hi os", "xos", "phoenix"]], ["wifi_setup", ["network setup", "palm store"]]],
  xiaomi: [["google_verify", ["mi account", "hyperos"]], ["welcome", ["hyperos", "miui"]]],
};

export interface Classification {
  state: FsmStateId;
  confidence: number; // 0..1
  matched: string[];
}

/** Classify raw UI dump text into the nearest known FRP UI state. */
export function classifyFromDump(dumpText: string, brand: BrandId): Classification {
  const text = dumpText.toLowerCase();
  const tables = [...KEYWORDS, ...(BRAND_BOOST[brand] ?? [])];
  const scored: { state: FsmStateId; hits: number; matched: string[] }[] = [];
  for (const [state, kws] of tables) {
    const matched = kws.filter((k) => text.includes(k.toLowerCase()));
    if (matched.length > 0) scored.push({ state, hits: matched.length, matched });
  }
  if (scored.length === 0) return { state: "unknown", confidence: 0, matched: [] };
  scored.sort((a, b) => b.hits - a.hits);
  const best = scored[0];
  return {
    state: best.state,
    confidence: Math.min(1, 0.45 + best.hits * 0.15),
    matched: best.matched,
  };
}

// ---------------------------------------------------------------------
// 2. Transition rules — scripted sequences per state
// ---------------------------------------------------------------------

/** Which states can follow which (observed-state validation). */
const ALLOWED_FROM: Record<FsmStateId, FsmStateId[]> = {
  unknown: ["welcome", "wifi_setup", "google_verify", "launcher_home", "settings_app"],
  welcome: ["welcome", "network_select", "wifi_setup", "copy_apps", "google_verify", "emergency_dialer"],
  network_select: ["wifi_setup", "copy_apps"],
  wifi_setup: ["welcome", "copy_apps", "google_verify", "settings_app"],
  copy_apps: ["welcome", "wifi_setup", "google_verify"],
  google_verify: ["account_email", "account_password", "2fa_consent", "emergency_dialer", "locked_out", "welcome"],
  account_email: ["account_password", "google_verify"],
  account_password: ["google_verify", "2fa_consent", "launcher_home", "locked_out"],
  "2fa_consent": ["launcher_home", "google_verify"],
  emergency_dialer: ["test_mode_menu", "settings_app", "google_verify"],
  test_mode_menu: ["settings_app", "developer_options", "emergency_dialer"],
  settings_app: ["developer_options", "usb_debug_toggle", "emergency_dialer", "wifi_setup"],
  developer_options: ["usb_debug_toggle", "settings_app"],
  usb_debug_toggle: ["rsa_prompt", "developer_options"],
  rsa_prompt: ["usb_debug_toggle", "settings_app"],
  launcher_home: [],
  recovery_menu: ["bootloader_menu", "welcome"],
  bootloader_menu: [],
  locked_out: [],
  done: [],
};

/** Scripted actions for each state→state hop. */
function hopActions(from: FsmStateId, to: FsmStateId): FsmAction[] {
  switch (`${from}>${to}`) {
    case "welcome>wifi_setup": return [{ kind: "tap", target: "Next" }];
    case "wifi_setup>google_verify": return [{ kind: "tap", target: "Skip" }, { kind: "wait", ms: 800 }];
    case "google_verify>emergency_dialer": return [{ kind: "tap", target: "Emergency Call" }];
    case "emergency_dialer>test_mode_menu": return [{ kind: "type_text", target: "dialer", text: "*#0*#" }];
    case "emergency_dialer>settings_app": return [{ kind: "guide", text: "Emergency-dialer shortcut to Settings (legacy). Follow the printed runbook." }];
    case "test_mode_menu>settings_app": return [{ kind: "tap", target: "Settings (test menu)" }];
    case "settings_app>developer_options": return [{ kind: "guide", text: "Tap Build Number 7× to unlock Developer Options." }];
    case "developer_options>usb_debug_toggle": return [{ kind: "tap", target: "USB debugging toggle" }];
    case "usb_debug_toggle>rsa_prompt": return [{ kind: "wait", ms: 1500 }, { kind: "guide", text: "Accept the RSA dialog on the device." }];
    case "rsa_prompt>settings_app": return [{ kind: "guide", text: "RSA prompt dismissed or missed — toggle USB debugging off/on and retry." }];
    case "google_verify>account_email": return [{ kind: "guide", text: "Owner enters Google account credentials (legitimate recovery path)." }];
    case "account_password>launcher_home": return [{ kind: "verify", }, { kind: "guide", text: "Credential accepted — device reaches home screen. Confirm FRP re-detection shows Inactive." }];
    case "account_password>locked_out": return [{ kind: "guide", text: "Too many attempts — wait out the cooldown or use official account recovery from another device." }];
    case "google_verify>locked_out": return [{ kind: "guide", text: "Verification hard-blocked. Route to the chipset path or official recovery (see plan)." }];
    default: return [{ kind: "wait", ms: 500 }];
  }
}

const PROBE_BUDGET = 3;

export interface FsmRuntime {
  unknownProbes: number;
}

export function createRuntime(): FsmRuntime {
  return { unknownProbes: 0 };
}

/** Expected humanized wait before the next probe for a state. */
function expectedDelayMs(state: FsmStateId): number {
  switch (state) {
    case "welcome": return 1200;
    case "wifi_setup": return 2500;
    case "google_verify": return 3000;
    case "account_email": return 2000;
    case "account_password": return 3000;
    case "emergency_dialer": return 1500;
    case "test_mode_menu": return 2000;
    case "rsa_prompt": return 4000;
    case "locked_out": return 0;
    default: return 1500;
  }
}

/**
 * Advance the FSM one step. Deterministic given (state, event, observed).
 * Handles the unknown/fallback routine: probe budget → manual guidance.
 */
export function advance(
  state: FsmStateId,
  event: FsmEvent,
  observed: FsmStateId | null,
  rt: FsmRuntime,
): FsmTransition {
  // Terminal states.
  if (state === "done" || state === "launcher_home") {
    return { state, event: event.type, next: state, actions: [], expectedDelayMs: 0, note: "Terminal (success marker)." };
  }

  // Hard block — terminal for the UI lane (decision tree takes over).
  if (event.type === "blocked") {
    return {
      state, event: event.type, next: "locked_out", expectedDelayMs: 0,
      actions: [{ kind: "escalate", reason: event.reason }, { kind: "guide", text: "UI lane blocked. Follow the plan's hardware/official rung." }],
      note: `Blocked: ${event.reason}`,
    };
  }
  if (state === "locked_out") {
    if (event.type === "manual_confirmed") {
      return { state, event: event.type, next: "done", actions: [{ kind: "guide", text: "Manual intervention confirmed — session closed." }], expectedDelayMs: 0, note: "Manual takeover." };
    }
    return { state, event: event.type, next: "locked_out", actions: [{ kind: "guide", text: "Locked out — hardware or official route required." }], expectedDelayMs: 0, note: "Terminal (locked)." };
  }

  if (event.type === "adb_authorized") {
    return {
      state, event: event.type, next: "done", expectedDelayMs: 0,
      actions: [{ kind: "adb", command: "frp_verify_handshake" }, { kind: "verify" }],
      note: "ADB authorized — hand off to the ADB ladder (removal runs in the Rust engine).",
    };
  }

  if (event.type === "timeout" || event.type === "error") {
    rt.unknownProbes += 1;
    const exhausted = rt.unknownProbes >= PROBE_BUDGET;
    return {
      state, event: event.type, next: exhausted ? "locked_out" : "unknown",
      expectedDelayMs: 1500,
      actions: exhausted
        ? [{ kind: "escalate", reason: `No recognized UI after ${rt.unknownProbes} probes` }, { kind: "guide", text: "Log the dump for manual analysis; follow the plan's fallback rung." }]
        : [{ kind: "wait", ms: 1500 }, { kind: "guide", text: "Re-probe the UI (fresh uiautomator dump)." }],
      note: exhausted ? "Probe budget exhausted → escalate." : `Probe ${rt.unknownProbes}/${PROBE_BUDGET} — re-probing.`,
    };
  }

  if (event.type === "manual_confirmed") {
    return { state, event: event.type, next: "done", actions: [{ kind: "guide", text: "Operator completed the step." }], expectedDelayMs: 0, note: "Manual step confirmed." };
  }

  // ui_observed → validate observed state against the allowed set.
  if (event.type === "ui_observed") {
    if (observed !== null && observed !== "unknown" && ALLOWED_FROM[state].includes(observed)) {
      rt.unknownProbes = 0;
      const delay = expectedDelayMs(observed);
      return {
        state, event: event.type, next: observed, expectedDelayMs: delay,
        actions: hopActions(state, observed),
        note: `Observed ${observed} (allowed from ${state}).`,
      };
    }
    // Unknown or unexpected UI → conditional branch to the fallback routine.
    rt.unknownProbes += 1;
    const exhausted = rt.unknownProbes >= PROBE_BUDGET;
    return {
      state, event: event.type, next: exhausted ? "locked_out" : "unknown",
      expectedDelayMs: 2000,
      actions: exhausted
        ? [{ kind: "escalate", reason: `Unrecognized UI after ${rt.unknownProbes} probes` }, { kind: "guide", text: "Journal the raw dump; update the classifier keywords; follow the plan's fallback rung." }]
        : [{ kind: "wait", ms: 2000 }],
      note: exhausted
        ? "Unexpected UI → probe budget exhausted → manual guidance."
        : `Unexpected UI (${observed ?? "unclassified"}) → fallback probe ${rt.unknownProbes}/${PROBE_BUDGET}.`,
    };
  }

  // Unreachable — every event variant is handled above. Kept for exhaustiveness.
  return {
    state,
    event: "timeout" as FsmEvent["type"],
    next: state,
    actions: [],
    expectedDelayMs: 1000,
    note: "No-op (unreachable).",
  };
}

// ---------------------------------------------------------------------
// 3. OEM flow tables
// ---------------------------------------------------------------------

export interface OemFlow {
  brand: BrandId;
  label: string;
  /** Expected state traversal for the primary FRP route. */
  path: FsmStateId[];
  note: string;
}

export const OEM_FLOWS: OemFlow[] = [
  {
    brand: "samsung",
    label: "Samsung One UI (test-mode flow)",
    path: ["welcome", "wifi_setup", "google_verify", "emergency_dialer", "test_mode_menu", "settings_app", "developer_options", "usb_debug_toggle", "rsa_prompt"],
    note: "FRP screen → Emergency Call → *#0*#. If the test menu never opens (14+/patched), the FSM escalates to the chipset/official rung.",
  },
  {
    brand: "google",
    label: "Google Pixel (stock wizard)",
    path: ["welcome", "wifi_setup", "copy_apps", "google_verify", "account_email", "account_password", "launcher_home"],
    note: "No dialer trick exists on Pixel. Owner credentials or official recovery — the FSM never pretends otherwise.",
  },
  {
    brand: "transsion",
    label: "Tecno/Infinix/Itel (XOS/HiOS)",
    path: ["welcome", "network_select", "wifi_setup", "google_verify", "account_email"],
    note: "Primary route for this family is below-OS: SPD bootrom auto-ADB. The UI lane is the ADB-after-authorization path.",
  },
  {
    brand: "xiaomi",
    label: "Xiaomi/Redmi/POCO (HyperOS)",
    path: ["welcome", "wifi_setup", "copy_apps", "google_verify", "account_email"],
    note: "Mi-account may gate newer devices in addition to FRP — journal the exact dialog for the catalog.",
  },
  {
    brand: "oppo",
    label: "OPPO/Realme/OnePlus",
    path: ["welcome", "wifi_setup", "copy_apps", "google_verify", "account_email"],
    note: "Brom/EDL class hardware path is the primary route on patched builds.",
  },
  {
    brand: "vivo",
    label: "Vivo/iQOO",
    path: ["welcome", "wifi_setup", "google_verify", "account_email"],
    note: "Vivo account + FRP may both gate; catalog keys off the exact dialog observed.",
  },
  {
    brand: "huawei",
    label: "Huawei/Honor",
    path: ["welcome", "wifi_setup", "google_verify"],
    note: "No GMS on recent Huawei — Huawei-ID gating instead; official recovery applies.",
  },
  {
    brand: "motorola",
    label: "Motorola",
    path: ["welcome", "wifi_setup", "copy_apps", "google_verify", "account_email", "account_password", "launcher_home"],
    note: "Stock-ish wizard; fastboot unlock only if OEM unlocking was enabled pre-reset.",
  },
  {
    brand: "other",
    label: "Generic",
    path: ["welcome", "wifi_setup", "google_verify", "account_email", "account_password", "launcher_home"],
    note: "Generic wizard: credentials or official recovery; unknown dialogs get journaled for catalog updates.",
  },
];

export function flowForBrand(brand: BrandId): OemFlow {
  return OEM_FLOWS.find((f) => f.brand === brand) ?? OEM_FLOWS[OEM_FLOWS.length - 1];
}

// ---------------------------------------------------------------------
// 4. Deterministic simulator (offline demo + test coverage)
// ---------------------------------------------------------------------

export interface SimulatedPath {
  brand: BrandId;
  seed: number;
  trace: FsmTraceStep[];
  outcome: "done" | "launcher_home" | "locked_out" | "max_steps";
}

/**
 * Walk a seeded path through the OEM flow table. Each step classifies
 * the expected next state from the flow (as if the dump confirmed it)
 * and applies the transition rules + humanized delays.
 */
export function simulatePath(brand: BrandId, seed: number): SimulatedPath {
  const rng = createRng(seed);
  const flow = flowForBrand(brand);
  const rt = createRuntime();
  const trace: FsmTraceStep[] = [];
  let state: FsmStateId = "welcome";
  let stepIndex = 0;
  const maxSteps = 40;

  while (stepIndex < maxSteps) {
    if (state === "done" || state === "launcher_home" || state === "locked_out") {
      return { brand, seed, trace, outcome: state as SimulatedPath["outcome"] };
    }
    // The next expected state from the flow table after `state`.
    const idx = flow.path.indexOf(state);
    const nextExpected = idx >= 0 && idx + 1 < flow.path.length ? flow.path[idx + 1] : null;

    if (state === "bootloader_menu") {
      // Terminal-ish: chipset path hand-off.
      trace.push({
        index: stepIndex, state, event: "manual_confirmed", next: "done",
        actions: [{ kind: "guide", text: "Chipset runbook hand-off — see plan." }],
        delayMs: 0, note: "Bootloader/menu reached — runbook takes over.",
      });
      return { brand, seed, trace, outcome: "done" };
    }

    const event: FsmEvent = nextExpected
      ? { type: "ui_observed", hints: [`expected:${nextExpected}`] }
      : { type: "timeout" };

    const tr = advance(state, event, nextExpected, rt);
    const delay = nextExpected ? jitterDelay(rng, tr.expectedDelayMs, 0.25, 40) : tr.expectedDelayMs;
    const actionDelays = tr.actions.map((a) => delayForAction(a.kind, rng));
    trace.push({
      index: stepIndex,
      state,
      event: tr.event,
      next: tr.next,
      actions: tr.actions,
      delayMs: delay + actionDelays.reduce((s, d) => s + d, 0),
      note: tr.note,
    });
    state = tr.next;
    stepIndex += 1;
  }
  return { brand, seed, trace, outcome: "max_steps" };
}
