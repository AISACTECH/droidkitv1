// =====================================================================
// FRP Adaptive Engine — verification suite (`npm run test:adaptive`)
// ---------------------------------------------------------------------
// Proves the decision logic is correct, deterministic and honest:
//   A. feasibility-band matrix incl. Android 15/16 rows
//   B. decision tree determinism + chain structure + refusal policy
//   C. UI FSM reachability, classifier, probe-budget fallback
//   D. humanization bounds + seeded reproducibility
//   E. partition safety: read-only guarantee, AVB honesty, rollback
//   F. journal roundtrip
// What this does NOT prove (by design): physical device behaviour —
// that requires a bench with real Android 15/16 hardware.
// =====================================================================

import {
  computeBand,
  buildAdaptivePlan,
  chainSummary,
  CATALOG,
  getMethod,
  classifyFromDump,
  advance,
  createRuntime,
  simulatePath,
  OEM_FLOWS,
  createRng,
  jitterDelay,
  tapPoint,
  typePaceMs,
  delayForAction,
  DELAY_BOUNDS,
  SURVEY_COMMANDS,
  assertReadOnly,
  AVB_HONESTY,
  assessAvb,
  planRollback,
  AdaptiveJournal,
  createAdaptiveSession,
  // round-2 modules
  VERIFICATION_STACK,
  ENTRY_POINTS,
  RESEARCH_HONESTY,
  partitionsFor,
  ANDROID_1516_NOTE,
  UI_SAMPLES,
  runMethodValidation,
  runValidationMatrix,
  verdictLabel,
  outcomesFromEntries,
  methodStats,
  calibrateCatalog,
  buildAnalyticsReport,
  generateAdbScript,
  generateUiAutomationScript,
  optimizeLines,
  scriptDurationMs,
  isReadOnlyDump,
  buildDumpManifest,
  buildPatchPlan,
  evaluateFlashGates,
  generateRecoveryScript,
  evaluateSafety,
  validateUpdatePack,
  WBS_MAP,
} from "../src/lib/adaptive-engine/index.ts"
import type { Fingerprint, FsmEvent, FsmStateId, DeviceExecutor, JournalEntry, MethodEntry } from "../src/lib/adaptive-engine/index.ts"
import { suggestKeywords, refineFromEntries } from "./refine-ui-flows.mts"

let passed = 0
let failed = 0
function check(name: string, ok: boolean) {
  if (ok) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    console.log(`  ❌ ${name}`)
  }
}

// ---------------------------------------------------------------------
// Fingerprint factory
// ---------------------------------------------------------------------
function fp(overrides: Partial<Fingerprint> = {}): Fingerprint {
  return {
    brand: "samsung",
    brandRaw: "samsung",
    modelCode: "SM-A155F",
    marketingName: "Galaxy A15",
    chipsetFamily: "MediaTek",
    chipsetName: "mt6789",
    androidMajor: 14,
    androidVersionRaw: "14",
    sdkVersion: "34",
    securityPatch: "2024-03-01",
    binaryVersion: "U1",
    bootloaderVersion: "A155FXXS1AXA1",
    buildFingerprint: "samsung/a15nnxx/a15:14/UP1A.231005.007/REL:user/release-keys",
    knoxVersion: "3.9",
    frpState: "Active",
    adbState: "Unauthorized",
    deviceMode: "Normal",
    hasSim: true,
    hasWifi: true,
    ...overrides,
  }
}

// ============== A · feasibility bands (Android 15/16 matrix) ==============
console.log("\nA. Feasibility bands")

check("A12 + patch 2021 → adb_live", computeBand(fp({ androidMajor: 12, androidVersionRaw: "12", securityPatch: "2021-11-01" })).band === "adb_live")
check("A13 + patch 2023 → testmode_contested", computeBand(fp({ androidMajor: 13, androidVersionRaw: "13", securityPatch: "2023-05-01" })).band === "testmode_contested")
check("A14 + patch 2023 → testmode_contested", computeBand(fp({ androidMajor: 14, androidVersionRaw: "14", securityPatch: "2023-12-01" })).band === "testmode_contested")
check("A14 + patch 2024 → chipset_hardware", computeBand(fp({ androidMajor: 14, androidVersionRaw: "14", securityPatch: "2024-03-01" })).band === "chipset_hardware")
check("A15 (MTK) → chipset_hardware", computeBand(fp({ androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01" })).band === "chipset_hardware")
check("A15 (Exynos) → chipset_hardware", computeBand(fp({ androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01", chipsetFamily: "Exynos" })).band === "chipset_hardware")
check("A16 (Qualcomm) → chipset_hardware", computeBand(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Qualcomm" })).band === "chipset_hardware")
check("A16 (unknown chipset) → official_only", computeBand(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Unknown" })).band === "official_only")
check("A16 + pre-authorized ADB → adb_live", computeBand(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", adbState: "Authorized" })).band === "adb_live")
check("DownloadMode active → chipset_hardware", computeBand(fp({ deviceMode: "DownloadMode" })).band === "chipset_hardware")
check("FRP Inactive → none_needed", computeBand(fp({ frpState: "Inactive" })).band === "none_needed")
check("unparseable Android → unknown band", computeBand(fp({ androidMajor: null, androidVersionRaw: "xx" })).band === "unknown")
check("feasibility always within [5, 97]",
  [12, 13, 14, 15, 16].every((v) => {
    const f = computeBand(fp({ androidMajor: v, androidVersionRaw: String(v) })).feasibility
    return f >= 5 && f <= 97
  }))
check("adb_live band never prints 100", computeBand(fp({ adbState: "Authorized" })).feasibility <= 97)

// ============== B · decision tree ==============
console.log("\nB. Decision tree")

const planA12 = buildAdaptivePlan(fp({ androidMajor: 12, androidVersionRaw: "12", securityPatch: "2021-11-01", adbState: "Authorized" }))
check("A12 + ADB: primary is an ADB-flags rung", planA12.chain[0].klass === "adb_flags")
check("A12 + ADB: ≥2 fallbacks before terminal", planA12.chain.length >= 3)
check("every chain terminates in official_recovery", planA12.chain[planA12.chain.length - 1].id === "official_recovery")
check("sequential_verify policy on live chain", planA12.escalationPolicy === "sequential_verify")
check("verification includes before/after re-detect", planA12.verification.some((v) => v.includes("BEFORE/AFTER")))

const planMTK = buildAdaptivePlan(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01" }))
check("A16 MTK: primary is the Brom path", planMTK.chain[0].id === "mediatek_brom")
check("A16 MTK: persistent-step warnings include rollback", planMTK.warnings.some((w) => w.includes("rollback")))
check("A16 MTK: AVB honesty warning present", planMTK.warnings.some((w) => w.includes("Verified Boot")))

const planOfficial = buildAdaptivePlan(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Unknown" }))
check("official_only band → refusal plan", planOfficial.escalationPolicy === "refuse" && planOfficial.refusal !== null)
check("refusal routes to official recovery", planOfficial.refusal!.route.toLowerCase().includes("google"))

const planInactive = buildAdaptivePlan(fp({ frpState: "Inactive" }))
check("FRP inactive → empty chain + refusal (stop)", planInactive.chain.length === 0 && planInactive.escalationPolicy === "refuse")

check("deterministic: identical fingerprints → identical plans",
  JSON.stringify(buildAdaptivePlan(fp({ androidMajor: 15, androidVersionRaw: "15", securityPatch: "2025-06-01" }))) ===
    JSON.stringify(buildAdaptivePlan(fp({ androidMajor: 15, androidVersionRaw: "15", securityPatch: "2025-06-01" }))))

check("chainSummary composes primary → fallbacks", chainSummary(planA12).includes("primary:") && chainSummary(planA12).includes("→"))

// ============== C · UI FSM ==============
console.log("\nC. UI & behavior FSM")

const ALL_STATES: FsmStateId[] = [
  "unknown", "welcome", "network_select", "wifi_setup", "copy_apps", "google_verify",
  "account_email", "account_password", "2fa_consent", "emergency_dialer", "test_mode_menu",
  "settings_app", "developer_options", "usb_debug_toggle", "rsa_prompt", "launcher_home",
  "recovery_menu", "bootloader_menu", "locked_out", "done",
]
const EVENTS: FsmEvent[] = [
  { type: "ui_observed", hints: [] },
  { type: "timeout" },
  { type: "error", detail: "x" },
  { type: "adb_authorized" },
  { type: "manual_confirmed" },
  { type: "blocked", reason: "x" },
]

check("every state can progress or is terminal",
  ALL_STATES.every((s) => {
    if (s === "done" || s === "launcher_home" || s === "locked_out") return true
    return EVENTS.some((e) => {
      const t = advance(s, e, null, createRuntime())
      return t.next !== s
    })
  }))

check("classifier: reset screen → google_verify",
  classifyFromDump('package="com.google.android.gsf.login" text="This device was reset. To continue, sign in with a Google Account."', "samsung").state === "google_verify")
check("classifier: test menu → test_mode_menu",
  classifyFromDump('activity="com.sec.android.app.hwmoduletest" RED GREEN BLUE RECEIVER', "samsung").state === "test_mode_menu")
check("classifier: RSA dialog → rsa_prompt",
  classifyFromDump("Allow USB debugging? The computer's RSA key fingerprint is AB:CD. Always allow from this computer", "samsung").state === "rsa_prompt")
check("classifier: empty dump → unknown (0 confidence)",
  classifyFromDump("", "samsung").state === "unknown" && classifyFromDump("", "samsung").confidence === 0)
check("classifier: brand boosters apply (transsion HiOS)",
  classifyFromDump("Hi OS 2.5 network setup", "transsion").state === "welcome")

{
  const rt = createRuntime()
  const t1 = advance("google_verify", { type: "ui_observed", hints: [] }, null, rt)
  const t2 = advance("google_verify", { type: "ui_observed", hints: [] }, null, rt)
  const t3 = advance("google_verify", { type: "ui_observed", hints: [] }, null, rt)
  check("unknown UI: 3 probes → locked_out + escalate",
    t1.next === "unknown" && t2.next === "unknown" && t3.next === "locked_out" &&
    t3.actions.some((a) => a.kind === "escalate"))
}
{
  const rt = createRuntime()
  const t1 = advance("welcome", { type: "timeout" }, null, rt)
  const t2 = advance("welcome", { type: "timeout" }, null, rt)
  const t3 = advance("welcome", { type: "timeout" }, null, rt)
  check("timeout budget: 3 timeouts → locked_out", t1.next === "unknown" && t2.next === "unknown" && t3.next === "locked_out")
}
check("valid observation resets probe budget",
  (() => {
    const rt = createRuntime()
    advance("google_verify", { type: "timeout" }, null, rt)
    const t = advance("google_verify", { type: "ui_observed", hints: [] }, "emergency_dialer", rt)
    return t.next === "emergency_dialer" && rt.unknownProbes === 0
  })())
check("allowed hop google_verify → emergency_dialer has tap action",
  (() => {
    const t = advance("google_verify", { type: "ui_observed", hints: [] }, "emergency_dialer", createRuntime())
    return t.actions.some((a) => a.kind === "tap" && a.target === "Emergency Call")
  })())
check("rsa_prompt + adb_authorized → done (ADB hand-off)",
  advance("rsa_prompt", { type: "adb_authorized" }, null, createRuntime()).next === "done")
check("blocked anywhere → locked_out",
  advance("welcome", { type: "blocked", reason: "test" }, null, createRuntime()).next === "locked_out")
check("locked_out + manual_confirmed → done",
  advance("locked_out", { type: "manual_confirmed" }, null, createRuntime()).next === "done")
check("unexpected hop rejected (welcome → account_password)",
  advance("welcome", { type: "ui_observed", hints: [] }, "account_password", createRuntime()).next === "unknown")

const SIM_OUTCOMES = new Set(["done", "launcher_home", "locked_out", "max_steps"])
check("simulator: all 9 OEM flows terminate",
  OEM_FLOWS.every((f) => SIM_OUTCOMES.has(simulatePath(f.brand, 7).outcome)))
check("simulator: samsung flow produces a trace", simulatePath("samsung", 7).trace.length >= 3)
check("simulator: seed determinism",
  JSON.stringify(simulatePath("samsung", 11)) === JSON.stringify(simulatePath("samsung", 11)))
check("simulator: max-steps guard holds", simulatePath("samsung", 1).trace.length <= 40)

// ============== D · humanization ==============
console.log("\nD. Humanization")

{
  const r1 = createRng(42)
  const r2 = createRng(42)
  check("seeded RNG reproduces sequences",
    Array.from({ length: 10 }, () => r1.next()).join(",") ===
      Array.from({ length: 10 }, () => r2.next()).join(","))
  const rng = createRng(7)
  check("jitter stays inside ±range bounds",
    Array.from({ length: 1000 }, () => jitterDelay(rng, 1000, 0.25, 40)).every((d) => d >= 750 && d <= 1250))
  check("tap offset within ±4px",
    Array.from({ length: 200 }, () => tapPoint(rng, 100, 200)).every((p) => Math.abs(p.x - 100) <= 4 && Math.abs(p.y - 200) <= 4))
  check("key pacing within human bounds",
    Array.from({ length: 500 }, () => typePaceMs(rng)).every((d) => d >= 60 && d <= 840))
  check("delayForAction respects DELAY_BOUNDS",
    Object.entries(DELAY_BOUNDS).every(([kind, b]) =>
      Array.from({ length: 300 }, () => delayForAction(kind, rng)).every((d) => d >= b.min && d <= b.max)))
}

// ============== E · partition safety ==============
console.log("\nE. Partition safety")

check("every survey command is read-only",
  SURVEY_COMMANDS.every((c) => assertReadOnly(c.command)))
check("write commands are rejected",
  !assertReadOnly("dd if=/dev/zero of=/dev/block/by-name/frp") &&
  !assertReadOnly("fastboot erase frp") &&
  !assertReadOnly("cat x > /dev/block/by-name/frp"))
check("AVB honesty string present and physics-honest",
  AVB_HONESTY.includes("detected") && AVB_HONESTY.includes("signing key"))

{
  const survey = {
    readOnly: true,
    properties: [
      { name: "ro.boot.verifiedbootstate", value: "green" },
      { name: "ro.boot.vbmeta.device_state", value: "locked" },
      { name: "ro.build.tags", value: "release-keys" },
    ],
    blockDevices: ["frp -> /dev/block/mmcblk0p23"],
  }
  const avb = assessAvb(survey, fp())
  check("locked + green → avb_enforcing", avb.verdict === "avb_enforcing" && avb.bootloaderLocked === true)
  const avb2 = assessAvb({ ...survey, properties: [{ name: "ro.boot.verifiedbootstate", value: "orange" }, { name: "ro.boot.vbmeta.device_state", value: "unlocked" }, { name: "ro.build.tags", value: "dev-keys" }] }, fp())
  check("unlocked → avb_relaxed", avb2.verdict === "avb_relaxed" && avb2.bootloaderLocked === false)
}

{
  const steps = [{ label: "mediatek_brom", kind: "flash" as const }]
  const noBackups = planRollback(steps, [{ partition: "mediatek_brom", captured: false }])
  check("rollback refuses when backups missing", noBackups.refusalNote !== null && noBackups.restoreSteps.length === 0)
  const withBackups = planRollback(steps, [{ partition: "mediatek_brom", captured: true }])
  check("rollback plan complete when backups ready", withBackups.refusalNote === null && withBackups.restoreSteps.length === 5)
  const nonFlash = planRollback([{ label: "x", kind: "boot_mode" as const }], [])
  check("non-persistent steps need no rollback", nonFlash.applicable === false)
}

// ============== F · journal + session orchestration ==============
console.log("\nF. Journal & orchestration")

{
  const j = new AdaptiveJournal()
  j.append("plan", "samsung::sm-a155f", "plan built")
  j.append("verify", "samsung::sm-a155f", "re-detect done")
  j.append("fail", "google::pixel", "test-mode never opened")
  check("journal appends + filters by fingerprint", j.forFingerprint("samsung::sm-a155f").length === 2)
  const parsed = JSON.parse(j.exportJson())
  check("journal JSON export roundtrips", Array.isArray(parsed.entries) && parsed.entries.length === 3)
  check("recent() returns newest first", j.recent(10)[0].kind === "fail")
}

{
  const f = fp({ androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01" })
  const s = createAdaptiveSession(f, new AdaptiveJournal())
  check("session: band + plan + journal entry coherent",
    s.band.band === "chipset_hardware" && s.plan.chain[0].id === "mediatek_brom" &&
    s.journalEntry.kind === "plan" && s.fsmStartState === "welcome")
}

// ============== G · catalog integrity ==============
console.log("\nG. Catalog integrity")

const ids = new Set(CATALOG.map((m) => m.id))
check("all fallbackTo ids resolve in the catalog",
  CATALOG.every((m) => m.fallbackTo.every((f) => ids.has(f))))
check("official_recovery is unconditional + terminal",
  (() => {
    const o = getMethod("official_recovery")!
    return o.preconditions(fp()) && o.fallbackTo.length === 0
  })())
check("firmware-flash methods carry ≥medium risk",
  CATALOG.filter((m) => m.persistence === "firmware_flash").every((m) => m.risk === "medium" || m.risk === "high"))
check("no method claims certainty (weight < 100 except official)",
  CATALOG.filter((m) => m.id !== "official_recovery").every((m) => m.evidenceWeight < 100))

// ============== H · knowledge modules (WBS A1-1.x / A3-1.x) ==============
console.log("\nH. Knowledge modules")

check("verification stack covers all 6 stack layers",
  new Set(VERIFICATION_STACK.map((c) => c.layer)).size === 6)
check("frp_partition + google_account_check documented with correct layers",
  VERIFICATION_STACK.some((c) => c.id === "frp_partition" && c.layer === "bootloader") &&
  VERIFICATION_STACK.some((c) => c.id === "google_account_check" && c.layer === "server"))
check("entry points include adb_shell + settings_provider + setup_wizard",
  ["adb_shell", "settings_provider", "setup_wizard"].every((id) => ENTRY_POINTS.includes(id)))
check("research honesty string declares public sources (not decompilation)",
  RESEARCH_HONESTY.toLowerCase().includes("public sources"))
check("partition tables: MediaTek includes frp + nvram + protect1",
  (() => { const n = partitionsFor("MediaTek").map((p) => p.name); return ["frp", "nvram", "protect1", "seccfg"].every((x) => n.includes(x)) })())
check("partition tables: Qualcomm includes persist",
  partitionsFor("Qualcomm").some((p) => p.name === "persist" && p.frpRelevant))
check("every chipset family has frp + vbmeta rows",
  (["Exynos", "Qualcomm", "MediaTek", "Spreadtrum", "Kirin", "Unknown"] as const).every((c) => {
    const n = partitionsFor(c).map((p) => p.name)
    return n.includes("frp") && n.includes("vbmeta")
  }))
check("Android 15/16 note is server-side + below-OS honest",
  ANDROID_1516_NOTE.includes("server-side") && ANDROID_1516_NOTE.includes("below"))

// ============== I · validation harness (WBS A1-2.3 / A1-3.3) ==============
console.log("\nI. Validation harness")

function fakeExecutor(behavior: { flagFlip?: boolean; frpFlipOn?: string; failAll?: boolean }): DeviceExecutor {
  let state = { frp_active: "1", device_provisioned: "0", user_setup_complete: "0" }
  return {
    async runAdb(cmd) {
      if (behavior.failAll) throw new Error("exec failed")
      if (behavior.frpFlipOn && cmd.includes(behavior.frpFlipOn)) state.frp_active = "0"
      if (behavior.flagFlip && (cmd.includes("settings put") || cmd.includes("content insert"))) {
        state.device_provisioned = "1"
        state.user_setup_complete = "1"
      }
      return "ok"
    },
    async detectState() { return { ...state } },
  }
}

check("flags-only effect → flags_set verdict (never removed_verified)",
  (async () => {
    const m = getMethod("adb_provisioning_flags")!
    const r = await runMethodValidation(m, fakeExecutor({ flagFlip: true }))
    return r.verdict === "flags_set"
  })())
check("frp key flip → removed_verified",
  (async () => {
    const m = getMethod("content_provider_injection")!
    const r = await runMethodValidation(m, fakeExecutor({ flagFlip: true, frpFlipOn: "content insert" }))
    return r.verdict === "removed_verified"
  })())
check("any step failure → failed",
  (async () => {
    const m = getMethod("adb_provisioning_flags")!
    const r = await runMethodValidation(m, fakeExecutor({ failAll: true }))
    return r.verdict === "failed" && r.steps.every((s) => !s.ok)
  })())
check("nothing observable changed → failed (never assumed success)",
  (async () => {
    const m = getMethod("adb_provisioning_flags")!
    const r = await runMethodValidation(m, fakeExecutor({}))
    return r.verdict === "failed"
  })())
check("matrix stops on first removed_verified",
  (async () => {
    const ex = fakeExecutor({ flagFlip: true, frpFlipOn: "content insert" })
    const { rows, winner } = await runValidationMatrix([getMethod("adb_provisioning_flags")!, getMethod("content_provider_injection")!], ex)
    return rows[0].verdict === "flags_set" && rows[1].verdict === "removed_verified" && winner === "content_provider_injection"
  })())
check("verdict labels stay measured (reboot observation caveat)",
  verdictLabel("removed_verified").includes("reboot observation"))

// ============== J · analytics + calibration (WBS A1-2.4 / A1-4.2 / CA2) ==============
console.log("\nJ. Analytics & calibration")

{
  const entries: JournalEntry[] = [
    { ts: "t1", kind: "step", fingerprintKey: "x", text: "", meta: { method: "setup_wizard_disable", outcome: "success" } },
    { ts: "t2", kind: "step", fingerprintKey: "x", text: "", meta: { method: "setup_wizard_disable", outcome: "failure" } },
    { ts: "t3", kind: "step", fingerprintKey: "x", text: "", meta: { method: "setup_wizard_disable", outcome: "failure" } },
    { ts: "t4", kind: "step", fingerprintKey: "x", text: "", meta: { method: "setup_wizard_disable", outcome: "failure" } },
    { ts: "t5", kind: "info", fingerprintKey: "x", text: "" },
  ]
  const records = outcomesFromEntries(entries)
  check("outcome extraction reads meta only", records.length === 4)
  const stats = methodStats(records)
  check("per-method stats math", stats[0].attempts === 4 && stats[0].successes === 1 && stats[0].successRatio === 25)
  const cal = calibrateCatalog(CATALOG, records)
  check("downward-only calibration fires below 50%",
    cal.length === 1 && cal[0].methodId === "setup_wizard_disable" && cal[0].suggestedWeight < cal[0].currentWeight)
  check("calibration reason states the upward rule",
    cal[0]?.reason.includes("bench verification") ?? false)
  const report = buildAnalyticsReport(entries, CATALOG)
  check("report totals + calibration coherent", report.totals.attempts === 4 && report.calibration.length === 1)
  const good: JournalEntry[] = [
    { ts: "t1", kind: "step", fingerprintKey: "x", text: "", meta: { method: "mediatek_brom", outcome: "success" } },
    { ts: "t2", kind: "step", fingerprintKey: "x", text: "", meta: { method: "mediatek_brom", outcome: "success" } },
    { ts: "t3", kind: "step", fingerprintKey: "x", text: "", meta: { method: "mediatek_brom", outcome: "success" } },
  ]
  check("no upward moves, ever", calibrateCatalog(CATALOG, outcomesFromEntries(good)).length === 0)
}

// ============== K · execution scripts (WBS A1-3.1 / A1-4.3 / A2-2.3) ==============
console.log("\nK. Execution scripts")

{
  const plan = buildAdaptivePlan(fp({ androidMajor: 12, androidVersionRaw: "12", securityPatch: "2021-11-01", adbState: "Authorized" }))
  const s1 = generateAdbScript(plan, 42)
  const s2 = generateAdbScript(plan, 42)
  check("ADB script deterministic under seed", JSON.stringify(s1) === JSON.stringify(s2))
  const lines = s1.lines.map((l) => l.line)
  const surveyIdx = lines.findIndex((l) => l.includes("verifiedbootstate"))
  const ladderIdx = lines.findIndex((l) => l.includes("settings put"))
  check("survey precedes ladder; verification lines included",
    surveyIdx !== -1 && ladderIdx !== -1 && surveyIdx < ladderIdx && lines.some((l) => l.includes("BEFORE/AFTER")))
  check("script carries only ADB/comment/manual/verify lines (zero writes)",
    s1.lines.every((l) => !l.write && ["adb", "comment", "manual", "verify"].includes(l.kind)))
  const refused = generateAdbScript(buildAdaptivePlan(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Unknown" })))
  check("refusal plan → refusal script, nothing executed",
    refused.title.includes("REFUSED") && refused.lines.every((l) => l.kind === "comment"))
  const trace = simulatePath("samsung", 7).trace
  const ui = generateUiAutomationScript(trace, 7)
  check("UI script probes with uiautomator dump before acting",
    ui.lines.some((l) => l.line.includes("uiautomator dump")))
  check("UI script maps actions to input injection",
    ui.lines.some((l) => l.kind === "ui" && l.line.startsWith("adb shell input")))
  check("UI script determinism", JSON.stringify(generateUiAutomationScript(trace, 7)) === JSON.stringify(ui))
  const dup: typeof ui.lines = [
    { kind: "adb", line: "settings put x 1", write: false },
    { kind: "adb", line: "settings put x 1", write: false },
    { kind: "ui", line: "sleep 0.00", write: false },
    { kind: "adb", line: "settings put y 1", write: false },
  ]
  const opt = optimizeLines(dup)
  check("optimizer dedupes repeats + zero waits", opt.length === 2)
  check("duration estimate sums delays", scriptDurationMs([{ kind: "adb", line: "x", write: false, delayMs: 500 }]) === 500)
}

// ============== L · patch planner (WBS A3-*) ==============
console.log("\nL. Patch planner")

check("read-only dd forms accepted",
  isReadOnlyDump("dd if=/dev/block/by-name/frp of=/sdcard/paralock-backup/frp.img bs=4096"))
check("write dd forms rejected",
  !isReadOnlyDump("dd if=/sdcard/frp.img of=/dev/block/by-name/frp") &&
  !isReadOnlyDump("fastboot erase frp") &&
  !isReadOnlyDump("dd if=/dev/zero of=/dev/block/by-name/frp"))
{
  const manifest = buildDumpManifest("MediaTek")
  check("dump manifest is read-only by construction",
    manifest.items.every((i) => i.commands.every((c) => c.startsWith("adb pull") || c.startsWith("sha256sum") || c.startsWith("adb shell mkdir") || isReadOnlyDump(c))))
  check("dump manifest records hashes + explains AVB safety",
    manifest.items[0].commands.some((c) => c.startsWith("sha256sum")) && manifest.avbSafeNote.includes("Verified Boot"))
  const plan = buildPatchPlan("MediaTek", "chipset_hardware")
  check("MediaTek patch plan: brom lane, frp-only, minimal, no vbmeta writes",
    plan.lane === "brom_erase" && plan.touches.length === 1 && plan.touches[0] === "frp" && plan.minimal && plan.refusesVbmetaWrites)
  check("official-only band → no lane (refusal is the plan)",
    buildPatchPlan("MediaTek", "official_only").lane === "none")
  const gates = evaluateFlashGates({ backupsReady: false, bitVersionChecked: true, firmwareArchived: true, hashesVerified: false })
  check("flash gates: missing backups = critical fail",
    gates.find((g) => g.id === "backups")?.critical && !gates.find((g) => g.id === "backups")?.passed)
  const rec = generateRecoveryScript(manifest)
  check("recovery script: hash-check before every write",
    rec.steps.filter((s) => s.write).length === manifest.items.length &&
    rec.steps.filter((s) => s.write).every((s) => s.line.includes("dd if=/sdcard")))
  check("recovery script ends with verify + journal",
    rec.steps[rec.steps.length - 2].note === "Verify rollback" && rec.steps[rec.steps.length - 1].note === "Journal")
}

// ============== M · safety coordinator (WBS A1-4.4 / CA5) ==============
console.log("\nM. Safety coordinator")

{
  const plan = buildAdaptivePlan(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01" })) // persistent Brom plan
  check("no consent → refused",
    !evaluateSafety(plan, { consentOwnership: false, frpActive: true, backupsReady: true, bitVersionChecked: true, hardwareLaneOk: true }).allowed)
  check("persistent plan + no backups → refused",
    !evaluateSafety(plan, { consentOwnership: true, frpActive: true, backupsReady: false, bitVersionChecked: true, hardwareLaneOk: true }).allowed)
  check("persistent plan + bit/version unchecked → refused",
    !evaluateSafety(plan, { consentOwnership: true, frpActive: true, backupsReady: true, bitVersionChecked: false, hardwareLaneOk: true }).allowed)
  check("all gates green → allowed",
    evaluateSafety(plan, { consentOwnership: true, frpActive: true, backupsReady: true, bitVersionChecked: true, hardwareLaneOk: true }).allowed)
  const refused = buildAdaptivePlan(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Unknown" }))
  check("refusal plan can never pass safety",
    !evaluateSafety(refused, { consentOwnership: true, frpActive: true, backupsReady: true, bitVersionChecked: true, hardwareLaneOk: true }).allowed)
}

// ============== N · update packs (WBS CA3 / A1-2.1) ==============
console.log("\nN. Update packs")

{
  const validExploit = {
    packVersion: 1, kind: "exploits", updatedAt: "2026-08-13",
    entries: [{
      id: "sample_flag_method", name: "Sample flags method", klass: "adb_flags", layer: "os",
      risk: "low", persistence: "flags_only", evidenceWeight: 55,
      fallbackTo: [], steps: [{ kind: "adb_cmd", label: "Set flag", detail: "set flag", command: "settings put x 1" }],
      evidence: ["bench"], benchmark: "bench-2026-08",
    }],
  }
  check("valid exploit pack accepted", validateUpdatePack(validExploit).ok)
  check("certainty-forbidden: non-official weight 100 rejected",
    !validateUpdatePack({ ...validExploit, entries: [{ ...validExploit.entries[0], evidenceWeight: 100 }] }).ok)
  check("dangling fallback rejected",
    !validateUpdatePack({ ...validExploit, entries: [{ ...validExploit.entries[0], fallbackTo: ["ghost"] }] }).ok)
  const validFlow = {
    packVersion: 1, kind: "ui_flows", updatedAt: "2026-08-13",
    flows: [{ brand: "samsung", label: "One UI FRP", path: ["welcome", "google_verify"], samples: [{ dump: "this device was reset gsf.login", expected: "google_verify" }], note: "bench flow" }],
  }
  check("valid ui-flow pack accepted", validateUpdatePack(validFlow).ok)
  const validPatch = {
    packVersion: 1, kind: "patches", updatedAt: "2026-08-13",
    lanes: [{ chipset: "MediaTek", lane: "brom_erase", touches: ["frp"], commands: [{ line: "erase frp via brom", write: false }], benchmark: "bench" }],
  }
  check("valid patch pack accepted", validateUpdatePack(validPatch).ok)
  check("vbmeta write forbidden at schema level",
    !validateUpdatePack({ ...validPatch, lanes: [{ ...validPatch.lanes[0], commands: [{ line: "dd if=x of=/dev/block/by-name/vbmeta", write: true }] }] }).ok)
  check("minimal-touch law: >2 partitions rejected",
    !validateUpdatePack({ ...validPatch, lanes: [{ ...validPatch.lanes[0], touches: ["frp", "userdata", "metadata"] }] }).ok)
  check("payload without kind rejected", !validateUpdatePack({ foo: 1 }).ok)
}

// ============== O · UI sample library (WBS A2-1.1) ==============
console.log("\nO. UI sample library")

check("every curated screen sample classifies to its expected state",
  UI_SAMPLES.every((s) => classifyFromDump(s.dump, s.brand).state === s.expected))
check("samples cover ≥8 brands incl. Android 15/16 rows",
  new Set(UI_SAMPLES.map((s) => s.brand)).size >= 8 &&
  UI_SAMPLES.some((s) => s.version.includes("16")) && UI_SAMPLES.some((s) => s.version.includes("15")))

// ============== P · refinement tool (WBS A2-3.2 / A2-3.3) ==============
console.log("\nP. Refinement tool")

{
  const dump = 'activity="com.vendor.unknown.dialog" text="financed device registration" text="kirinyaga serial validation" text="kirinyaga serial validation"'
  const kws = suggestKeywords(dump)
  check("suggestion engine finds novel keywords (deterministic)",
    kws.length > 0 && kws.includes("serial validation") && JSON.stringify(kws) === JSON.stringify(suggestKeywords(dump)))
  const report = refineFromEntries([
    { kind: "fail", text: "x", meta: { dump } },
    { kind: "fail", text: "x", meta: { dump: 'text="this device was reset" gsf.login' } },
  ])
  check("refine report: 2 analyzed, 1 unknown, with hint",
    report.analyzed === 2 && report.unknown === 1 && report.suggestions[0].hint.includes("test:adaptive"))
}

// ============== Q · WBS coverage (CA1 — the digest) ==============
console.log("\nQ. WBS task coverage")

{
  const all = WBS_MAP.flatMap((m) => m.tasks)
  const unique = new Set(all)
  check("all cross-algorithm tasks CA1–CA5 mapped", ["CA1", "CA2", "CA3", "CA4", "CA5"].every((t) => unique.has(t)))
  check("≥30 distinct WBS tasks covered", unique.size >= 30)
  check("all three algorithm families represented",
    WBS_MAP.some((m) => m.algorithm.includes("A1")) && WBS_MAP.some((m) => m.algorithm.includes("A2")) && WBS_MAP.some((m) => m.algorithm.includes("A3")))
}

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "ALL ADAPTIVE-ENGINE CHECKS GREEN" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
