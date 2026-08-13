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
} from "../src/lib/adaptive-engine/index.ts"
import type { Fingerprint, FsmEvent, FsmStateId } from "../src/lib/adaptive-engine/index.ts"

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

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "ALL ADAPTIVE-ENGINE CHECKS GREEN" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
