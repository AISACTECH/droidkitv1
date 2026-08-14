#!/usr/bin/env node
/**
 * Perf report — npm run perf:report (run AFTER npm run build)
 * Measures real gzip wire sizes of the production bundle and checks them
 * against honest budgets. Informational, exit 0 always (a report, not a wall;
 * CI's real walls are tsc + the test gates).
 */
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"

const dir = "dist/assets"
if (!fs.existsSync(dir)) { console.log("dist/ missing — run npm run build first"); process.exit(0) }

const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") || f.endsWith(".css"))
const rows = files.map(f => {
  const buf = fs.readFileSync(path.join(dir, f))
  return { file: f, raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length }
}).sort((a, b) => b.gzip - a.gzip)

const budgets = [
  { match: /^views-/, gzipKB: 85, why: "all app views incl. Rescue Lab + Patch Oracle" },
  { match: /^vendor-react-/, gzipKB: 75, why: "react + react-dom" },
  { match: /^vendor-radix-/, gzipKB: 40, why: "UI primitives" },
  { match: /^index-/, gzipKB: 45, why: "entry" },
]

const kb = n => `${(n / 1024).toFixed(1)} kB`
let allOk = true
console.log("\n=== bundle perf report (measured on THIS machine, this build) ===")
for (const r of rows) {
  const b = budgets.find(b => b.match.test(r.file))
  const flag = b ? (r.gzip <= b.gzipKB * 1024 ? "✅" : (allOk = false, "⚠️ OVER BUDGET")) : ""
  console.log(`${r.file.padEnd(42)} raw ${kb(r.raw).padStart(9)}  gzip ${kb(r.gzip).padStart(9)} ${flag}${b ? `  (budget ${b.gzipKB}kB — ${b.why})` : ""}`)
}
const total = rows.reduce((a, r) => a + r.gzip, 0)
console.log(`\nTOTAL gzip on wire: ${kb(total)}  (media/print excluded; first load is below ~${kb(total)})`)
console.log(allOk ? "ALL BUDGETS GREEN" : "budget overruns noted above — informational only")
