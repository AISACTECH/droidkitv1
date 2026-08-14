// Ground-truth verification for src/lib/gesture-crack.ts
// Run: node --experimental-strip-types scripts/verify-gesture-crack.mts
import { createHash } from "node:crypto"
import { sha1Hex, enumeratePatterns, crackGestureKey, PATTERN_LENGTH_COUNTS } from "../src/lib/gesture-crack.ts"

const nodeSha1 = (bytes: number[] | string): string =>
  createHash("sha1").update(typeof bytes === "string" ? bytes : Buffer.from(bytes)).digest("hex")

let failures = 0
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`)
  if (!ok) failures++
}

// 1) SHA-1 RFC vectors (strings)
check("sha1('')", sha1Hex([]), nodeSha1(""))
check("sha1('abc')", sha1Hex([97, 98, 99]), nodeSha1("abc"))
check("sha1(fox)", sha1Hex([..."The quick brown fox jumps over the lazy dog"].map(c => c.charCodeAt(0))),
  nodeSha1("The quick brown fox jumps over the lazy dog"))
check("sha1(56 bits exact boundary)", sha1Hex([...Array(56).fill(0x61)]), nodeSha1("a".repeat(56)))
check("sha1(64 bytes)", sha1Hex([...Array(64).fill(0x62)]), nodeSha1("b".repeat(64)))
// binary bytes (gesture.key material is binary, not text)
const bin = [0, 1, 2, 4, 200, 255, 7, 12, 90]
check("sha1(binary[0,1,2,4,200,255,7,12,90])", sha1Hex(bin), nodeSha1(bin))
check("sha1([0])", sha1Hex([0]), nodeSha1([0]))

// 2) pattern enumerator vs published forensic counts
const t0 = Date.now()
const { patterns, counts } = enumeratePatterns()
console.log(`enumerated ${patterns.length} patterns in ${Date.now() - t0}ms`)
check("counts per length", counts, PATTERN_LENGTH_COUNTS)
check("total patterns", patterns.length, 389112)
let minLen = 99, maxLen = 0
for (const p of patterns) { if (p.length < minLen) minLen = p.length; if (p.length > maxLen) maxLen = p.length }
check("min length", minLen, 4)
check("max length", maxLen, 9)
check("no duplicate dots inside a pattern",
  patterns.every(p => new Set(p).size === p.length), true)
check("no duplicate patterns", new Set(patterns.map(p => p.join(","))).size, patterns.length)

// 3) end-to-end crack round-trip: known gesture.key hashes
const known = [
  [0, 1, 2, 4],                    // classic L
  [2, 1, 0, 3, 6, 7, 8, 5, 4],     // valid 9-dot pattern (all moves legal)
  [6, 3, 0],  // length 3 — INVALID (below Android min) — must NOT crack
]
for (const pat of known.slice(0, 2)) {
  const hash = nodeSha1(pat)
  const r = crackGestureKey(hash)
  check(`crack ${JSON.stringify(pat)}`, r.found && JSON.stringify(r.pattern), JSON.stringify(pat).length ? JSON.stringify(pat) : "")
  console.log(`       cracked ${JSON.stringify(pat)} after ${r.searched} tries in ${r.ms}ms`)
}
const bad = crackGestureKey(nodeSha1(known[2]))
check("length-3 pattern correctly rejected (not in keyspace)", bad.found, false)
const garbage = crackGestureKey("not-a-hash")
check("garbage input handled", garbage.found, false)

console.log(failures === 0 ? "\nALL CHECKS GREEN" : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
