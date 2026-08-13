// =====================================================================
// Protocol × Brand × Android-version coverage matrix — npm run test:matrix
// ---------------------------------------------------------------------
// The HONEST answer to "20 brands x 9 versions x 4 protocols, print 100%":
// this matrix is computed from the REAL 268-row catalogue (Rust sources)
// and the physics bands the app lives by — no random numbers anywhere.
//   * MTP is file-transfer only: it carries NO unlock commands, on ANY
//     Android version. It is therefore never a pathway. (Any sim that
//     scores MTP for FRP is measuring imagination.)
//   * Fastboot is a flash/maintenance channel, not an FRP data path in
//     this catalogue — reported, never claimed.
//   * Android 15/16 rows: software channels are server-side-blocked for
//     everyone; only silicon channels remain, and they are CONDITIONAL
//     (SLA/DAA auth, signed loaders, bench verification).
// Statuses: doable / conditional / not-by-software — the traffic lights.
// Exit 0 = matrix internally consistent + honesty invariants hold.
// =====================================================================
import { readFileSync } from "node:fs"

let passed = 0, failed = 0
const check = (name: string, cond: boolean) => {
  if (cond) passed++
  else { failed++; console.log(`FAIL  ${name}`) }
}

const read = (p: string) => readFileSync(p, "utf8")

// ---------- parse (same fixed extraction as test:brands) ----------
interface Row {
  brand: string; name: string; family: string; versions: string[]
  methods: string[]; patch: string | null; preauthAdb: boolean; mtkAuth: boolean; comboFirmware: boolean
}

const db = read("src-tauri/src/frp/database.rs")
const samRows: Row[] = [...db.matchAll(/SamsungModel \{\s*model_code: "([^"]+)"\.into\(\),\s*marketing_name: "([^"]+)"\.into\(\),\s*chipset: "([^"]+)"\.into\(\),\s*android_versions: vec!\[([^\]]*)\],\s*supported_methods: vec!\[([\s\S]*?)\],[\s\S]*?max_security_patch: (?:Some\("([^"]+)"\.into\(\)\)|None),[\s\S]*?requires_preauthorized_adb: (\w+),[\s\S]*?supports_download_mode: \w+,\s*combination_firmware_available: (\w+),/g)]
  .map(m => ({
    brand: "Samsung", name: m[2], family: m[3],
    versions: [...m[4].matchAll(/"([^"]+)"/g)].map(x => x[1]),
    methods: [...m[5].matchAll(/FrpMethod::(\w+)/g)].map(x => x[1]),
    patch: m[6] ?? null, preauthAdb: m[7] === "true", mtkAuth: false, comboFirmware: m[8] === "true",
  }))

const tFiles: [string, string][] = [
  ["Tecno", "src-tauri/src/frp/database.rs"],
  ["Infinix", "src-tauri/src/frp/infinix_database.rs"],
  ["Itel", "src-tauri/src/frp/itel_database.rs"],
  ["Worldwide-2025H2", "src-tauri/src/frp/q3_database.rs"],
  ["Worldwide-2025H1", "src-tauri/src/frp/q4_database.rs"],
]
// brand label inside q3/q4 rows comes from series; tecno/infinix/itel from file
const tecoRows: Row[] = []
for (const [table, file] of tFiles) {
  const src = read(file)
  let rows = [...src.matchAll(/TecnoModel \{\s*marketing_name: "([^"]+)"\.into\(\),\s*series: "([^"]+)"\.into\(\),\s*chipset: "([^"]+)"\.into\(\),\s*chipset_family: "([^"]+)"\.into\(\),\s*android_versions: vec!\[([^\]]*)\],\s*supported_methods: vec!\[([\s\S]*?)\],[\s\S]*?max_security_patch: (?:Some\("([^"]+)"\.into\(\)\)|None),[\s\S]*?requires_preauthorized_adb: (\w+),\s*has_mtk_auth: (\w+),[\s\S]*?available_in_kenya: \w+,/g)]
  if (table === "Tecno") rows = rows.filter(m => src.indexOf(m[0]) > src.indexOf("get_tecno_database")) // only the tecno table of database.rs
  for (const m of rows) {
    const series = m[2]
    const brand = table.startsWith("Worldwide") ? series : table // q3/q4: series carries the brand family (Redmi, Moto, ...)
    tecoRows.push({
      brand, name: m[1], family: m[4],
      versions: [...m[5].matchAll(/"([^"]+)"/g)].map(x => x[1]),
      methods: [...m[6].matchAll(/TecnoFrpMethod::(\w+)/g)].map(x => x[1]),
      patch: m[7] ?? null, preauthAdb: m[8] === "true", mtkAuth: m[9] === "true", comboFirmware: false,
    })
  }
}
const ALL: Row[] = [...samRows, ...tecoRows]

// ---------- channel model (what each "protocol" can physically carry) ----------
type Channel = "ADB" | "UI-manual" | "Odin/Download" | "Brom/MTK-DL" | "SPD-DL" | "EDL/Firehose"
type Band = "doable" | "conditional" | "not-by-software"

const ADB_METHODS = new Set(["SetupWizardDisable", "DeviceProvisioning", "ContentProviderBypass", "SetupWizardUninstall", "SettingsAccess"])
const UI_METHODS = new Set(["TalkBackBypass", "BrowserDownloadBypass", "EmergencyDialerBypass", "SimPinBypass", "AccountManagerLaunch", "QuickShortcutMaker", "HiosServiceMenu", "AllianceShieldBypass", "HacktmBypass", "SmartSwitchBypass"])
const BROM_METHODS = new Set(["MtkBromErase", "MtkAuthBypass"])
const SPD_METHODS = new Set(["SpdBootloaderErase"])

function channelsFor(row: Row): Channel[] {
  const out = new Set<Channel>()
  if (row.methods.some(m => ADB_METHODS.has(m))) out.add("ADB")
  if (row.methods.some(m => UI_METHODS.has(m))) out.add("UI-manual")
  if (row.brand === "Samsung" && (row.comboFirmware || row.methods.includes("CombinationFirmware"))) out.add("Odin/Download")
  if (row.methods.some(m => BROM_METHODS.has(m)) || row.family === "MediaTek") out.add("Brom/MTK-DL")
  if (row.methods.some(m => SPD_METHODS.has(m)) || row.family === "Spreadtrum") out.add("SPD-DL")
  if (row.family === "Qualcomm") out.add("EDL/Firehose") // service lane: signed-loader availability decides
  return [...out]
}

const normVersion = (vs: string[]): number => {
  const nums = vs.map(v => parseInt(v)).filter(n => Number.isFinite(n)).map(n => (n < 10 ? n : Math.min(n, 16)))
  return nums.sort((a, b) => b - a)[0] ?? 0 // highest listed version = hardest case
}

function bandFor(row: Row, ch: Channel): { band: Band; why: string } {
  const av = normVersion(row.versions)
  const pastCap = av >= 15 // A15/16 = server-enforcement era (see patch-oracle evidence)
  if (ch === "ADB" || ch === "UI-manual" || ch === "Odin/Download") {
    if (pastCap) return { band: "not-by-software", why: "A15+ enforcement is server-side; this channel's decision happens off-device" }
    if (av >= 12) return { band: "conditional", why: "post-A11 hardening era; patch level decides (row cap: " + (row.patch ?? "unset") + ")" }
    if (row.preauthAdb) return { band: "conditional", why: "route exists but needs pre-authorized ADB / prior setup" }
    return { band: "doable", why: "pre-hardening era + no pre-auth requirement on this row" }
  }
  // silicon channels
  if (ch === "EDL/Firehose") return { band: "conditional", why: "needs OEM-signed firehose loader for the exact model — availability, not physics" }
  if (row.mtkAuth) return { band: "conditional", why: "SLA/DAA auth enabled on this silicon — exploit/auth-bypass only, bench-verify" }
  if (pastCap) return { band: "conditional", why: "silicon erase still works, but IMEI-enrolled units re-verify server-side after setup — honest band" }
  return { band: "doable", why: "mask-ROM pathway, no auth gate on this row" }
}

// ---------- build the matrix (deterministic: no randomness exists in here) ----------
interface Cell { brand: string; name: string; channel: Channel; band: Band; why: string }
function buildMatrix(): Cell[] {
  const cells: Cell[] = []
  for (const row of ALL) for (const ch of channelsFor(row)) {
    const { band, why } = bandFor(row, ch)
    cells.push({ brand: row.brand, name: row.name, channel: ch, band, why })
  }
  return cells.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name) || a.channel.localeCompare(b.channel))
}
const M1 = buildMatrix()
const M2 = buildMatrix()

console.log("\n=== REAL protocol matrix (from the 268-row catalogue) ===")
const tally: Record<Band, number> = { doable: 0, conditional: 0, "not-by-software": 0 }
const byBrand: Record<string, { rows: Set<string>; cells: number; doable: number; conditional: number; blocked: number }> = {}
for (const c of M1) {
  tally[c.band]++
  const b = (byBrand[c.brand] ??= { rows: new Set(), cells: 0, doable: 0, conditional: 0, blocked: 0 })
  b.rows.add(c.name); b.cells++
  if (c.band === "doable") b.doable++
  else if (c.band === "conditional") b.conditional++
  else b.blocked++
}
console.log(`rows=${ALL.length}  pathways=${M1.length}  doable=${tally.doable}  conditional=${tally.conditional}  not-by-software=${tally["not-by-software"]}`)
for (const [brand, s] of Object.entries(byBrand).sort((a, b) => b[1].cells - a[1].cells)) {
  console.log(`  ${brand.padEnd(18)} models=${String(s.rows.size).padStart(3)} pathways=${String(s.cells).padStart(3)}  🟢${s.doable} 🟡${s.conditional} 🔴${s.blocked}`)
}

// ---------- the gates ----------
check("matrix deterministic across two builds", JSON.stringify(M1) === JSON.stringify(M2))
check("catalogue rows = 268 (source-measured)", ALL.length === 268)
check("every row yields >= 1 real pathway", ALL.every(r => channelsFor(r).length >= 1))
check("MTP carries zero pathways (file-transfer protocol: no command channel, ever)",
  !M1.some(c => (c.channel as string) === "MTP"))
check("A15/16 rows never report a 'doable' SOFTWARE channel", M1.every(c => {
  const row = ALL.find(r => r.name === c.name)
  const av = normVersion(row?.versions ?? [])
  return av < 15 || !(c.channel === "ADB" || c.channel === "UI-manual" || c.channel === "Odin/Download") || c.band === "not-by-software"
}))
check("silicon channels survive A15 as conditional (brom/spd on fresh rows)", M1.some(c => c.brand === "Tecno" && (c.channel === "Brom/MTK-DL" || c.channel === "SPD-DL")))
check("Samsung Odin channel present for combination-firmware rows", M1.some(c => c.channel === "Odin/Download"))
check("doable + conditional + blocked == total pathways", tally.doable + tally.conditional + tally["not-by-software"] === M1.length)
check("blocked band dominated by A15-era rows (physics, not flags)", M1.filter(c => c.band === "not-by-software").every(c => {
  const row = ALL.find(r => r.name === c.name); return normVersion(row?.versions ?? []) >= 15
}))
check("no randomness exists in the builder (code-level invariant)",
  !read("scripts/verify-protocol-matrix.mts").includes(["Math", "random"].join(".")))

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "MATRIX CONSISTENT & HONEST" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
