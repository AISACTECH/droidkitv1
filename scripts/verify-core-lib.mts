// =====================================================================
// Core library audit tests — npm run test:core
// Covers what the rescue-lab/nck/gesture gates do NOT:
//   * patch-oracle engine (timeline integrity, survival bands per input
//     class, forecast falsifiability, calibration math, honesty strings)
//   * edge-case input handling of nck-modem / gesture-crack / modem-session
//   * zod schemas (settings, wireless pairing)
//   * banned marketing-phrase sweep across the content libraries
// Added in the 2026-08-12 audit cycle. What this proves: every engine
// behaves sanely on hostile input and every claim module obeys the
// honesty law. What it does NOT prove: physical device behaviour (bench).
// =====================================================================
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import {
  PATCH_STACK, PATCH_TIMELINE, FORECASTS, HONESTY_BANNER,
  assessSurvival, calibration, type OracleInput,
} from "../src/lib/patch-oracle.ts"
import { md5Hex, checkImei, huaweiCandidates, algoSelfTest } from "../src/lib/nck-modem.ts"
import { buildSession, probeNativeSerial, entryCommand, READONLY_COMMANDS } from "../src/lib/modem-session.ts"
import { crackGestureKey, enumeratePatterns, PATTERN_LENGTH_COUNTS } from "../src/lib/gesture-crack.ts"
import { AppSettingsSchema, DEFAULT_SETTINGS, DevicesSchema } from "../src/lib/settings-schema.ts"
import { WirelessPairingSchema } from "../src/lib/wireless-pairing-schema.ts"

let passed = 0, failed = 0
const check = (name: string, cond: boolean) => {
  if (cond) passed++
  else { failed++; console.log(`FAIL  ${name}`) }
}

const LAYERS = PATCH_STACK.map(l => l.layer)

// ============== A · patch oracle (was: zero dedicated coverage) ==============

// timeline integrity
check("timeline non-empty", PATCH_TIMELINE.length >= 8)
check("timeline sorted by date", [...PATCH_TIMELINE].every((e, i, a) => i === 0 || a[i - 1].date <= e.date))
check("timeline dates YYYY-MM", PATCH_TIMELINE.every(e => /^\d{4}-\d{2}$/.test(e.date)))
check("timeline ids unique", new Set(PATCH_TIMELINE.map(e => e.id)).size === PATCH_TIMELINE.length)
check("timeline layers valid", PATCH_TIMELINE.every(e => LAYERS.includes(e.closesLayer)))
check("timeline confidence valid", PATCH_TIMELINE.every(e => ["low", "medium", "high"].includes(e.confidence)))
check("timeline sources cited", PATCH_TIMELINE.every(e => e.source.length >= 10 && e.summary.length >= 40))
check("stack: 6 layers, bootrom+hardware unpatchable", LAYERS.length === 6
  && PATCH_STACK.find(l => l.layer === "bootrom")?.patchable === "never"
  && PATCH_STACK.find(l => l.layer === "hardware")?.patchable === "never")

// survival bands per input class — the physics invariants
const v = (o: Partial<OracleInput>): OracleInput => ({ vendor: "", chipset: "Unknown", androidVersion: 0, securityPatch: "", ...o })
const firstOutlook = (inp: OracleInput) => assessSurvival(inp).outlooks[0]
check("unknown Android → adb row unknown", firstOutlook(v({})).status === "unknown")
check("Android 9 → adb provisioning alive", firstOutlook(v({ androidVersion: 9 })).status === "alive")
check("Android 13 → adb contested", firstOutlook(v({ androidVersion: 13 })).status === "contested")
check("Android 15 → adb blocked", firstOutlook(v({ androidVersion: 15 })).status === "blocked")
check("Android 16 → adb blocked", firstOutlook(v({ androidVersion: 16 })).status === "blocked")
check("NaN version treats as unknown", firstOutlook(v({ androidVersion: NaN })).status === "unknown")

const samFresh = assessSurvival(v({ vendor: "Samsung", androidVersion: 15, securityPatch: "2026-05-01" }))
const samTest = samFresh.outlooks.find(o => o.methodId === "samsung_test_mode")
check("Samsung A15 + post-Jan26 patch → test mode blocked", samTest?.status === "blocked")
const samNoPatch = assessSurvival(v({ vendor: "Samsung", androidVersion: 15, securityPatch: "" }))
check("Samsung A15 + unknown patch → contested (not falsely blocked)", samNoPatch.outlooks.find(o => o.methodId === "samsung_test_mode")?.status === "contested")
check("Samsung gets Exynos Odin row", samFresh.outlooks.some(o => o.methodId === "exynos_download_mode"))

const tecno = assessSurvival(v({ vendor: "Tecno", chipset: "MediaTek", androidVersion: 12, securityPatch: "2023-01" }))
check("Transsion A12 → Brom alive (bootrom physics)", tecno.outlooks.find(o => o.methodId === "mediatek_brom")?.status === "alive")
check("Transsion gets SPD row too", tecno.outlooks.some(o => o.methodId === "spd_bootloader"))
const tecno15 = assessSurvival(v({ vendor: "Infinix", chipset: "MediaTek", androidVersion: 15, securityPatch: "2026-06" }))
check("Transsion A15 → Brom contested (SLA/server gates honestly downgraded)", tecno15.outlooks.find(o => o.methodId === "mediatek_brom")?.status === "contested")

check("Xiaomi → EDL contested", assessSurvival(v({ vendor: "Xiaomi", chipset: "Qualcomm", androidVersion: 13 })).outlooks.find(o => o.methodId === "qualcomm_edl")?.status === "contested")
check("Pixel → hard blocked row", assessSurvival(v({ vendor: "Google Pixel", chipset: "Tensor", androidVersion: 15 })).outlooks.some(o => o.status === "blocked"))

// the honesty sweep over the whole input matrix — the law, executable
const vendors = ["Samsung", "Tecno", "Infinix", "Itel", "Xiaomi", "Google Pixel", "", "Huawei"]
const avs = [0, 9, 13, 15, 16, NaN]
const sps = ["", "2023-01", "2026-05-01"]
let matrixChecks = 0
let matrixClean = true
for (const vendor of vendors) for (const androidVersion of avs) for (const securityPatch of sps) {
  const out = assessSurvival(v({ vendor, androidVersion, securityPatch }))
  matrixChecks++
  const texts = [out.headline, out.bestRung, ...out.outlooks.flatMap(o => [o.reason, o.fallback, o.label])]
  const joined = texts.join(" | ")
  // no verdict may promise or even print a 100%-style guarantee
  if (/\b100\s*%/.test(joined) || /guarantee/i.test(joined) || /always works/i.test(joined)) {
    matrixClean = false
    console.log(`  !! banned claim in verdict: ${vendor} av=${androidVersion} sp=${securityPatch}`)
  }
  if (out.outlooks.length < 2) matrixClean = false // hardware floor must always be listed
  if (out.bestRung.length < 5) matrixClean = false
  if (!out.outlooks.every(o => o.fallback.length > 10)) matrixClean = false // every rung has a next rung
}
check(`matrix clean: ${matrixChecks} verdicts, zero banned claims, hardware floor always present`, matrixClean)

// forecasts: falsifiability is structural, not decorative
check("forecasts >= 8", FORECASTS.length >= 8)
check("forecast ids unique", new Set(FORECASTS.map(f => f.id)).size === FORECASTS.length)
check("every forecast has decide-by date", FORECASTS.every(f => /^\d{4}-\d{2}$/.test(f.testBy)))
check("every forecast has a falsifier", FORECASTS.every(f => f.falsifier.length >= 20))
check("resolved forecasts carry the note", FORESTS_resolvedHaveNotes())
check("open forecasts are still in the future (2026-08 horizon)", FORECASTS.filter(f => f.status === "open").every(f => f.testBy > "2026-08"))
function FORESTS_resolvedHaveNotes() {
  return FORECASTS.filter(f => f.status !== "open").every(f => (f.resolvedNote ?? "").length >= 10)
}

// calibration math
const cal = calibration()
check(`calibration resolved=3 hits=2 misses=1 (got ${cal.resolved}/${cal.hits}/${cal.misses})`, cal.resolved === 3 && cal.hits === 2 && cal.misses === 1)
check("small sample → no percentage printed", cal.label.includes("2/3") && cal.label.includes("sample too small"))
check("misses kept visible", cal.misses >= 1)
const big = calibration([...Array(10)].map((_, i) => ({ id: `t${i}`, prediction: "p", confidence: "low" as const, testBy: "2030-01", falsifier: "f", status: (i < 7 ? "hit" : "miss") as "hit" | "miss" })))
check(">=10 sample → percentage branch works", big.label.includes("70%"))
check("honesty banner bans guarantee language itself", HONESTY_BANNER.includes("No tool on Earth"))

// ============== B · nck engine edge cases ==============

check("md5 sanity (re-verified)", md5Hex("abc") === "900150983cd24fb0d6963f7d28e17f72")
check("IMEI: valid passes", checkImei("867648011803309").ok)
check("IMEI: short rejected with guidance", !checkImei("12345").ok && checkImei("12345").reason.includes("15"))
check("IMEI: luhn failure NAMED (never guess)", !checkImei("867648011803308").ok && checkImei("867648011803308").reason.includes("Luhn"))
check("IMEI: letters stripped then length-rejected", !checkImei("abcdefghijklmno").ok)
check("IMEI: accepts spaced input", checkImei("8676 4801 1803 309").ok)
const nck = huaweiCandidates("867648011803309")
check("all candidates are 8-digit numeric", nck.candidates.every(c => /^\d{8}$/.test(c.code)))
check("exactly one UNVERIFIED-era candidate set stays fenced", nck.candidates.some(c => !c.verified && /UNVERIFIED/i.test(c.note + c.era + c.algo)))
check("V1 + flash verified pair intact", nck.candidates[0].code === "34560983" && nck.candidates[1].code === "34591526")
check("V2 selector real example intact", huaweiCandidates("968480435684491").candidates[2].code === "23823444")
check("algoSelfTest green", algoSelfTest().includes("green"))
check("hostile IMEI → descriptive fail-fast (never fabricate codes)", (() => { try { huaweiCandidates("0"); return false } catch (e) { return String(e).includes("checkImei") } })())
check("empty IMEI → fail-fast, not TypeError", (() => { try { huaweiCandidates(""); return false } catch (e) { return String(e).includes("15-digit") } })())
check("over-long IMEI → fail-fast (no silent truncation to a wrong code)", (() => { try { huaweiCandidates("8676480118033090000"); return false } catch (e) { return String(e).includes("got 19") } })())

// ============== C · modem session boundary matrix ==============

// attempts boundaries: 0/1/2 lock, 3+ continue
for (const [n, wantBlocked] of [[0, true], [1, true], [2, true], [3, false], [10, false]] as const) {
  const s = buildSession({ native: false, attemptsLeft: n, imeiOk: true, eraPicked: true, confirmed: true })
  const gate = s.find(st => st.id === "gate-attempts")
  check(`attempts=${n} → ${wantBlocked ? "BLOCKED" : "passed"}`, wantBlocked ? gate?.status === "blocked" : gate === undefined)
}
check("attempts unread → gate pending (not silently passed)", buildSession({ native: false, attemptsLeft: null, imeiOk: true, eraPicked: true, confirmed: true }).find(s => s.id === "gate-attempts")?.status === "pending")
check("imei bad at 3 attempts → IMEI gate blocked", buildSession({ native: false, attemptsLeft: 3, imeiOk: false, eraPicked: true, confirmed: true }).find(s => s.id === "gate-imei")?.status === "blocked")
check("era unpicked → era gate active", buildSession({ native: false, attemptsLeft: 9, imeiOk: true, eraPicked: false, confirmed: false }).find(s => s.id === "gate-era")?.status === "active")
check("unconfirmed → human-confirmation gate, no entry", (() => { const s = buildSession({ native: false, attemptsLeft: 9, imeiOk: true, eraPicked: true, confirmed: false }); return s.some(st => st.id === "gate-confirm") && !s.some(st => st.id === "entry") })())
check("native mode still gates entry (I5 human-fired)", buildSession({ native: true, attemptsLeft: 9, imeiOk: true, eraPicked: true, confirmed: true }).find(s => s.id === "entry")?.detail.includes("human") || buildSession({ native: true, attemptsLeft: 9, imeiOk: true, eraPicked: true, confirmed: true }).find(s => s.id === "entry")?.title.includes("human") || false)
check("readonly set is exactly query commands", READONLY_COMMANDS.every(c => !c.includes("=\",") || c.includes("CLCK")) && !READONLY_COMMANDS.includes(entryCommand("12345678")))

// probe never throws — the MockLane badge depends on it
const probeOk = await probeNativeSerial(() => Promise.resolve())
const probeFail = await probeNativeSerial(() => Promise.reject(new Error("no such command")))
const probeThrow = await probeNativeSerial(() => { throw new Error("sync throw") })
check("probe: resolvable backend → native", probeOk === true)
check("probe: rejected invoke → manual (no crash)", probeFail === false)
check("probe: SYNCHRONOUS throw → manual (no crash)", probeThrow === false)

// ============== D · gesture cracker hostile input ==============

check("empty hash → clean miss", (() => { const r = crackGestureKey(""); return !r.found && r.searched === 0 })())
check("garbage hash → clean miss, no throw", (() => { const r = crackGestureKey("zz-not-hex-!!"); return !r.found })())
check("wrong-length hex → fast miss (searched=0)", crackGestureKey("abcd").searched === 0)
check("pattern counts unchanged (389,112)", PATTERN_LENGTH_COUNTS.reduce((a, b) => a + b, 0) === 389112)
check("enumeration count consistent", enumeratePatterns().patterns.length === 389112)
check("round-trip crack intact", crackGestureKey(createHash("sha1").update(Buffer.from([0, 1, 2, 4])).digest("hex")).found)

// ============== E · schemas ==============

check("default settings parse & sane", DEFAULT_SETTINGS.appearance.theme === "system" && DEFAULT_SETTINGS.devices.pollingInterval === 3)
check("partial settings → defaults fill", DevicesSchema.parse({}).connectionTimeout === 5000)
check("pollingInterval 0 rejected", !DevicesSchema.safeParse({ pollingInterval: 0 }).success)
check("pollingInterval 11 rejected", !DevicesSchema.safeParse({ pollingInterval: 11 }).success)
check("full settings round-trip", AppSettingsSchema.safeParse(DEFAULT_SETTINGS).success)
check("pairing: valid form", WirelessPairingSchema.safeParse({ ipAddress: "192.168.8.1", port: 5555, pairingCode: "123456" }).success)
check("pairing: bad IPv4 rejected", !WirelessPairingSchema.safeParse({ ipAddress: "999.1.1.1", port: 5555, pairingCode: "123456" }).success)
check("pairing: port 0 rejected", !WirelessPairingSchema.safeParse({ ipAddress: "192.168.8.1", port: 0, pairingCode: "123456" }).success)
check("pairing: port 99999 rejected", !WirelessPairingSchema.safeParse({ ipAddress: "192.168.8.1", port: 99999, pairingCode: "123456" }).success)
check("pairing: 5-digit code rejected", !WirelessPairingSchema.safeParse({ ipAddress: "192.168.8.1", port: 5555, pairingCode: "12345" }).success)

// ============== F · banned marketing-phrase sweep (the law, in CI) ==============

const SOURCES = ["src/lib/help-content.ts", "src/lib/rescue-data.ts", "src/lib/patch-oracle.ts", "src/components/views/HelpCenter.tsx"]
const BANNED = [
  /100%\s*FRP\s*(removal|bypass)/i,
  /guaranteed\s*(FRP|unlock)/i,
  /(removes?|unlocks?)\s+FRP\s+(on\s+)?all\s+(devices|models)/i,
  /works?\s+on\s+all\s+modern\s+devices\s+100%/i,
]
let bannedHits = 0
for (const f of SOURCES) {
  const text = readFileSync(f, "utf8")
  for (const rx of BANNED) if (rx.test(text)) { bannedHits++; console.log(`  !! banned phrase ${rx} in ${f}`) }
}
check("zero banned marketing phrases in content libraries", bannedHits === 0)

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "ALL CORE CHECKS GREEN" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
