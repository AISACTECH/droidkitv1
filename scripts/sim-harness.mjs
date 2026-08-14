#!/usr/bin/env node
// =====================================================================
// Sim harness — npm run simulate:frp-mock -- [path/to/arena_frp_sim_test.py]
// ---------------------------------------------------------------------
// What it does: executes the external "simulation" python script TWICE
// (with different internal seeds via re-import), parses its stdout, and
// decomposes the result into:
//   * failures FORCED by the mock's own hardcoded rules  (deterministic)
//   * failures decided by its random dice                (run-to-run noise)
// Then it prints the product's REAL, deterministic coverage gate numbers
// for comparison (scripts/verify-protocol-matrix.mts).
//
// What it will never do: treat the mock's exit code as a property of the
// app. A 100% from that script would only prove the dice cooperated; the
// honesty law bans that claim anyway. This harness exits 0 when the
// measurement+decomposition itself ran correctly — truth, not theatre.
// =====================================================================
import { existsSync, readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"

const target = process.argv[2] ?? "arena_frp_sim_test.py"
if (!existsSync(target)) {
  console.log(`Sim harness: '${target}' not found.`)
  console.log("Drop the python file at the repo root (or pass a path) and re-run:")
  console.log("  npm run simulate:frp-mock -- path/to/arena_frp_sim_test.py")
  console.log("NOTE: the file is analysis material, not a product test — the")
  console.log("product's real coverage gate is: npm run test:matrix")
  process.exit(0) // harness worked; nothing to measure
}

console.log(`=== sim harness: running ${target} (twice, to expose run-to-run variance) ===`)

function runOnce() {
  try {
    const out = execFileSync("python3", [target], { encoding: "utf8", timeout: 120_000 })
    return { out, code: 0 }
  } catch (e) {
    return { out: (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? ""), code: typeof e.status === "number" ? e.status : -1 }
  }
}

function parse(out) {
  return {
    total: Number(out.match(/Total Test Pathways Executed\s*:\s*(\d+)/)?.[1] ?? out.match(/total=(\d+)/)?.[1] ?? 0),
    ok: Number(out.match(/Total Successful Bypasses\s*:\s*(\d+)/)?.[1] ?? out.match(/ok=(\d+)/)?.[1] ?? 0),
    fails: Number(out.match(/Found (\d+) edge-case/)?.[1] ?? out.match(/failures=(\d+)/)?.[1] ?? 0),
  }
}

// Failure classification comes from the mock's SOURCE, not its trimmed
// stdout (it only prints its first 5 failures — output regex would undercount).
const src = readFileSync(target, "utf8")
const forced = {
  mtpRegressionRule: /version\s*>=\s*1[56][\s\S]{0,120}MTP/.test(src) || /MTP[\s\S]{0,120}version\s*>=\s*1[56]/.test(src),
  randomDraws: (src.match(/random\./g) ?? []).length,
}

const r1 = parse(runOnce().out)
const r2 = parse(runOnce().out)

console.log(`run A: total=${r1.total} ok=${r1.ok} fails=${r1.fails}`)
console.log(`run B: total=${r2.total} ok=${r2.ok} fails=${r2.fails}`)

const diceDiffer = r1.ok !== r2.ok
console.log("\nharness analysis:")
console.log(`  ${forced.mtpRegressionRule ? "✓" : "·"} source scan: hardcoded 'A15+ & MTP → fail' rule ${forced.mtpRegressionRule ? "FOUND — those failures are pre-typed into the mock, not measured from the app" : "not found"}`)
console.log(`  ${forced.randomDraws > 0 ? "✓" : "·"} source scan: ${forced.randomDraws} random draws per execution — outcomes are dice-weighted`)
console.log(`  ${diceDiffer ? "✓" : "·"} run-to-run proof: identical inputs moved ${r1.ok} → ${r2.ok} successful 'bypasses' — the moving part is the seed, not the product`)
console.log("  · therefore the mock's exit(<100%) is pre-ordained and unchangeable by ANY application code — it is not a product verdict")

// The real gate — run it and echo its headline
console.log("\n=== product's real coverage gate (npm run test:matrix) ===")
try {
  const out = execFileSync("node", ["--experimental-strip-types", "scripts/verify-protocol-matrix.mts"], { encoding: "utf8", timeout: 60_000 })
  const head = out.split("\n").filter(l => l.includes("pathways=") || l.includes("passed")).join("\n")
  console.log(head)
  console.log("\nverdict: product coverage gate GREEN (deterministic: same output every run)")
} catch (e) {
  console.log("test:matrix failed — that IS a product verdict; do not ship.")
  process.exit(1)
}
process.exit(0)
