// =====================================================================
// Bench desk verification (`npm run test:bench`)
// --------------------------------------------------------------------
// Proves the software half of hardware validation:
//   A. virtual-donor corpus covers the FRP_STRETCH deviceIds
//   B. engine replay: band + primary match every donor
//   C. getprop parser: dump → same chipset family + same band
//   D. ingest schema + sentence parser
//   E. promotion law (1=shop-note, 3=PR, reject/low-attempts/not-donor)
//   F. officialFlipAllowed is ALWAYS false
//   G. virtual-replay records never promote
//   H. honesty: no unlock claim, no evasion primitive
// =====================================================================

import { FRP_STRETCH } from "../src/lib/adaptive-engine/advance.ts"
import {
  VIRTUAL_DONORS,
  replayAllDonors,
  replayDonorFromDump,
  fingerprintFromGetprop,
  guessChipsetFamily,
  ingestBenchLog,
  proposePromotions,
  BENCH_KIND,
  BENCH_VERSION,
  SOFTWARE_ONLY_HONESTY,
  type BenchRecord,
} from "../src/lib/bench/index.ts"

let passed = 0
let failed = 0
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}`) }
}

function rec(partial: Partial<BenchRecord> & Pick<BenchRecord, "deviceId" | "result" | "attemptsBefore" | "donorOwned">): BenchRecord {
  return {
    id: partial.id ?? `t-${partial.deviceId}-${partial.result}`,
    domain: "frp",
    model: partial.deviceId,
    brand: "samsung",
    androidMajor: 15,
    securityPatch: "2025-09-01",
    chipsetFamily: "MediaTek",
    methodId: "mediatek_brom",
    date: "2026-08-13",
    operatorNote: "test",
    source: "structured",
    ...partial,
  }
}

console.log("\nA. Virtual-donor corpus")

check("12 virtual donors (one per FRP_STRETCH row)", VIRTUAL_DONORS.length === 12)
check("every FRP_STRETCH deviceId has a virtual donor",
  FRP_STRETCH.every((s) => VIRTUAL_DONORS.some((d) => d.deviceId === s.deviceId)))
check("deviceIds unique", new Set(VIRTUAL_DONORS.map((d) => d.deviceId)).size === VIRTUAL_DONORS.length)
check("every donor has a getprop dump + blocker + expected band",
  VIRTUAL_DONORS.every((d) => d.getpropDump.includes("ro.product.brand") && d.blocker.length > 5 && d.expectedBand.length > 0))
check("A15/16 majority (honest corpus, not legacy-padded)",
  VIRTUAL_DONORS.filter((d) => (d.fingerprint.androidMajor ?? 0) >= 15).length >= 6)

console.log("\nB. Engine replay (routing, not unlock)")

{
  const rows = replayAllDonors()
  check("replay returns one row per donor", rows.length === VIRTUAL_DONORS.length)
  const misses = rows.filter((r) => !r.bandMatch || !r.primaryMatch)
  if (misses.length) {
    for (const m of misses) console.log(`     miss ${m.deviceId}: band=${m.band} primary=${m.primary}`)
  }
  check("every donor band matches the engine", rows.every((r) => r.bandMatch))
  check("every donor primary matches the engine", rows.every((r) => r.primaryMatch))
  check("decision coverage is 100 on every replay", rows.every((r) => r.decisionCoverage === 100))
  check("union coverage stays inside the honesty ceiling", rows.every((r) => r.unionCoverage >= 0 && r.unionCoverage <= 97))
  check("Pixel 9 is official_only (server physics)",
    rows.find((r) => r.deviceId === "google-pixel9")?.band === "official_only")
  check("A15 MTK A15 primary is mediatek_brom",
    rows.find((r) => r.deviceId === "samsung-a15")?.primary === "mediatek_brom")
  check("honesty string refuses a software-only A15/16 claim",
    SOFTWARE_ONLY_HONESTY.includes("0%") && SOFTWARE_ONLY_HONESTY.toLowerCase().includes("routing"))
}

console.log("\nC. getprop parser")

{
  const chip = guessChipsetFamily({ "ro.hardware": "mt6789" })
  check("mt6789 → MediaTek", chip === "MediaTek")
  check("sm8750 → Qualcomm", guessChipsetFamily({ "ro.board.platform": "sm8750" }) === "Qualcomm")
  check("exynos1330 → Exynos", guessChipsetFamily({ "ro.hardware": "exynos1330" }) === "Exynos")
  check("ums9230 → Spreadtrum", guessChipsetFamily({ "ro.hardware": "ums9230" }) === "Spreadtrum")
  check("tensor → Unknown (honest; not in the engine enum)", guessChipsetFamily({ "ro.hardware": "tensor" }) === "Unknown")
  const parsed = fingerprintFromGetprop("[ro.product.brand]: [samsung]\n[ro.product.model]: [SM-A155F]\n[ro.build.version.release]: [15]\n[ro.hardware]: [mt6789]")
  check("bracket getprop form parses brand/model/major",
    parsed.fingerprint.brand === "samsung" && parsed.fingerprint.modelCode === "SM-A155F" && parsed.fingerprint.androidMajor === 15)
  check("ADB is NEVER inferred authorized from getprop",
    parsed.fingerprint.adbState === "Unauthorized" && parsed.warnings.some((w) => w.includes("Unauthorized")))
  const eq = fingerprintFromGetprop("ro.product.brand=tecno\nro.product.model=KJ5\nro.build.version.release=15\nro.hardware=mt6769")
  check("key=value getprop form parses", eq.fingerprint.brand === "transsion" && eq.fingerprint.chipsetFamily === "MediaTek")
  const dumpMisses = VIRTUAL_DONORS.filter((d) => {
    const r = replayDonorFromDump(d)
    return !r.bandMatch || !r.chipsetMatch
  })
  if (dumpMisses.length) {
    for (const d of dumpMisses) {
      const r = replayDonorFromDump(d)
      console.log(`     dump miss ${d.deviceId}: bandMatch=${r.bandMatch} chipsetMatch=${r.chipsetMatch}`)
    }
  }
  check("every donor dump replays to the expected band + chipset", dumpMisses.length === 0)
}

console.log("\nD. Ingest schema + sentence parser")

{
  const sentence = "Huawei E5573 — era=v201 — code 12345678 — attempts-before 10 — RESULT accepted — 2026-08-13"
  const s = ingestBenchLog(sentence)
  check("calibration sentence parses", s.ok && s.records.length === 1 && s.records[0].era === "v201" && s.records[0].result === "accepted")
  check("sentence domain is modem-nck", s.records[0]?.domain === "modem-nck")

  const pack = {
    kind: BENCH_KIND,
    version: BENCH_VERSION,
    exportedAt: "2026-08-13T00:00:00.000Z",
    records: [rec({ deviceId: "samsung-a15", result: "accepted", attemptsBefore: 8, donorOwned: true, unitSerialHash: "a".repeat(64) })],
  }
  const p = ingestBenchLog(pack)
  check("structured pack accepted", p.ok && p.records.length === 1)

  const bad = ingestBenchLog({ kind: BENCH_KIND, version: 99, exportedAt: "x", records: [] })
  check("wrong version rejected", !bad.ok && bad.errors.length > 0)

  const oracle = ingestBenchLog({
    kind: "patch-oracle-bench-log",
    bench_notes: [{ ts: "t", text: sentence }],
  })
  check("oracle export with a calibration sentence ingests", oracle.ok && oracle.records[0]?.source === "oracle-note")
}

console.log("\nE. Promotion law")

{
  const one = proposePromotions([rec({ deviceId: "samsung-a15", result: "accepted", attemptsBefore: 8, donorOwned: true })])
  check("1 accept → shop-note", one[0]?.kind === "shop-note" && one[0].officialFlipAllowed === false)

  const three = proposePromotions([
    rec({ id: "1", deviceId: "tecno-spark30", result: "accepted", attemptsBefore: 7, donorOwned: true, unitSerialHash: "1".repeat(64) }),
    rec({ id: "2", deviceId: "tecno-spark30", result: "accepted", attemptsBefore: 9, donorOwned: true, unitSerialHash: "2".repeat(64) }),
    rec({ id: "3", deviceId: "tecno-spark30", result: "accepted", attemptsBefore: 6, donorOwned: true, unitSerialHash: "3".repeat(64) }),
  ])
  check("3 independent accepts → pr-candidate", three[0]?.kind === "pr-candidate" && three[0].independentUnits === 3)
  check("PR candidate still cannot auto-flip official", three[0]?.officialFlipAllowed === false)

  const low = proposePromotions([rec({ deviceId: "itel-a80", result: "accepted", attemptsBefore: 2, donorOwned: true })])
  check("attempts ≤ 2 → refused-low-attempts", low[0]?.kind === "refused-low-attempts")

  const reject = proposePromotions([rec({ deviceId: "oppo-a3x", result: "rejected", attemptsBefore: 5, donorOwned: true })])
  check("reject with no accepts → stopped-on-reject", reject[0]?.kind === "stopped-on-reject")

  const customer = proposePromotions([rec({ deviceId: "moto-g24", result: "accepted", attemptsBefore: 8, donorOwned: false })])
  check("non-donor → refused-not-donor", customer[0]?.kind === "refused-not-donor")
}

console.log("\nF. officialFlipAllowed is a hard false")

{
  const all = proposePromotions([
    rec({ deviceId: "a", result: "accepted", attemptsBefore: 8, donorOwned: true }),
    rec({ deviceId: "b", result: "rejected", attemptsBefore: 5, donorOwned: true }),
    rec({ deviceId: "c", result: "accepted", attemptsBefore: 1, donorOwned: true }),
  ])
  check("every proposal forbids official auto-flip", all.every((p) => p.officialFlipAllowed === false))
}

console.log("\nG. Virtual-replay records never promote")

{
  const virtual = rec({
    deviceId: "samsung-a15",
    result: "accepted",
    attemptsBefore: 9,
    donorOwned: true,
    source: "virtual-replay",
    unitSerialHash: "b".repeat(64),
  })
  check("virtual-replay excluded from promotion", proposePromotions([virtual]).length === 0)
}

console.log("\nH. Honesty hard line")

{
  const src = [
    SOFTWARE_ONLY_HONESTY,
    VIRTUAL_DONORS.map((d) => d.notes + d.blocker).join(" "),
  ].join(" ")
  check("no spoof/evade/keybox language in the bench desk",
    !/spoof|evade|keybox|obfuscat/i.test(src))
  check("Pixel blocker names server physics",
    (VIRTUAL_DONORS.find((d) => d.deviceId === "google-pixel9")?.blocker ?? "").toLowerCase().includes("physics"))
}

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "ALL BENCH-DESK CHECKS GREEN" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
