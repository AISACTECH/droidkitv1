// =====================================================================
// Local CI runner (`npm run ci` / `npm run ci:fast`)
// --------------------------------------------------------------------
// The GitHub App token cannot create `.github/workflows/ci.yml`.
// This script is the same gate, runnable anywhere Node 22 exists —
// including this sandbox, a laptop, and a pre-push hook.
//
//   npm run ci:fast   doctor + lint + bench + adaptive + research
//   npm run ci        the full frontend matrix (no Rust required)
// =====================================================================

import { spawnSync } from "node:child_process"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const fast = process.argv.includes("--fast")

const FAST: [string, string[]][] = [
  ["doctor", ["npm", "run", "doctor"]],
  ["lint (tsc --noEmit)", ["npm", "run", "lint"]],
  ["test:bench", ["npm", "run", "test:bench"]],
  ["test:adaptive", ["npm", "run", "test:adaptive"]],
  ["test:research", ["npm", "run", "test:research"]],
  ["release:prepare", ["npm", "run", "release:prepare"]],
]

const FULL: [string, string[]][] = [
  ...FAST,
  ["build", ["npm", "run", "build"]],
  ["test-all", ["node", "scripts/test-all.js"]],
  ["test:lab", ["npm", "run", "test:lab"]],
  ["test:nck", ["npm", "run", "test:nck"]],
  ["test:rescue", ["npm", "run", "test:rescue"]],
  ["test:core", ["npm", "run", "test:core"]],
  ["test:matrix", ["npm", "run", "test:matrix"]],
  ["test:brands", ["npm", "run", "test:brands"]],
  ["benchmark:frp", ["npm", "run", "benchmark:frp"]],
  ["benchmark:sheet", ["npm", "run", "benchmark:sheet"]],
  ["audit:prod", ["npm", "run", "audit:prod"]],
]

const jobs = fast ? FAST : FULL
console.log(`Paralock local CI (${fast ? "fast" : "full"}) — ${jobs.length} gates\n`)

let failed = 0
for (const [name, [cmd, ...args]] of jobs) {
  process.stdout.write(`→ ${name} … `)
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", env: process.env })
  if (r.status === 0) {
    console.log("ok")
  } else {
    failed++
    console.log("FAIL")
    const tail = (r.stdout || "") + (r.stderr || "")
    console.log(tail.split(/\r?\n/).slice(-40).join("\n"))
  }
}

console.log(failed === 0
  ? `\n✅ local CI ${fast ? "fast" : "full"} green`
  : `\n❌ ${failed} gate(s) failed`)
process.exit(failed === 0 ? 0 : 1)
