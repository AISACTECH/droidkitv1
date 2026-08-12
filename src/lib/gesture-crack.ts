// =====================================================================
// Gesture Key Cracker — LEGACY Android pattern lock offline tool
// ---------------------------------------------------------------------
// Honesty scope (repo law applies):
//   * Android ≤ ~8: /data/system/gesture.key = RAW UNSALTED SHA-1 over the
//     pattern's dot-index bytes. Fully crackable offline, in milliseconds
//     to seconds, by pure math. This file does exactly that.
//   * Android 9+: salted/hashed via Gatekeeper/Weaver (hardware-backed,
//     rate-limited). Offline cracking is OUT — do not claim otherwise.
//     The UI routes those devices to the honest options instead.
//   * Obtaining gesture.key requires root / legacy ADB access — this tool
//     never touches a live device; the technician supplies the hash.
//
// Everything here is unit-verified: SHA-1 against RFC vectors + node's
// crypto, and the pattern enumerator against the published forensic
// counts (1624 / 7152 / 26016 / 72912 / 140704 / 140704 = 389,112 total
// valid patterns of length 4–9 on the 3×3 grid).
// =====================================================================

// ---------- SHA-1 (pure, dependency-free, FIPS 180-1) ----------

function rol32(v: number, n: number): number {
  return ((v << n) | (v >>> (32 - n))) >>> 0
}

/** SHA-1 over raw bytes → lowercase hex string. */
export function sha1Hex(bytes: ArrayLike<number>): string {
  const srcLen = bytes.length
  // padded length: message + 0x80 + zeros + 8-byte bit-length, multiple of 64
  const withOne = srcLen + 1
  const padZeros = (56 - (withOne % 64) + 64) % 64
  const total = withOne + padZeros + 8
  const msg = new Uint8Array(total)
  for (let i = 0; i < srcLen; i++) msg[i] = bytes[i] & 0xff
  msg[srcLen] = 0x80
  const bitLen = srcLen * 8
  // bit length as big-endian 64-bit (safe: our inputs are tiny)
  msg[total - 5] = Math.floor(bitLen / 0x100000000) & 0xff
  msg[total - 4] = (bitLen >>> 24) & 0xff
  msg[total - 3] = (bitLen >>> 16) & 0xff
  msg[total - 2] = (bitLen >>> 8) & 0xff
  msg[total - 1] = bitLen & 0xff

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0
  const w = new Uint32Array(80)

  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4
      w[i] = ((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0
    }
    for (let i = 16; i < 80; i++) w[i] = rol32(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)

    let a = h0, b = h1, c = h2, d = h3, e = h4
    for (let i = 0; i < 80; i++) {
      let f: number, k: number
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999 }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1 }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc }
      else { f = b ^ c ^ d; k = 0xca62c1d6 }
      const tmp = (rol32(a, 5) + f + e + k + w[i]) >>> 0
      e = d; d = c; c = rol32(b, 30); b = a; a = tmp
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0
  }

  const words = [h0, h1, h2, h3, h4]
  let hex = ""
  for (const word of words) hex += word.toString(16).padStart(8, "0")
  return hex
}

// ---------- 3×3 pattern enumeration ----------

// Grid layout:
//   0 1 2
//   3 4 5
//   6 7 8
// A move from a→b that passes through an unvisited middle dot auto-selects
// that middle dot; to produce canonical patterns, a jump is only legal if
// its middle is already visited.
const MIDDLES: Record<number, number> = {}
function setMiddle(a: number, b: number, m: number) {
  MIDDLES[a * 10 + b] = m
  MIDDLES[b * 10 + a] = m
}
setMiddle(0, 2, 1); setMiddle(0, 6, 3); setMiddle(0, 8, 4)
setMiddle(1, 7, 4); setMiddle(2, 6, 4); setMiddle(2, 8, 5)
setMiddle(3, 5, 4); setMiddle(6, 8, 7)

/** Published forensic counts for valid patterns, by length 4..9. */
export const PATTERN_LENGTH_COUNTS = [1624, 7152, 26016, 72912, 140704, 140704]

export interface EnumeratedPatterns {
  /** all valid patterns (dot indices in draw order), length 4–9 */
  patterns: number[][]
  /** per-length counts, for the verification table */
  counts: number[]
}

export function enumeratePatterns(): EnumeratedPatterns {
  const patterns: number[][] = []
  const counts = [0, 0, 0, 0, 0, 0]
  const visited = new Uint8Array(9)
  const current: number[] = []

  function dfs(dot: number) {
    visited[dot] = 1
    current.push(dot)
    if (current.length >= 4) {
      patterns.push([...current])
      counts[current.length - 4]++
    }
    if (current.length < 9) {
      for (let next = 0; next < 9; next++) {
        if (visited[next]) continue
        const mid = MIDDLES[dot * 10 + next]
        if (mid !== undefined && !visited[mid]) continue
        dfs(next)
      }
    }
    current.pop()
    visited[dot] = 0
  }

  for (let start = 0; start < 9; start++) dfs(start)
  return { patterns, counts }
}

// ---------- the cracker ----------

export interface CrackResult {
  found: boolean
  /** dot indices in draw order (e.g. [0,1,2,4] = top-left → top-mid → top-right → center) */
  pattern: number[] | null
  /** human-readable, e.g. "0 → 1 → 2 → 4" */
  patternText: string | null
  searched: number
  ms: number
}

function normalizeHashHex(hex: string): string {
  return hex.trim().toLowerCase().replace(/[^0-9a-f]/g, "")
}

/**
 * Offline crack of a legacy gesture.key SHA-1.
 * @param hashHex 40 hex chars (the 20-byte file content shown as hex)
 */
export function crackGestureKey(hashHex: string): CrackResult {
  const t0 = Date.now()
  const targetStr = normalizeHashHex(hashHex)
  if (targetStr.length !== 40) { // 20-byte SHA-1 = 40 hex chars
    return { found: false, pattern: null, patternText: null, searched: 0, ms: Date.now() - t0 }
  }

  const { patterns } = enumeratePatterns()
  let searched = 0
  for (const p of patterns) {
    searched++
    if (sha1Hex(p) === targetStr) {
      return {
        found: true,
        pattern: p,
        patternText: p.join(" → "),
        searched,
        ms: Date.now() - t0,
      }
    }
  }
  return { found: false, pattern: null, patternText: null, searched, ms: Date.now() - t0 }
}

/** Layout helper for the UI: which (row, col) is a dot index. */
export function dotPos(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 3), col: index % 3 }
}
