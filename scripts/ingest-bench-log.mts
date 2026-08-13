// =====================================================================
// Bench-log ingest CLI (`npm run bench:ingest -- path/to/log.json`)
// --------------------------------------------------------------------
// Reads a structured pack, a Patch Oracle export, or a calibration
// sentence file. Prints the promotion proposal. Never writes official
// labels. Exit 0 on a valid parse (even if the proposal is "none");
// exit 1 on a schema/parse failure.
// =====================================================================

import { readFileSync } from "node:fs"
import { ingestBenchLog } from "../src/lib/bench/index.ts"

const path = process.argv[2]
if (!path || path === "--help" || path === "-h") {
  console.log("Usage: npm run bench:ingest -- <file.json|file.txt>")
  console.log("Accepts droidkit-bench-evidence packs, Patch Oracle exports, or calibration sentences.")
  process.exit(path ? 0 : 2)
}

const rawText = readFileSync(path, "utf8")
let raw: unknown = rawText
try { raw = JSON.parse(rawText) } catch { /* keep as string — sentence parser handles it */ }

const result = ingestBenchLog(raw)
if (result.errors.length) {
  console.error("Ingest errors:")
  for (const e of result.errors) console.error(`  ❌ ${e}`)
}
console.log(`Records: ${result.records.length}`)
for (const r of result.records) {
  console.log(`  • ${r.deviceId}  ${r.result}  attempts=${r.attemptsBefore}  donor=${r.donorOwned}  src=${r.source}`)
}
console.log("Promotion proposals (officialFlipAllowed is always false):")
if (result.proposals.length === 0) console.log("  (none — no hardware records, or only virtual-replay)")
for (const p of result.proposals) {
  console.log(`  • ${p.deviceId}: ${p.kind} — ${p.reason}`)
}
process.exit(result.ok ? 0 : 1)
