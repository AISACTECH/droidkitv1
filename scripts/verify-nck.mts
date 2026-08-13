// Ground-truth verification for src/lib/nck-modem.ts
// Run: npm run test:nck
import { createHash } from "node:crypto"
import { crc32 as nodeCrc32 } from "node:zlib"
import { md5Hex, crc32, checkImei, huaweiCandidates, algoSelfTest } from "../src/lib/nck-modem.ts"

let failures = 0
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`)
  if (!ok) failures++
}

// ---- MD5 vs node:crypto ----
for (const s of ["", "abc", "The quick brown fox jumps over the lazy dog", "867648011803309"])
  check(`md5(${JSON.stringify(s)})`, md5Hex(s), createHash("md5").update(s).digest("hex"))

// ---- CRC32 vs node:zlib ----
for (const s of ["", "abc", "968480435684491", "867648011803309"])
  check(`crc32(${JSON.stringify(s)})`, crc32(s), nodeCrc32(s))

// ---- IMEI Luhn ----
check("valid IMEI passes Luhn", checkImei("867648011803309").ok, true)
check("mistyped IMEI fails Luhn", checkImei("867648011803300").ok, false)
check("short IMEI rejected", checkImei("12345").ok, false)

// ---- REAL published vector #1 (xnuxer/huawei-modem-calc README) ----
// IMEI 867648011803309 → Unlock 34560983, Flash 34591526
const r1 = huaweiCandidates("867648011803309")
check("V1 NCK = real published example", r1.candidates[0].code, "34560983")
check("V1 flash = real published example", r1.candidates[1].code, "34591526")

// ---- REAL published vector #2 (ket-c calc.php header testdata) ----
// IMEI 968480435684491 → NCK V2: 23823444
const r2 = huaweiCandidates("968480435684491")
check("V2 NCK = real published example", r2.candidates[2].code, "23823444")

// ---- structural sanity on every code ----
for (const c of r1.candidates) check(`${c.algo} is 8 digits`, /^\d{8}$/.test(c.code), true)
for (const c of r2.candidates) check(`${c.algo} is 8 digits`, /^\d{8}$/.test(c.code), true)

console.log(`\nself-test: ${algoSelfTest()}`)
console.log(failures === 0 ? "ALL CHECKS GREEN" : `${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
