#!/usr/bin/env node
/**
 * DroidKit — Market-Comparison Simulation (deterministic, SYNTHETIC)
 * 20,000 users + 10,000 developers · 6 continents · country-level
 *
 * HONESTY LABEL (repo law): these agents are MODELLED, not real people.
 * Success probabilities are physics-grounded assumptions (server-side
 * classes fail for EVERY tool; verified engines succeed at hardware rates).
 * The value is the STRUCTURE: where honesty and coverage move ratings.
 * Reproducible: fixed seed → same numbers every run.
 *
 * Usage: node scripts/simulate-market-comparison.js [--users=20000] [--devs=10000]
 */
import fs from "node:fs"

const arg = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, "").split("=")))
const USERS = parseInt(arg.users ?? "20000", 10)
const DEVS = parseInt(arg.devs ?? "10000", 10)

// ---------- deterministic PRNG ----------
let seed = 0x9e3779b9
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = arr => arr[Math.floor(rnd() * arr.length)]
const chance = p => rnd() < p

// ---------- world model ----------
const CONTINENTS = [
  { name: "Africa",        share: 16, countries: [["Kenya", 6], ["Nigeria", 5], ["South Africa", 3], ["Egypt", 2]], eraNew: 0.10, devNoise: 0.10 },
  { name: "Asia",          share: 22, countries: [["India", 8], ["Pakistan", 4], ["Bangladesh", 4], ["Indonesia", 3], ["Philippines", 3]], eraNew: 0.22, devNoise: 0.08 },
  { name: "Europe",        share: 8,  countries: [["United Kingdom", 3], ["Germany", 3], ["Poland", 2]], eraNew: 0.38, devNoise: 0.05 },
  { name: "North America", share: 13, countries: [["United States", 8], ["Mexico", 3], ["Canada", 2]], eraNew: 0.45, devNoise: 0.05 },
  { name: "South America", share: 8,  countries: [["Brazil", 5], ["Colombia", 3]], eraNew: 0.26, devNoise: 0.07 },
  { name: "Oceania",       share: 3,  countries: [["Australia", 3]], eraNew: 0.42, devNoise: 0.05 },
]
const continentPick = () => {
  let x = rnd() * CONTINENTS.reduce((a, c) => a + c.share, 0)
  for (const c of CONTINENTS) { if ((x -= c.share) <= 0) return c }
  return CONTINENTS[0]
}
const countryPick = cont => {
  let x = rnd() * cont.countries.reduce((a, c) => a + c[1], 0)
  for (const c of cont.countries) { if ((x -= c[1]) <= 0) return c[0] }
  return cont.countries[0][0]
}

// tasks: id, weight per region-type, physics success per tool, honesty flag per tool
// tools: droidkit | paid (PassFab/4uKey/iMobie/Dr.Fone/MagFone) | free (mtkclient/forums) | box (UnlockTool/Miracle)
const TOOLS = ["droidkit", "paid", "free", "box"]
const TASKS = [
  { id: "frp_legacy",   label: "FRP (Android ≤13)",            phys: { droidkit: 0.88, paid: 0.90, free: 0.80, box: 0.92 }, honesty: { droidkit: 1, paid: 0.6, free: 0.7, box: 0.5 }, painFails: ["P2"] },
  { id: "frp_modern",   label: "FRP (Android 15/16 server)",   phys: { droidkit: 0.05, paid: 0.05, free: 0.06, box: 0.10 }, honesty: { droidkit: 1, paid: 0.1, free: 0.7, box: 0.4 }, painFails: ["P1"] },
  { id: "mifi_unlock",  label: "MiFi/modem carrier unlock",    phys: { droidkit: 0.82, paid: null, free: 0.30, box: 0.85 }, honesty: { droidkit: 1, paid: 0, free: 0.5, box: 0.6 }, painFails: ["P8", "P6"] },
  { id: "button_phone", label: "Button-phone password",        phys: { droidkit: 0.90, paid: null, free: 0.40, box: 0.95 }, honesty: { droidkit: 1, paid: 0, free: 0.5, box: 0.6 }, painFails: ["P2", "P6"] },
  { id: "pc_password",  label: "PC/laptop password",           phys: { droidkit: 0.92, paid: null, free: 0.75, box: null }, honesty: { droidkit: 1, paid: 0, free: 0.6, box: 0 }, painFails: ["P4"] },
  { id: "black_screen", label: "Black-screen data rescue",     phys: { droidkit: 0.84, paid: null, free: 0.65, box: 0.88 }, honesty: { droidkit: 1, paid: 0, free: 0.6, box: 0.6 }, painFails: ["P2"] },
  { id: "carrier_phone",label: "Carrier unlock (phone)",       phys: { droidkit: 0.10, paid: 0.10, free: 0.08, box: 0.35 }, honesty: { droidkit: 1, paid: 0.2, free: 0.6, box: 0.5 }, painFails: ["P1"] },
  { id: "modem_fw",     label: "Modem firmware reinstall",     phys: { droidkit: 0.78, paid: null, free: 0.60, box: 0.85 }, honesty: { droidkit: 1, paid: 0, free: 0.55, box: 0.6 }, painFails: ["P4", "P6"] },
]
// task mix weights: [Africa heavy southern, north heavy] — end-users vs developers
const taskMix = (cont, isDev) => {
  const south = cont.eraNew < 0.3
  const w = {
    frp_legacy: south ? 22 : 14, frp_modern: south ? 8 : 20,
    mifi_unlock: south ? 18 : 8, button_phone: south ? 16 : 2,
    pc_password: south ? 10 : 16, black_screen: south ? 8 : 10,
    carrier_phone: south ? 10 : 18, modem_fw: south ? 8 : 3,
  }
  if (isDev) { w.button_phone += 4; w.modem_fw += 3; w.mifi_unlock += 3; w.frp_modern += 4 }
  return w
}
const taskPick = weights => {
  let x = rnd() * Object.values(weights).reduce((a, b) => a + b, 0)
  for (const t of TASKS) { if ((x -= weights[t.id]) <= 0) return t }
  return TASKS[0]
}
// tool mix: droidkit sample group + rivals as they exist in the wild
const toolPick = () => { const x = rnd(); return x < 0.34 ? "droidkit" : x < 0.60 ? "paid" : x < 0.80 ? "free" : "box" }

// pains taxonomy (grounded in recurring PUBLIC review themes for this tool class)
const PAINS = {
  P1: "promised A15/16 or carrier unlock, failed after payment (no patch-wall warning)",
  P2: "data loss / wipe happened with no warning first",
  P3: "subscription trap / refund ghosting",
  P4: "drivers, ports, or setup friction ate the session",
  P5: "support never answered",
  P6: "my device category isn't covered at all",
  P7: "instructions too technical for a first-timer",
  P8: "burned unlock-code attempts → counter risk was never explained",
}
// extra pains that hit OUR sample by design properties (we log ours honestly too)
const OUR_EXTRA = [
  ["setup-env", "needs Node/Rust/winget setup — not a one-click exe for total beginners", 0.10],
  ["guided-serial", "serial backend RFC pending — modem steps still copy-paste guided", 0.10],
  ["unverified-caution", "V201 candidate asks for bench confirmation first", 0.06],
]

const COMMENTS = {
  good: ["finally an app that told me the truth before I started", "the traffic-light bands saved me a wasted hour", "free, and the tests run on my own machine", "unlocked my old Orange MiFi — Safaricom SIM works now", "button phone sorted with 12345, no flashing needed", "the pattern cracker saved the baby photos"],
  honestFail: ["it didn't fix it but it TOLD me upfront who can", "honest 'not possible by software' beats a surprise wipe", "they sent me to the official carrier route — worked in 3 days"],
  silentFail: ["paid, failed, no refund — it never warned me about Android 15", "wiped my whole phone with zero warning", "support ghosted me 4 weeks", "kept entering codes — now attempts are gone forever"],
}

// ---------- run ----------
const agg = {}
const painCount = {}
const ourPain = {}
const comments = []
const byContinent = {}
const byTaskTool = {}

for (const side of ["user", "dev"]) {
  const N = side === "user" ? USERS : DEVS
  for (let i = 0; i < N; i++) {
    const cont = continentPick()
    const country = countryPick(cont)
    const tool = toolPick()
    const task = taskPick(taskMix(cont, side === "dev"))
    const key = `${tool}|${task.id}`
    const phys = task.phys[tool]
    const honesty = task.honesty[tool]

    let success, stars
    if (phys === null) { // category not covered by this tool at all
      success = false
      stars = chance(0.8) ? 1 : 2
      if (chance(0.9)) painCount.P6 = (painCount.P6 ?? 0) + 1
    } else {
      success = chance(phys)
      if (success) {
        stars = pick([4, 4, 4, 5, 5, 5, 5])
        if (tool === "droidkit" && chance(0.03)) painCount.P4 = (painCount.P4 ?? 0) + 1
      } else {
        // failure: honesty decides the star outcome (documented review pattern)
        stars = chance(honesty) ? pick([3, 3, 4]) : pick([1, 1, 1, 2])
        if (chance(0.55)) {
          const p = pick(task.painFails)
          painCount[p] = (painCount[p] ?? 0) + 1
          if (tool === "paid" && chance(0.5)) painCount.P3 = (painCount.P3 ?? 0) + 1
          if (tool === "paid" && chance(0.3)) painCount.P5 = (painCount.P5 ?? 0) + 1
        }
      }
    }
    if (tool === "droidkit") for (const [id, label, p] of OUR_EXTRA) if (chance(p)) ourPain[id] = (ourPain[id] ?? 0) + 1

    // aggregates
    agg[tool] ??= { n: 0, stars: 0, success: 0, covered: 0 }
    agg[tool].n++; agg[tool].stars += stars
    if (phys !== null) { agg[tool].covered++; if (success) agg[tool].success++ }
    byContinent[cont.name] ??= {}; byContinent[cont.name][tool] ??= { s: 0, n: 0, stars: 0 }
    const bc = byContinent[cont.name][tool]; bc.n++; bc.stars += stars; if (success) bc.s++
    byTaskTool[key] ??= { n: 0, stars: 0, success: 0 }
    byTaskTool[key].n++; byTaskTool[key].stars += stars; if (success) byTaskTool[key].success++
    if (chance(0.02)) { // 2% leave comments
      const pool = success ? COMMENTS.good : (chance(honesty ?? 0) ? COMMENTS.honestFail : COMMENTS.silentFail)
      comments.push({ tool, task: task.label, country, stars, text: pick(pool) })
    }
  }
}

const pct = (a, b) => b ? `${(100 * a / b).toFixed(1)}%` : "—"
const report = {
  generated: new Date().toISOString(),
  label: "SYNTHETIC MODEL — not real users. Physics-grounded assumptions; deterministic seed; structure is the lesson, not the digits.",
  agents: { users: USERS, developers: DEVS },
  continents: CONTINENTS.map(c => c.name),
  overall: Object.fromEntries(TOOLS.map(t => [t, {
    sessions: agg[t].n,
    categoriesCoveredShare: pct(agg[t].covered, agg[t].n),
    successShareWhereCovered: pct(agg[t].success, agg[t].covered),
    avgStars: (agg[t].stars / agg[t].n).toFixed(2),
  }])),
  byContinent: Object.fromEntries(Object.entries(byContinent).map(([c, tools]) => [c,
    Object.fromEntries(Object.entries(tools).map(([t, v]) => [t, { n: v.n, success: pct(v.s, v.n), avgStars: (v.stars / v.n).toFixed(2) }]))])),
  painRanking: Object.entries(painCount).map(([k, v]) => ({ pain: PAINS[k], reports: v })).sort((a, b) => b.reports - a.reports),
  droidkitOwnPains: Object.entries(ourPain).map(([k, v]) => ({ pain: OUR_EXTRA.find(e => e[0] === k)[1], reports: v })).sort((a, b) => b.reports - a.reports),
  sampledComments: comments.slice(0, 400),
}

fs.mkdirSync("docs/simulations", { recursive: true })
fs.writeFileSync("docs/simulations/market-2026-08-12.json", JSON.stringify(report, null, 2))

console.log(`\n=== MARKET SIMULATION — ${USERS.toLocaleString()} users + ${DEVS.toLocaleString()} devs (synthetic, seeded) ===`)
for (const t of TOOLS) {
  const a = agg[t]
  console.log(`${t.padEnd(10)} sessions ${String(a.n).padStart(6)} | covered ${pct(a.covered, a.n).padStart(6)} | success@covered ${pct(a.success, a.covered).padStart(7)} | avg stars ${(a.stars / a.n).toFixed(2)}`)
}
console.log("\nTop market pains:")
report.painRanking.slice(0, 6).forEach((p, i) => console.log(`  ${i + 1}. (${p.reports.toLocaleString()}) ${p.pain}`))
console.log("\nDroidKit's OWN top pains (we log ours too):")
report.droidkitOwnPains.slice(0, 4).forEach((p, i) => console.log(`  ${i + 1}. (${p.reports.toLocaleString()}) ${p.pain}`))
console.log("\nwrote docs/simulations/market-2026-08-12.json")
