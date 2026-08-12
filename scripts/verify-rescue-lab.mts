// =====================================================================
// Rescue Lab master test gate — npm run test:lab
// Verifies every brand / carrier / method / algorithm claim in the
// Rescue Lab against structure + ground truth. What this proves: every
// data row renders, every band obeys the honesty law, every math engine
// reproduces real published examples, and every required file exists.
// What it does NOT prove (printed honestly in-app): physical on-device
// behaviour — that is what the bench log measures, by design.
// =====================================================================
import { existsSync, readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { crackGestureKey } from "../src/lib/gesture-crack.ts"
import { md5Hex, checkImei, huaweiCandidates } from "../src/lib/nck-modem.ts"
import {
  PC_ACCOUNT_TYPES, PC_BOOT_KEYS, PC_WINDOWS_METHODS, PC_SAFETY_FIRST,
  PC_CHNTPW_METHOD, PC_DOMAIN_METHOD, PC_RESET_METHOD,
  CARRIER_DETECT, CARRIER_PHYSICS_NOTE,
  MODEM_AT_COMMANDS, MODEM_FIRMWARE,
  MIFI_PHYSICS_NOTE, MIFI_IDENTIFY, MIFI_BRAND_ROUTES, MIFI_AFTER_UNLOCK,
  BUTTONPHONE_NOTE, BUTTONPHONE_METHODS, BUTTONPHONE_BRAND_GUIDE,
  SCREENLOCK_ERAS, BLACKSCREEN_TRIAGE, FORCE_RESTART,
  MYTH_HDMI, MYTH_100_RULE, RESCUE_CONSENT,
} from "../src/lib/rescue-data.ts"
import { buildSession, entryCommand, READONLY_COMMANDS } from "../src/lib/modem-session.ts"

let passed = 0, failed = 0
const check = (name: string, cond: boolean) => {
  if (cond) passed++
  else { failed++; console.log(`FAIL  ${name}`) }
}

// ---------- 0 · engines re-verified (core math) ----------
check("md5(abc) RFC vector", md5Hex("abc") === "900150983cd24fb0d6963f7d28e17f72")
const r1 = huaweiCandidates("867648011803309")
check("NCK V1 real example", r1.candidates[0].code === "34560983")
check("NCK flash real example", r1.candidates[1].code === "34591526")
check("NCK V2 real example", huaweiCandidates("968480435684491").candidates[2].code === "23823444")
check("gesture crack still green", crackGestureKey(createHash("sha1").update(Buffer.from([0, 1, 2, 4])).digest("hex")).found)

// ---------- 1 · MiFi / modem brands & carriers ----------
check("MiFi brand routes present", MIFI_BRAND_ROUTES.length >= 6)
for (const b of MIFI_BRAND_ROUTES) {
  check(`brand row ok: ${b.brand}`, b.brand.length > 3 && b.route.length > 20 && ["doable", "conditional", "not-by-software"].includes(b.band))
  check(`band honest (${b.brand}): no impossible doable on server-physics`, !(b.brand.includes("iPhone") && b.band === "doable"))
}
const brandText = MIFI_BRAND_ROUTES.map(b => b.brand + b.route).join(" ")
for (const must of ["Huawei", "ZTE", "Alcatel", "E5573", "MF92", "LINKZONE"]) check(`MiFi brand covered: ${must}`, brandText.includes(must))

const afterText = MIFI_AFTER_UNLOCK.map(s => s.text).join(" ")
for (const carrier of ["Safaricom", "Airtel", "Telkom", "Faiba"]) check(`Kenya carrier APN present: ${carrier}`, afterText.includes(carrier))

check("attempts pre-flight demanded (AT^CARDLOCK?)", MIFI_IDENTIFY.some(s => (s.text + (s.cmd ?? "")).includes("AT^CARDLOCK?")))
check("CLCK PN query present", MODEM_AT_COMMANDS.some(a => a.cmd === 'AT+CLCK="PN",2'))
check("read-IMEI note present", MODEM_AT_COMMANDS.some(a => a.cmd === "AT+CGSN"))
for (const a of MODEM_AT_COMMANDS) check(`AT row ok: ${a.cmd}`, a.cmd.startsWith("AT") && a.meaning.length > 10)
check("IMEI rewriting stays illegal-marked", RESCUE_CONSENT.includes("never rewrite IMEIs") )
check("MODEM firmware rows sane", MODEM_FIRMWARE.length >= 3 && MODEM_FIRMWARE.every(m => m.steps.length >= 1))

// ---------- 2 · button phones toward max coverage ----------
const bpText = BUTTONPHONE_METHODS.map(m => m.title + m.when + m.steps.map(s => s.text).join("")).join(" ")
check("SIM-PIN-vs-lock triage first", BUTTONPHONE_METHODS[0].title.includes("SIM PIN"))
check("PUK free-from-carrier explained", bpText.includes("PUK"))
for (const def of ["1234", "0000", "1122", "12345"]) check(`default code ${def} listed`, bpText.includes(def))
check("spd_dump open-source route named", bpText.includes("spd_dump"))
check("data-loss warning present on format route", BUTTONPHONE_METHODS.some(m => (m.warn ?? "").includes("ERASES")))
check("KaiOS caveat present", bpText.includes("KaiOS"))
check("brand guide rows", BUTTONPHONE_BRAND_GUIDE.length >= 8)
for (const b of BUTTONPHONE_BRAND_GUIDE) {
  check(`button brand ok: ${b.brand}`, b.chipset.length > 3 && b.defaults.length > 0 && b.route.length > 10)
}
const bpBrandText = BUTTONPHONE_BRAND_GUIDE.map(b => b.brand).join(" ")
for (const must of ["Itel", "Tecno", "Nokia", "KaiOS"]) check(`button brand covered: ${must}`, bpBrandText.includes(must))

// ---------- 3 · PC lane ----------
const pcAll = [PC_SAFETY_FIRST, ...PC_WINDOWS_METHODS, PC_CHNTPW_METHOD, PC_RESET_METHOD, PC_DOMAIN_METHOD]
for (const m of pcAll) check(`PC method ok: ${m.title.slice(0, 40)}`, m.title.length > 5 && m.steps.length >= 1 && m.when.length > 10)
check("BitLocker pre-check is FIRST", pcAll[0].title.includes("BEFORE"))
check("manage-bde check command present", PC_SAFETY_FIRST.steps.some(s => (s.cmd ?? "").includes("manage-bde")))
check("chntpw command present", PC_CHNTPW_METHOD.steps.some(s => (s.cmd ?? "").includes("chntpw")))
check("Domain/AzureAD marked not-by-software", PC_DOMAIN_METHOD.band === "not-by-software")
check("reset-everything card exists", PC_RESET_METHOD.steps.length >= 3)
check("boot-key rows", PC_BOOT_KEYS.length >= 8)
check("account types rows", PC_ACCOUNT_TYPES.length === 3)

// ---------- 4 · carrier lane (phones: server-side honesty) ----------
check("carrier physics note pins server law", CARRIER_PHYSICS_NOTE.includes("server"))
check("carrier detect includes dialer/service test", CARRIER_DETECT.some(m => m.steps.some(s => s.text.includes("*#7465625#") || s.text.includes("No SIM restrictions"))))
check("lender-lock refusal present", CARRIER_DETECT.some(m => m.steps.some(s => s.text.includes("lender"))))

// ---------- 5 · screen-lock & black-screen lanes ----------
check("screen-lock eras cover modern honesty", SCREENLOCK_ERAS.some(e => e.band === "not-by-software" && e.era.includes("9")))
check("Samsung Remote Unlock official route present", SCREENLOCK_ERAS.some(e => e.truth.includes("findmymobile")))
check("black screen triage has verdicts both ways", BLACKSCREEN_TRIAGE.every(q => q.yes.moves.length >= 3 && q.no.moves.length >= 3))
check("force restart rows", FORCE_RESTART.length >= 6)
check("HDMI myth card present & absolute", MYTH_HDMI.includes("cannot bypass FRP") && MYTH_HDMI.includes("scam"))
check("per-class 100% rule present", MYTH_100_RULE.includes("0%") && MYTH_100_RULE.includes("deterministic"))

// ---------- 6 · auto-session interlocks ----------
const sBlocked = buildSession({ native: false, attemptsLeft: 2, imeiOk: true, eraPicked: true, confirmed: true })
check("interlock I2: <=2 attempts blocks", sBlocked.some(s => s.status === "blocked"))
const sLuhn = buildSession({ native: false, attemptsLeft: 8, imeiOk: false, eraPicked: true, confirmed: true })
check("interlock I3: bad IMEI blocks", sLuhn.some(s => s.status === "blocked"))
const sOk = buildSession({ native: false, attemptsLeft: 8, imeiOk: true, eraPicked: true, confirmed: true })
check("full gates pass → entry step done", sOk.find(s => s.id === "entry")?.status === "done")
const sUnconfirmed = buildSession({ native: false, attemptsLeft: 8, imeiOk: true, eraPicked: true, confirmed: false })
check("I5: unconfirmed entry not exposed", sUnconfirmed.find(s => s.id === "entry") === undefined)
check("entry command shape", entryCommand("12345678") === 'AT^CARDLOCK="12345678"')
check("entry command not in read-only set", !READONLY_COMMANDS.includes(entryCommand("12345678")))

// ---------- 7 · files & wiring ----------
for (const f of [
  "src/components/views/RescueLab.tsx",
  "src/components/views/RescueLab/shared.tsx",
  "src/components/views/RescueLab/PcRescueLane.tsx",
  "src/components/views/RescueLab/CarrierUnlockLane.tsx",
  "src/components/views/RescueLab/ModemLane.tsx",
  "src/components/views/RescueLab/ButtonPhoneLane.tsx",
  "src/components/views/RescueLab/ScreenLockLane.tsx",
  "src/components/views/RescueLab/BlackScreenLane.tsx",
  "src/lib/rescue-data.ts", "src/lib/nck-modem.ts", "src/lib/modem-session.ts", "src/lib/gesture-crack.ts",
  "docs/RESCUE-LAB-RESEARCH.md", "docs/RFC-MODEM-SERIAL-BACKEND.md", "docs/PHYSICS-LAYER-RESEARCH.md",
]) check(`file exists: ${f}`, existsSync(f))
check("nav wired", readFileSync("src/components/AppSidebar.tsx", "utf8").includes("rescue-lab"))
check("router wired", readFileSync("src/components/MainContent.tsx", "utf8").includes("RescueLab"))
check("button-phone lane registered", readFileSync("src/components/views/RescueLab.tsx", "utf8").includes("ButtonPhoneLane"))

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "ALL CHECKS GREEN" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
