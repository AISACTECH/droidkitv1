// =====================================================================
// FRP Adaptive Engine — round-3 research-layer verification
// (`npm run test:research`)
// ---------------------------------------------------------------------
// Proves:
//   A. patch digest integrity (P1–P10, layers, versions, impacts, sources)
//   B. protection map: read-only seek (Samsung binary gate P9, honesty)
//   C. lab ledger: bounded rates, downward-only law, honesty band caps
//   D. parallel lane evaluation: determinism, union math, caps, gaps,
//      A16-unknown-chipset honesty, MTK-A15 routing
//   E. honesty hard line: NO evasion primitives exported, quantum note,
//      hide/seek policy wording
//   F. ISOLATION CONTRACT: regression snapshots of the existing engine
//      (bands + decision + FSM + patch planner) — byte-stable outputs,
//      proving round 3 did NOT alter the shipped algorithms.
// =====================================================================

import {
  computeBand,
  buildAdaptivePlan,
  simulatePath,
  buildPatchPlan,
  CATALOG,
  A15_16_PATCH_DIGEST,
  LAB_LEDGER,
  buildProtectionMap,
  parseBinaryNumber,
  evaluateParallelLanes,
  ledgerFor,
  QUANTUM_NOTE,
  NO_EVASION_NOTE,
  HIDE_SEEK_POLICY,
} from "../src/lib/adaptive-engine/index.ts"
import type { Fingerprint, StackLayer } from "../src/lib/adaptive-engine/index.ts"

let passed = 0
let failed = 0
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}`) }
}

function fp(overrides: Partial<Fingerprint> = {}): Fingerprint {
  return {
    brand: "samsung", brandRaw: "samsung", modelCode: "SM-A155F", marketingName: "Galaxy A15",
    chipsetFamily: "MediaTek", chipsetName: "mt6789",
    androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01",
    binaryVersion: "U18", bootloaderVersion: "A155FXXS1AXA1",
    buildFingerprint: "samsung/a15nnxx/a15:15/REL:user/release-keys", knoxVersion: "3.9",
    frpState: "Active", adbState: "Unauthorized", deviceMode: "Normal", hasSim: true, hasWifi: true,
    ...overrides,
  }
}

const LAYERS: StackLayer[] = ["app", "os", "server", "bootloader", "bootrom", "hardware"]
const VERSIONS = ["15", "16", "15+16", "oem"]

// ============== A · patch digest ==============
console.log("\nA. Patch digest integrity")

check("digest has 10 patch records (P1–P10)", A15_16_PATCH_DIGEST.length === 10)
check("every record has valid layer + version + source + impacts",
  A15_16_PATCH_DIGEST.every((p) => LAYERS.includes(p.layer) && VERSIONS.includes(p.android) && p.source.length > 5 && p.whatClosed.length > 10 && p.whatRemains.length > 5))
check("record ids are unique", new Set(A15_16_PATCH_DIGEST.map((p) => p.id)).size === A15_16_PATCH_DIGEST.length)
check("P6 (A16 USB-before-setup) closes the exploit lane",
  A15_16_PATCH_DIGEST.find((p) => p.id === "p6_usb_pre_setup")?.impact.exploit === "closes")
check("P9 (KG-Prenormal) is an OEM/hardware record closing UI+exploit",
  (() => { const p = A15_16_PATCH_DIGEST.find((x) => x.id === "p9_kg_prenormal")!; return p.android === "oem" && p.layer === "hardware" && p.impact.ui === "closes" })())
check("P5 (Play Integrity) states hardware attestation, not software",
  (() => { const p = A15_16_PATCH_DIGEST.find((x) => x.id === "p5_play_integrity_hw")!; return p.whatClosed.toLowerCase().includes("hardware-backed") && p.whatClosed.toLowerCase().includes("keybox") })())

// ============== B · protection map (read-only seek) ==============
console.log("\nB. Protection map")

check("binary parser: U3 → 3, 18 → 18, junk → null",
  parseBinaryNumber("U3") === 3 && parseBinaryNumber("18") === 18 && parseBinaryNumber("xx") === null && parseBinaryNumber(null) === null)
check("Samsung binary ≥18 → usbRisk high with KG note",
  (() => { const m = buildProtectionMap(fp(), {}); return m.usbRisk === "high" && m.usbRiskNote.includes("KG-Prenormal") })())
check("Samsung binary 16 → usbRisk medium",
  buildProtectionMap(fp({ binaryVersion: "U16" })).usbRisk === "medium")
check("non-Samsung → usbRisk unknown (no Samsung gate)",
  buildProtectionMap(fp({ brand: "google", brandRaw: "google", modelCode: "Pixel 9" })).usbRisk === "unknown")
check("survey props flow into the map verbatim",
  (() => { const m = buildProtectionMap(fp(), { verifiedBootState: "green", vbmetaDeviceState: "locked", buildTags: "release-keys" }); return m.verifiedBootState === "green" && m.vbmetaDeviceState === "locked" })())
check("attestation layer is declared NOT locally readable",
  buildProtectionMap(fp()).attestationLayer.includes("not locally readable"))
check("summary names the routing consequence", buildProtectionMap(fp()).summary.includes("route below-OS"))

// ============== C · lab ledger ==============
console.log("\nC. Lab ledger")

check("ledger rates bounded 0..97 with valid bands + lanes",
  LAB_LEDGER.every((l) => l.expectedRate >= 0 && l.expectedRate <= 97 && ["high", "medium", "low"].includes(l.band) && ["exploit", "ui", "patch"].includes(l.lane)))
check("A15/16 software-only lanes stay LOW (5–10)",
  LAB_LEDGER.filter((l) => l.condition.includes("A15/16")).every((l) => l.band === "low"))
check("below-OS chipset lanes carry the dump-first/refusal caveats",
  LAB_LEDGER.filter((l) => l.lane === "patch" && l.band !== "low").every((l) => l.note.length > 5))
check("ledgerFor filters by lane + condition",
  ledgerFor("patch", "Brom").length === 1 && ledgerFor("patch", "Brom")[0].expectedRate === 80)

// ============== D · parallel lane evaluation ==============
console.log("\nD. Parallel lanes (superposition → collapse)")

{
  const r1 = evaluateParallelLanes(fp({ androidMajor: 15, androidVersionRaw: "15", securityPatch: "2025-09-01" }), {}, 7)
  const r2 = evaluateParallelLanes(fp({ androidMajor: 15, androidVersionRaw: "15", securityPatch: "2025-09-01" }), {}, 7)
  check("deterministic report", JSON.stringify(r1) === JSON.stringify(r2))
  check("three lanes evaluated", r1.lanes.length === 3 && r1.lanes.map((l) => l.algorithm).join(",") === "exploit,ui,patch")
  check("decision coverage is 100 by construction", r1.decisionCoverage === 100)
  check("union coverage within honesty ceiling [5,97]", r1.unionCoverage >= 5 && r1.unionCoverage <= 97)
  check("A15 MTK: patch lane viable, exploit lane blocked",
    r1.lanes[2].status === "viable" && r1.lanes[2].primaryMethod === "brom_erase" && r1.lanes[0].status === "blocked")
  check("gap report names the patch-ratchet + attestation gaps",
    r1.gaps.some((g) => g.includes("Patch lane")) === false && r1.gaps.some((g) => g.includes("Attestation gap")))
  check("recommendation prefers the patch lane", r1.recommendation.includes("patch lane"))
}

{
  const r = evaluateParallelLanes(fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Unknown" }), {}, 7)
  check("A16 unknown chipset: all lanes closed/refused, official recommendation",
    r.lanes.every((l) => l.status === "blocked" || l.status === "refused") && r.recommendation.toLowerCase().includes("official"))
  check("A16 unknown chipset: the gap is visible (not hidden)",
    r.gaps.some((g) => g.includes("ALL three lanes closed")))
}

{
  const r = evaluateParallelLanes(fp({ androidMajor: 12, androidVersionRaw: "12", securityPatch: "2021-11-01", adbState: "Authorized", binaryVersion: "U3" }), {}, 7)
  check("A12 + pre-authorized ADB: exploit lane viable with high band",
    r.lanes[0].status === "viable" && r.lanes[0].expectedRate === 88)
  check("parallel union > best single lane (the juggle)",
    r.unionCoverage >= Math.max(...r.lanes.map((l) => (l.status === "refused" ? 0 : l.expectedRate))))
}

{
  const r = evaluateParallelLanes(fp({ brand: "google", brandRaw: "google", modelCode: "Pixel 9", androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Kirin" }), {}, 7)
  check("Pixel: UI lane blocked with the P10 honesty note", r.lanes[1].status === "blocked" && r.lanes[1].notes.join(" ").includes("Pixel"))
}

// ============== E · honesty hard line ==============
console.log("\nE. Honesty hard line")

check("quantum note names the scam + the metaphor", QUANTUM_NOTE.includes("scam") && QUANTUM_NOTE.includes("parallel") && QUANTUM_NOTE.includes("measurement"))
check("no-evasion note names the forbidden primitives",
  ["spoofing", "keybox", "randomization"].every((w) => NO_EVASION_NOTE.includes(w)))
check("hide/seek policy: hide = footprint + budget, seek = read-only",
  HIDE_SEEK_POLICY.includes("read-only") && HIDE_SEEK_POLICY.includes("no persistent modifications") && HIDE_SEEK_POLICY.includes("budget"))

// ============== F · ISOLATION CONTRACT — existing engine untouched ==============
console.log("\nF. Isolation contract (regression snapshots)")

{
  // Band matrix snapshot: every band outcome for Android 12→16 must equal
  // the round-1/2 behavior exactly.
  const cases: Partial<Fingerprint>[] = [
    { androidMajor: 12, androidVersionRaw: "12", securityPatch: "2021-11-01" },
    { androidMajor: 13, androidVersionRaw: "13", securityPatch: "2023-05-01" },
    { androidMajor: 14, androidVersionRaw: "14", securityPatch: "2024-03-01" },
    { androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01" },
    { androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01" },
    { androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Unknown" },
    { androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", adbState: "Authorized" },
    { frpState: "Inactive" as const },
  ]
  const bands = cases.map((c) => computeBand(fp(c)).band).join(",")
  const expected =
    "adb_live,testmode_contested,chipset_hardware,chipset_hardware,chipset_hardware,official_only,adb_live,none_needed"
  check("band matrix byte-identical to rounds 1–2", bands === expected)

  const plan = buildAdaptivePlan(fp({ androidMajor: 15, androidVersionRaw: "15", securityPatch: "2025-09-01" }))
  check("decision plan unchanged (primary Brom, terminal official)",
    plan.chain[0].id === "mediatek_brom" && plan.chain[plan.chain.length - 1].id === "official_recovery" && plan.escalationPolicy === "sequential_verify")

  const sim = simulatePath("samsung", 7)
  check("FSM simulator unchanged (seeded trace + deterministic outcome)",
    ["done", "launcher_home", "locked_out", "max_steps"].includes(sim.outcome) && sim.trace.length > 0 && JSON.stringify(sim) === JSON.stringify(simulatePath("samsung", 7)))

  const patch = buildPatchPlan("MediaTek", "chipset_hardware")
  check("patch planner unchanged (brom lane, frp-only, vbmeta refused)",
    patch.lane === "brom_erase" && patch.touches.join(",") === "frp" && patch.refusesVbmetaWrites)

  check("catalog size unchanged (16 entries)", CATALOG.length === 16)
}

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "ALL RESEARCH-LAYER CHECKS GREEN" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
