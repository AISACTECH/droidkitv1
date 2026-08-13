// =====================================================================
// FRP Adaptive Engine — update-pack validator CLI (WBS CA3)
// ---------------------------------------------------------------------
// Usage: node --experimental-strip-types scripts/validate-update-pack.mts path/to/pack.json
// Exit 0 = valid, 1 = rejected. Same validator the CI gate uses.
// =====================================================================

import { readFileSync, existsSync } from "node:fs"
import { validateUpdatePack } from "../src/lib/adaptive-engine/index.ts"

const arg = process.argv[2]
if (!arg) {
  console.log("Usage: node --experimental-strip-types scripts/validate-update-pack.mts path/to/pack.json")
  process.exit(2)
}
if (!existsSync(arg)) {
  console.error(`No such file: ${arg}`)
  process.exit(1)
}

let payload: unknown
try {
  payload = JSON.parse(readFileSync(arg, "utf8"))
} catch (e) {
  console.error(`Not valid JSON: ${String(e)}`)
  process.exit(1)
}

const result = validateUpdatePack(payload)
console.log(result.summary)
for (const err of result.errors) console.log(`  ❌ ${err}`)
console.log(result.ok ? "✅ VALID — merge → run test:adaptive → ship" : "❌ REJECTED")
process.exit(result.ok ? 0 : 1)
