// =====================================================================
// Concurrency contract tests — npm run test:concurrency
// ---------------------------------------------------------------------
// Proves the app's "works in parallel" definition without altering
// behavior:
//
//   A. mapWithConcurrency — order + results are IDENTICAL to a sequential
//      map for the same inputs; concurrency is bounded by the limit.
//   B. mapWithConcurrencySettled — every item runs to completion even
//      when some reject; per-item outcomes are index-aligned.
//   C. parallelAll — factories are scheduled under a cap; order kept.
//   D. adaptive-engine — evaluateParallelLanesConcurrent (async, truly
//      parallel lanes) deep-equals evaluateParallelLanes (sync) for the
//      same fingerprints: parallelism changes WHEN, never WHAT.
//
// Deterministic: fixed inputs, no RNG, no wall-clock assumptions beyond
// "a delayed task finishes after a non-delayed one".
// =====================================================================
import {
  mapWithConcurrency,
  mapWithConcurrencySettled,
  parallelAll,
  normalizeLimit,
  isPromiseLike,
} from "../src/lib/concurrency.ts"
import {
  evaluateParallelLanes,
  evaluateParallelLanesConcurrent,
} from "../src/lib/adaptive-engine/index.ts"
import type { Fingerprint } from "../src/lib/adaptive-engine/index.ts"

let passed = 0
let failed = 0
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}`) }
}

function fp(overrides: Partial<Fingerprint> = {}): Fingerprint {
  return {
    brand: "samsung", brandRaw: "samsung", modelCode: "SM-A155F", marketingName: "Galaxy A15",
    chipsetFamily: "MediaTek", chipsetName: "mt6789",
    androidMajor: 15, androidVersionRaw: "15", sdkVersion: "35", securityPatch: "2025-09-01",
    binaryVersion: "U18", bootloaderVersion: "A155FXXS1AXA1",
    buildFingerprint: "samsung/a15nnxx/a15:15/REL:user/release-keys", knoxVersion: "3.9",
    frpState: "Active", adbState: "Unauthorized", deviceMode: "Normal", hasSim: true, hasWifi: true,
    ...overrides,
  }
}

// ============== A · mapWithConcurrency ==============
console.log("\nA. mapWithConcurrency — order & result identity")
{
  const items = Array.from({ length: 25 }, (_, i) => i)
  const mapper = async (x: number) => x * x

  const sequential = await Promise.all(items.map((x) => mapper(x)))
  const concurrent = await mapWithConcurrency(items, 4, mapper)
  check("identical results to Promise.all(map)", JSON.stringify(sequential) === JSON.stringify(concurrent))
  check("order preserved (index-aligned)", concurrent.every((v, i) => v === items[i] ** 2))

  // bounded concurrency: never more than `limit` mappers in flight
  let inFlight = 0
  let maxInFlight = 0
  const tracked = await mapWithConcurrency(items, 3, async (x) => {
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise((r) => setTimeout(r, x % 5))
    inFlight--
    return x
  })
  check("never exceeds the concurrency limit", maxInFlight <= 3)
  check("workers actually run in parallel (cap > 1 reached)", maxInFlight >= 2)
  check("all items processed exactly once", tracked.length === items.length && JSON.stringify(tracked) === JSON.stringify(items))

  const empty = await mapWithConcurrency([], 4, async (x: number) => x)
  check("empty input → empty output", empty.length === 0)

  // fail-fast semantics match Promise.all
  let failCaught = false
  try {
    await mapWithConcurrency([1, 2, 3], 2, async (x) => {
      if (x === 2) throw new Error("boom")
      return x
    })
  } catch {
    failCaught = true
  }
  check("fail-fast on first rejection (Promise.all semantics)", failCaught)
}

// ============== B · settled variant ==============
console.log("\nB. mapWithConcurrencySettled — error isolation")
{
  const items = ["a", "b", "c", "d"]
  const results = await mapWithConcurrencySettled(items, 2, async (s, i) => {
    if (i % 2 === 1) throw new Error(`bad:${s}`)
    return s.toUpperCase()
  })
  check("every item processed (none skipped on sibling error)", results.length === 4)
  check("index-aligned outcomes", JSON.stringify(results.map((r) => r.status)) === JSON.stringify(["fulfilled", "rejected", "fulfilled", "rejected"]))
  check("values preserved", results[0].status === "fulfilled" && results[0].value === "A")
  check("reasons preserved", results[1].status === "rejected" && (results[1].reason as Error).message === "bad:b")
}

// ============== C · parallelAll ==============
console.log("\nC. parallelAll — bounded factory scheduling")
{
  const order: number[] = []
  const factories = Array.from({ length: 10 }, (_, i) => async () => {
    order.push(i)
    await new Promise((r) => setTimeout(r, i % 3))
    return i * 10
  })
  const out = await parallelAll(factories, 2)
  check("results in factory order", JSON.stringify(out) === JSON.stringify([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]))
  check("all factories ran exactly once", order.length === 10 && new Set(order).size === 10)

  const single = await parallelAll([async () => 1], 1)
  check("single factory", single[0] === 1)
  check("limit normalization clamps to ≥1", normalizeLimit(0) === 4 && normalizeLimit(-3) === 4 && normalizeLimit(NaN) === 4)
  check("limit normalization floors", normalizeLimit(2.9) === 2)
}

// ============== D · isPromiseLike ==============
console.log("\nD. isPromiseLike")
check("promise is promise-like", isPromiseLike(Promise.resolve(1)))
check("plain object is not", !isPromiseLike({}))
check("null is not", !isPromiseLike(null))
check("thenable is promise-like", isPromiseLike({ then: () => {} }))

// ============== E · adaptive-engine lanes: parallel ≡ sync ==============
console.log("\nE. evaluateParallelLanesConcurrent ≡ evaluateParallelLanes (behavior lock)")
{
  const corpus: Array<[string, Fingerprint]> = [
    ["A15 MTK patched (chipset_hardware)", fp({})],
    ["A12 ADB live (adb_live)", fp({ androidMajor: 12, androidVersionRaw: "12", sdkVersion: "31", securityPatch: "2021-11-01", binaryVersion: "U3", adbState: "Authorized" })],
    ["A16 unknown chipset (official_only)", fp({ androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01", chipsetFamily: "Unknown", chipsetName: "unknown" })],
    ["Pixel 9 (server-side lock)", fp({ brand: "google", brandRaw: "google", modelCode: "Pixel 9", marketingName: "Pixel 9", chipsetFamily: "Kirin", chipsetName: "tensor", androidMajor: 16, androidVersionRaw: "16", sdkVersion: "36", securityPatch: "2025-12-01" })],
    ["A13 Exynos (testmode_contested)", fp({ androidMajor: 13, androidVersionRaw: "13", sdkVersion: "33", securityPatch: "2023-05-01", chipsetFamily: "Exynos", chipsetName: "exynos850", binaryVersion: "U6" })],
  ]

  for (const [name, fingerprint] of corpus) {
    const sync = evaluateParallelLanes(fingerprint, {}, 7)
    const concurrent = await evaluateParallelLanesConcurrent(fingerprint, {}, 7)
    check(`[${name}] concurrent deep-equals sync`, JSON.stringify(sync) === JSON.stringify(concurrent))
    check(`[${name}] lanes order preserved`, concurrent.lanes.map((l) => l.algorithm).join(",") === sync.lanes.map((l) => l.algorithm).join(","))
    check(`[${name}] deterministic across two sync calls`, JSON.stringify(sync) === JSON.stringify(evaluateParallelLanes(fingerprint, {}, 7)))
  }
}

// ============== verdict ==============
console.log(`\n${failed === 0 ? `ALL ${passed} checks passed` : `${failed} failed`} — ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
console.log("CONCURRENCY CONTRACT GREEN")
