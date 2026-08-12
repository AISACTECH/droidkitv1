// =====================================================================
// Modem NCK generator — LEGACY Huawei era (unlock code + flash code)
// ---------------------------------------------------------------------
// Physics note that matters: a modem/pocket-WiFi checks its NCK LOCALLY,
// inside the device. No carrier server, no Google, no Apple — which is
// why these codes are computable at all, and why a locked MiFi from a
// carrier that no longer exists (Orange KE, Telkom-era devices) is a
// perfectly legitimate, 100%-legal-to-free device.
//
// Implementation: faithful clean-room port of the long-public algorithm
// reference (ket-c/huaweiv3calculator calc.php; corroborated by
// xnuxer/huawei-modem-calc which published a real worked example we use
// as a unit-test vector: IMEI 867648011803309 → NCK 34560983, flash
// 34591526; and the calc.php header vector IMEI 968480435684491 → V2
// 23823444). Verified by scripts/verify-nck.mts.
//
// SAFETY LAW (shown in UI, non-negotiable): locked modems have attempt
// counters. Read remaining attempts FIRST (AT^CARDLOCK? on Huawei;
// AT+CLCK="PN",2 elsewhere), confirm the device's generation, enter ONE
// candidate that matches the era, and stop after any rejection. Never
// burn attempts on guesses.
// =====================================================================

import { sha1Hex } from "./gesture-crack.ts"

// ---------- MD5 (RFC 1321, pure, verified against node:crypto) ----------

const MD5_K: number[] = (() => {
  const k: number[] = []
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
  return k
})()
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

function md5Digest(bytes: number[]): Uint8Array {
  const srcLen = bytes.length
  const withOne = srcLen + 1
  const padZeros = (56 - (withOne % 64) + 64) % 64
  const total = withOne + padZeros + 8
  const msg = new Uint8Array(total)
  for (let i = 0; i < srcLen; i++) msg[i] = bytes[i] & 0xff
  msg[srcLen] = 0x80
  const bitLen = srcLen * 8
  // little-endian 64-bit bit length
  for (let i = 0; i < 8; i++) msg[total - 8 + i] = (bitLen / 2 ** (8 * i)) & 0xff

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476

  for (let off = 0; off < total; off += 64) {
    const m: number[] = []
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4
      m[i] = (msg[j] | (msg[j + 1] << 8) | (msg[j + 2] << 16) | (msg[j + 3] << 24)) >>> 0
    }
    let a = a0, b = b0, c = c0, d = d0
    for (let i = 0; i < 64; i++) {
      let f: number, g: number
      if (i < 16) { f = (b & c) | (~b & d); g = i }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16 }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16 }
      else { f = c ^ (b | ~d); g = (7 * i) % 16 }
      const tmp = d
      d = c
      c = b
      const sum = (a + f + MD5_K[i] + m[g]) >>> 0
      b = (b + (((sum << MD5_S[i]) | (sum >>> (32 - MD5_S[i]))) >>> 0)) >>> 0
      a = tmp
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0
  }

  const out = new Uint8Array(16)
  const words = [a0, b0, c0, d0]
  for (let i = 0; i < 4; i++) {
    out[i * 4] = words[i] & 0xff
    out[i * 4 + 1] = (words[i] >>> 8) & 0xff
    out[i * 4 + 2] = (words[i] >>> 16) & 0xff
    out[i * 4 + 3] = (words[i] >>> 24) & 0xff
  }
  return out
}

const strBytes = (s: string): number[] => [...s].map(c => c.charCodeAt(0) & 0xff)

export function md5Hex(s: string): string {
  return [...md5Digest(strBytes(s))].map(b => b.toString(16).padStart(2, "0")).join("")
}

// ---------- CRC-32 (IEEE, same table PHP/zlib use) ----------

const CRC_TABLE: number[] = (() => {
  const t: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(s: string): number {
  let crc = 0xffffffff
  for (let i = 0; i < s.length; i++) crc = CRC_TABLE[(crc ^ s.charCodeAt(i)) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// ---------- IMEI validation (Luhn) — careful input, per bench law ----------

export interface ImeiCheck {
  ok: boolean
  reason: string
}

export function checkImei(imeiRaw: string): ImeiCheck {
  const imei = imeiRaw.replace(/\D/g, "")
  if (imei.length !== 15) return { ok: false, reason: "IMEI must be exactly 15 digits (find it on the sticker under the battery, or AT+CGSN)." }
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let d = Number(imei[i])
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  if (sum % 10 !== 0) return { ok: false, reason: "That IMEI fails its own checksum (Luhn) — a digit was mistyped. Re-read it; never guess." }
  return { ok: true, reason: "IMEI valid (checksum passed)" }
}

// ---------- Huawei V1 (legacy dongles): NCK + flash code ----------

function v1Core(imei: string, saltWord: string): string {
  const constSalt = md5Hex(saltWord).slice(8, 24)
  const m = md5Digest(strBytes(imei + constSalt))
  const code: number[] = []
  for (let i = 0; i < 4; i++) code[i] = m[3 - i] ^ m[7 - i] ^ m[15 - i] ^ m[11 - i]
  const nck = (((code[3] << 24) | (code[2] << 16) | (code[1] << 8) | code[0]) & 0x1ffffff) | 0x2000000
  return String(nck >>> 0).padStart(8, "0")
}

// ---------- V2 / V201 sub-algorithms (faithful port) ----------

function algo0(imei: string, v201: boolean): string {
  const tableV2 = [0x001966a9, 0x0021058f, 0x002aeda9, 0x0037ce91, 0x00488c9f, 0x005e507d, 0x007a9be5, 0x009f644b, 0x00cf35a1, 0x010d5f55, 0x015e2f25, 0x01c73d6b, 0x024fcfdd, 0x03015b47, 0x03e829e9]
  const table201 = [0x006e9c2a, 0x03ca2b3c, 0x001080dc, 0x030855ee, 0x03d3283a, 0x02f4f85a, 0x01f8808e, 0x03147d10, 0x034bbbb5, 0x029eeadd, 0x02318616, 0x050f3adc, 0x00d11f38, 0x02123bd2, 0x04276c86, 0x0355caad]
  const table = v201 ? table201 : tableV2
  let s = 0
  for (let i = 0; i < 15; i++) s += (Number(imei[i]) + 0x30) * table[i]
  const code: number[] = []
  for (let i = 0; i <= 7; i++) code[i] = Math.floor(s / 2 ** (4 * i)) % 16 % 10
  if (code[0] === 0) code[0] = 1
  return code.join("")
}

function algo1(imei: string): string {
  let crc = crc32(imei)
  if (crc & 0x80000000) crc = (0x100000000 - crc) >>> 0
  let nck = String(crc).slice(-8).padStart(8, "9")
  if (nck[0] === "0") nck = "9" + nck.slice(1)
  return nck
}

function algo2(imei: string, v201: boolean): string {
  const m = md5Digest(strBytes(imei))
  const bytes = [...m.slice(v201 ? 5 : 0, (v201 ? 5 : 0) + 8)]
  // byte 0 special: a = b % 10; digit = a != 0 ? a : 5
  const digits: string[] = []
  for (let i = 0; i < 8; i++) {
    const b = i === 0 ? (bytes[0] % 10 !== 0 ? bytes[0] % 10 : 5) : bytes[i]
    // PHP semantics: ASCII '1'..'8' pass through as themselves; everything else → b % 10
    if (i !== 0 && b >= 49 && b <= 56) digits.push(String.fromCharCode(b))
    else digits.push(String(b % 10))
  }
  return digits.join("")
}

function algo3(imei: string, v201: boolean): string {
  const saltWord = v201 ? "dfkdkfllekkodk" : "hwideadatacard"
  const constBin = md5Digest(strBytes(saltWord))
  const m = md5Digest(strBytes(imei) .concat([...constBin]))
  const code: number[] = []
  for (let i = 0; i < 4; i++) code[i] = m[i] ^ m[i + 4] ^ m[i + 8] ^ m[i + 12]
  const nck = ((((code[0] << 24) | (code[1] << 16) | (code[2] << 8) | code[3]) >>> 0) & 0x1ffffff) | 0x2000000
  return String(nck >>> 0).padStart(8, "0")
}

function algo4(imei: string): string {
  const magic = "5739146280098765432112345678905"
  const code = strBytes(imei + "Z") // 16 bytes
  for (let i = 0; i < 8; i++) code[i] = code[i] ^ code[i + 8]
  const out: string[] = []
  for (let i = 0; i < 8; i++) out.push(magic[(code[i] & 0x0f) + (code[i] >> 4)])
  if (out[0] === "0") {
    let i = 0
    for (; i < 8; i++) if (out[i] !== "0") break
    out[0] = String(i)
  }
  return out.join("").slice(0, 8)
}

function algo5(imei: string, offset: 0 | 4 | 8): string {
  const hex = sha1Hex(strBytes(imei))
  const d = (o: number) => parseInt(hex.slice(o * 2, o * 2 + 8), 16) >>> 0 // BE u32 at byte offset
  const a = d(offset)
  const b = d(offset + 4)
  return (String(a) + String(b)).slice(0, 8)
}

function algo6(imei: string, v201: boolean): string {
  const magic = v201
    ? [0x0b, 0x0d, 0x11, 0x13, 0x17, 0x1d, 0x1f, 0x25, 0x29, 0x2b, 0x3b, 0x61]
    : [0x01, 0x01, 0x02, 0x03, 0x05, 0x08, 0x0d, 0x15, 0x22, 0x37, 0x59, 0x90]
  const buffer = new Uint8Array(128)
  for (let i = 0; i < 15; i++) {
    const ch = imei.charCodeAt(i)
    buffer[i] = ((ch >> ((i % 3) + 2)) | (ch << (6 - (i % 3)))) & 0xff
  }
  let sum1 = 0
  for (let i = 0; i < 7; i++) sum1 += (buffer[i] << 8) + buffer[14 - i]
  sum1 += buffer[8]
  for (let i = 0x0f, j = 0; i < 0x80; i++, j++) {
    let var34 = Math.floor(i / 12)
    const var38 = (i + var34) % 12
    const r1 = j % 12
    if (var34 < 2) var34 += r1
    else var34 = r1 + var34 * 13 - 24
    const idxA = j !== 0 ? sum1 % j : (sum1 % i) + 1
    let r0 = (0xffffffff - buffer[idxA]) >>> 0
    r0 = (r0 | buffer[sum1 % i]) >>> 0
    buffer[i] = (r0 | (buffer[var34] & magic[var38])) & 0xff
  }
  let sum2 = 0
  for (let i = 0; i < 7; i++) sum2 += (imei.charCodeAt(i) << 8) | imei.charCodeAt(i + 1)
  sum2 += imei.charCodeAt(14)

  const md5bin = md5Digest([...buffer])
  const idx = sum2 & 3
  const le32 = (bytes: Uint8Array, o: number) =>
    (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
  let hashUnit = le32(md5bin, idx * 4)

  const dest: string[] = []
  for (let i = 0; i < 16 && dest.length < 8; i++) {
    const ch = String.fromCharCode(md5bin[i])
    if (ch >= "0" && ch <= "9") dest.push(ch)
  }
  let refill = false
  let guard = 0
  while (dest.length < 8) {
    if (hashUnit === 0) {
      if (refill) break
      refill = true
      hashUnit = le32(md5bin, (3 - idx) * 4)
      if (hashUnit === 0) break
      continue
    }
    dest.push(String(hashUnit % 10))
    hashUnit = Math.floor(hashUnit / 10)
    if (hashUnit === 0 && !refill) {
      refill = true
      hashUnit = le32(md5bin, (3 - idx) * 4)
    }
    if (++guard > 40) break
  }
  const out = dest.slice(0, 8)
  while (out.length < 8) out.push("0")
  if (out[0] === "0") out[0] = String(((sum2 ? md5bin[1] : md5bin[0]) & 7) + 1)
  return out.join("")
}

function algoSelector(imei: string, v201: boolean): number {
  let x = 0
  for (let i = 0; i < 15; i++) {
    const c = imei.charCodeAt(i)
    x += v201 ? (c + i + 1) * c * (c + 313) : (c + i + 1) * (i + 1)
  }
  return x % 7
}

// ---------- public API ----------

export interface NckCandidate {
  algo: string
  era: string
  code: string
  verified: boolean
  note: string
}

export interface NckResult {
  imei: string
  candidates: NckCandidate[]
}

export function huaweiCandidates(imeiRaw: string): NckResult {
  const imei = imeiRaw.replace(/\D/g, "")
  const sel2 = algoSelector(imei, false)
  const sel201 = algoSelector(imei, true)
  const v2Algos: ((im: string) => string)[] = [
    im => algo0(im, false),
    im => algo1(im),
    im => algo2(im, false),
    im => algo3(im, false),
    im => algo4(im),
    im => algo5(im, 0),
    im => algo6(im, false),
  ]
  const v201Algos: ((im: string) => string)[] = [
    im => algo0(im, true),
    im => algo1(im),
    im => algo2(im, true),
    im => algo3(im, true),
    im => algo5(im, 4),  // v201 sub-4 → "2015" offset (per reference switch)
    im => algo5(im, 8),  // v201 sub-5 → "2016" offset
    im => algo6(im, true),
  ]
  const v2code = v2Algos[sel2](imei)
  const v201code = v201Algos[sel201](imei)

  return {
    imei,
    candidates: [
      {
        algo: "V1 (oldest)",
        era: "pre-2010 3G USB dongles (E1550/E160/E1750 era) + many dashboards",
        code: v1Core(imei, "hwe620datacard"),
        verified: true,
        note: "Unit-verified against the published worked example (xnuxer). If the modem is this old, this is usually THE code.",
      },
      {
        algo: "FLASH code (not an unlock!)",
        era: "same legacy era — only for firmware flashing when the updater asks",
        code: v1Core(imei, "e630upgrade"),
        verified: true,
        note: "Entering this as an unlock code BURNS AN ATTEMPT for nothing. Only use when a firmware updater explicitly asks for a flash code.",
      },
      {
        algo: `V2 (sub-algorithm ${sel2})`,
        era: "~2010–2012 dongles & early pocket WiFi (E173 era)",
        code: v2code,
        verified: true,
        note: "Unit-verified against the calc.php header vector. Common on 2010-2012 stock.",
      },
      {
        algo: `V201/V3 (sub-algorithm ${sel201})`,
        era: "2012+ dongles & E5 MiFis (E3131/E3276/E5330/E5372-class)",
        code: v201code,
        verified: false,
        note: "Faithful port of the public v201 reference, but we publish NO test vector claim for it — bench-confirm on a donor unit first and log the result (Patch Oracle bench log). Labelled UNVERIFIED on purpose.",
      },
    ],
  }
}

/** Tiny self-test string for quick UI display (real assertions live in scripts/verify-nck.mts). */
export function algoSelfTest(): string {
  const ok = huaweiCandidates("867648011803309").candidates[0].code === "34560983"
    && huaweiCandidates("968480435684491").candidates[2].code === "23823444"
    && md5Hex("abc") === "900150983cd24fb0d6963f7d28e17f72"
  return ok ? "vectors green (v1 + v2 real-world examples)" : "VECTOR FAILURE — do not trust output"
}

/** Era hint from the IMEI prefix is guesswork — we present era by MODEL,
 *  the UI asks the model. This helper stays conservative. */
export const HUAWEI_ATTEMPTS_WARNING =
  "ATTEMPT COUNTER: Huawei modems allow limited wrong-code attempts (often 10; Alcatel often only ~3-10, ZTE ~5). Read remaining attempts FIRST (AT^CARDLOCK? shows them on Huawei). Enter ONE code matching the device's era/model. If it's rejected, STOP — research, don't guess. A counter at 0 can mean a permanent lock."
