// =====================================================================
// Bench evidence types — isolated from the Adaptive Engine.
// --------------------------------------------------------------------
// Hardware confirmation of Android 15/16 lanes is BENCHed by design.
// This module is the software half of that loop: a strict schema for
// donor-log evidence, promotion rules that never auto-flip official
// labels, and virtual-donor replay that proves the ENGINE routes
// correctly. It does not execute device commands and it does not
// invent unlock success.
// =====================================================================

import type { BrandId, ChipsetFamily, FeasibilityBand, Fingerprint } from "../adaptive-engine/types.ts"

export const BENCH_KIND = "paralock-bench-evidence" as const
export const BENCH_VERSION = 1 as const

export type BenchResult = "accepted" | "rejected" | "aborted" | "not-attempted"
export type BenchDomain = "frp" | "modem-nck" | "mifi" | "other"
export type BenchSource = "structured" | "oracle-note" | "sentence" | "virtual-replay"

export interface BenchRecord {
  id: string
  domain: BenchDomain
  /** Matches FRP_STRETCH / NETWORK_PLAN deviceId when known; else a slug. */
  deviceId: string
  model: string
  brand: string
  androidMajor: number | null
  securityPatch: string | null
  chipsetFamily: string
  /** Modem NCK era (v1 / v2 / v201) when domain is modem-nck. */
  era?: string
  methodId: string
  /** Never required. Present on modem NCK logs only. */
  code?: string
  attemptsBefore: number
  result: BenchResult
  /** YYYY-MM-DD */
  date: string
  operatorNote: string
  /** Hard rule: only owned donor units. Customer devices are refused. */
  donorOwned: boolean
  /** Optional SHA-256 (hex) of a unit identifier — never a raw serial. */
  unitSerialHash?: string
  source: BenchSource
}

export interface BenchPack {
  kind: typeof BENCH_KIND
  version: typeof BENCH_VERSION
  exportedAt: string
  records: BenchRecord[]
}

export type PromotionKind =
  | "none"
  | "shop-note"
  | "pr-candidate"
  | "refused-low-attempts"
  | "stopped-on-reject"
  | "refused-not-donor"

export interface PromotionProposal {
  deviceId: string
  kind: PromotionKind
  accepted: number
  rejected: number
  independentUnits: number
  reason: string
  /** Always false. A human PR is the only path to an official label flip. */
  officialFlipAllowed: false
}

export interface VirtualDonor {
  deviceId: string
  label: string
  /** Public-spec synthetic fingerprint — not captured from a locked unit. */
  fingerprint: Fingerprint
  /** Public getprop-style dump used to prove the parser + engine agree. */
  getpropDump: string
  expectedBand: FeasibilityBand
  expectedPrimary: string | null
  stretchStatus: string
  blocker: string
  notes: string
}

export interface ReplayRow {
  deviceId: string
  band: FeasibilityBand
  primary: string | null
  bandMatch: boolean
  primaryMatch: boolean
  decisionCoverage: number
  unionCoverage: number
  softwareOnlyHonesty: string
}

export interface GetpropParse {
  fingerprint: Fingerprint
  properties: Record<string, string>
  warnings: string[]
}

export type { BrandId, ChipsetFamily, FeasibilityBand, Fingerprint }
