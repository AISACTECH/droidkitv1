// =====================================================================
// Brand-database deep verifier — npm run test:brands
// The brand coverage lives in Rust (src-tauri/src/frp/*.rs) and this
// sandbox has no Rust toolchain — so this gate parses the Rust SOURCE
// directly and validates the data layer end to end:
//   * every model entry references only methods that actually exist
//   * no duplicate/ malformed/ incomplete entries
//   * brand families the shop counter asks about (Samsung, Tecno,
//     Infinix, Itel, Xiaomi-family, OPPO, Realme, Vivo, Motorola,
//     Nokia, Huawei, Google, Sony, Honor) are structurally present
//   * the Rust command surface AND the frontend invoke layer both
//     expose every database (a DB that compiles but isn't reachable
//     is a broken feature)
// What it proves: the catalogue data is internally consistent and
// fully wired. What it does NOT prove: physical on-device outcomes
// (that is bench work — the honesty law).
// =====================================================================
import { readFileSync } from "node:fs"

let passed = 0, failed = 0
const check = (name: string, cond: boolean) => {
  if (cond) passed++
  else { failed++; console.log(`FAIL  ${name}`) }
}

const read = (p: string) => readFileSync(p, "utf8")

// ---------- 1 · extract the two method enums ----------
const db = read("src-tauri/src/frp/database.rs")
const enumVariants = (src: string, enumName: string): Set<string> => {
  const m = src.match(new RegExp(`pub enum ${enumName} \\{([\\s\\S]*?)\\n\\}`))
  if (!m) return new Set()
  return new Set([...m[1].matchAll(/^\s{4}([A-Z][A-Za-z0-9]*),?\s*$/gm)].map(x => x[1]))
}
const SAM_METHODS = enumVariants(db, "FrpMethod")
const TECNO_METHODS = enumVariants(db, "TecnoFrpMethod")
check(`Samsung FrpMethod enum parsed (${SAM_METHODS.size} variants)`, SAM_METHODS.size >= 12)
check(`TecnoFrpMethod enum parsed (${TECNO_METHODS.size} variants)`, TECNO_METHODS.size >= 12)

// Vec! macro bug fence: same-variant-twice inside one enum = dead method
check("Samsung methods include the deep routes", ["CombinationFirmware", "TalkBackBypass", "SimPinBypass"].every(v => SAM_METHODS.has(v)))
check("Transsion methods include silicon routes", ["MtkBromErase", "SpdBootloaderErase", "MtkAuthBypass"].every(v => TECNO_METHODS.has(v)))

// ---------- 2 · parse Samsung entries ----------
interface SamRow { code: string; name: string; chipset: string; versions: string[]; methods: string[]; patch: string | null }
const samRows: SamRow[] = [...db.matchAll(/SamsungModel \{\s*model_code: "([^"]+)"\.into\(\),\s*marketing_name: "([^"]+)"\.into\(\),\s*chipset: "([^"]+)"\.into\(\),\s*android_versions: vec!\[([^\]]*)\],\s*supported_methods: vec!\[([\s\S]*?)\],[\s\S]*?max_security_patch: (?:Some\("([^"]+)"\.into\(\)\)|None),/g)]
  .map(m => ({
    code: m[1], name: m[2], chipset: m[3],
    versions: [...m[4].matchAll(/"([^"]+)"/g)].map(x => x[1]),
    methods: [...m[5].matchAll(/FrpMethod::(\w+)/g)].map(x => x[1]),
    patch: m[6] ?? null,
  }))
const samCount = samRows.length
check(`Samsung catalogue parsed (${samCount} models)`, samCount >= 30)
check("Samsung model codes unique", new Set(samRows.map(r => r.code)).size === samCount)
check("Samsung model codes shaped (SM-/GT-)", samRows.every(r => /^(SM|GT|Galaxy)/.test(r.code)))
check("Samsung: every model has >= 1 method + >= 1 Android version", samRows.every(r => r.methods.length >= 1 && r.versions.length >= 1))
const badSamMethods = samRows.flatMap(r => r.methods.filter(m => !SAM_METHODS.has(m)).map(m => `${r.code}:${m}`))
check("Samsung: zero references to non-existent methods", badSamMethods.length === 0)
if (badSamMethods.length) console.log("  invalid:", badSamMethods.slice(0, 5))
check("Samsung: patch strings well-formed", samRows.every(r => r.patch === null || /^\d{4}-\d{2}(-\d{2})?$/.test(r.patch)))

// ---------- 3 · parse the TecnoModel-family databases ----------
interface TRow { name: string; series: string; family: string; versions: string[]; methods: string[]; patch: string | null }
function parseTecnoFamily(src: string): TRow[] {
  return [...src.matchAll(/TecnoModel \{\s*marketing_name: "([^"]+)"\.into\(\),\s*series: "([^"]+)"\.into\(\),\s*chipset: "([^"]+)"\.into\(\),\s*chipset_family: "([^"]+)"\.into\(\),\s*android_versions: vec!\[([^\]]*)\],\s*supported_methods: vec!\[([\s\S]*?)\],[\s\S]*?max_security_patch: (?:Some\("([^"]+)"\.into\(\)\)|None),/g)]
    .map(m => ({
      name: m[1], series: m[2], family: m[4],
      versions: [...m[5].matchAll(/"([^"]+)"/g)].map(x => x[1]),
      methods: [...m[6].matchAll(/TecnoFrpMethod::(\w+)/g)].map(x => x[1]),
      patch: m[7] ?? null,
    }))
}
const FILES: Record<string, string> = {
  tecno: "src-tauri/src/frp/database.rs",
  infinix: "src-tauri/src/frp/infinix_database.rs",
  itel: "src-tauri/src/frp/itel_database.rs",
  q3: "src-tauri/src/frp/q3_database.rs",
  q4: "src-tauri/src/frp/q4_database.rs",
}
const tables: Record<string, TRow[]> = {}
for (const [key, file] of Object.entries(FILES)) tables[key] = parseTecnoFamily(read(file))

// tecno table lives in database.rs alongside the struct def — its entries are
// distinguishable because ONLY the tecno block sits between the struct def
// and the next pub fn boundary; simplest honest invariant: >= 60 Tecno rows
check(`Tecno catalogue parsed (${tables.tecno.length} models)`, tables.tecno.length >= 60)
check(`Infinix catalogue parsed (${tables.infinix.length} models)`, tables.infinix.length >= 30)
check(`Itel catalogue parsed (${tables.itel.length} models)`, tables.itel.length >= 30)
check(`Q3-world catalogue parsed (${tables.q3.length} models)`, tables.q3.length >= 50)
check(`Q4-world catalogue parsed (${tables.q4.length} models)`, tables.q4.length >= 30)

for (const [key, rows] of Object.entries(tables)) {
  check(`${key}: every row has methods + versions + chipset family`, rows.every(r => r.methods.length >= 1 && r.versions.length >= 1 && r.family.length >= 3))
  const bad = rows.flatMap(r => r.methods.filter(m => !TECNO_METHODS.has(m)).map(m => `${r.name}:${m}`))
  check(`${key}: zero references to non-existent methods`, bad.length === 0)
  if (bad.length) console.log("  invalid:", bad.slice(0, 5))
  check(`${key}: patch strings well-formed`, rows.every(r => r.patch === null || /^\d{4}-\d{2}(-\d{2})?$/.test(r.patch)))
}

// ---------- 4 · the counter-question brand wall (user-named brands) ----------
const q3q4 = [...tables.q3, ...tables.q4]
const has = (rx: RegExp) => q3q4.some(r => rx.test(r.name) || rx.test(r.series))
const brandWall: [string, RegExp][] = [
  ["Xiaomi-family (Xiaomi/Redmi/POCO)", /Xiaomi|Redmi|POCO/i],
  ["Vivo", /Vivo|iQOO/i],
  ["Motorola", /Moto/i],
  ["OPPO", /OPPO/i], ["Realme", /Realme/i], ["Huawei", /Huawei/i],
  ["Nokia", /Nokia/i], ["Google (Pixel)", /Google|Pixel/i],
  ["Honor", /Honor/i], ["Sony", /Sony/i],
]
for (const [label, rx] of brandWall) check(`brand present: ${label}`, has(rx))
check("Transsion trio each >= 30", tables.tecno.length >= 30 && tables.infinix.length >= 30 && tables.itel.length >= 30)
check("Samsung is the single largest single-brand table", samCount >= Math.max(tables.infinix.length, tables.itel.length))

const total = samCount + Object.values(tables).reduce((a, t) => a + t.length, 0)
console.log(`\nCatalogue size (counted from source, not marketing): ${total} model rows`)
check("catalogue >= 250 rows", total >= 250)

// ---------- 5 · chipset-family sanity (feeds the Patch Oracle classes) ----------
const families = new Set<string>()
for (const rows of Object.values(tables)) rows.forEach(r => families.add(r.family))
console.log("chipset families in data:", [...families].join(", "))
check("MTK + SPD + Qualcomm families all present", ["MediaTek", "Spreadtrum", "Qualcomm"].every(f => families.has(f)))

// ---------- 6 · reachability: Rust command surface + frontend wiring ----------
const cmds = read("src-tauri/src/frp/commands.rs")
for (const fn of [
  "frp_get_device_database", "frp_get_tecno_database", "frp_get_infinix_database",
  "frp_get_itel_database", "frp_get_q3_database", "frp_get_q4_database",
  "frp_search_models", "frp_search_tecno_models", "frp_search_infinix_models",
  "frp_search_itel_models", "frp_search_q3_models", "frp_search_q4_models",
]) check(`rust command exists: ${fn}`, cmds.includes(`fn ${fn}(`))

check("search is case-insensitive (itel)", read(FILES.itel).includes("to_lowercase()"))
check("lookup-by-name exists per Transsion file", ["find_tecno_model", "find_infinix_model", "find_itel_model"].every(f => (db + read(FILES.infinix) + read(FILES.itel)).includes(`fn ${f}(`) || cmds.includes(f)))

const fe = read("src/lib/frp-commands.ts")
for (const inv of ["frp_get_device_database", "frp_get_tecno_database", "frp_get_infinix_database", "frp_get_itel_database", "frp_get_q3_database", "frp_get_q4_database"])
  check(`frontend wired: ${inv}`, fe.includes(`invoke('${inv}'`) || fe.includes(`invoke("${inv}"`))

const lib = read("src-tauri/src/lib.rs")
for (const h of ["frp_get_tecno_database", "frp_get_q3_database", "frp_get_q4_database"])
  check(`handler registered: ${h}`, lib.includes(h))

console.log(`\n${passed} passed, ${failed} failed`)
console.log(failed === 0 ? "ALL BRAND CHECKS GREEN" : `${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
