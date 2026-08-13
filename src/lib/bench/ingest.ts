// =====================================================================
// Bench-log ingest + promotion rules
// --------------------------------------------------------------------
// Accepts:
//   1. structured packs  { kind: "droidkit-bench-evidence", version: 1 }
//   2. Patch Oracle exports { kind: "patch-oracle-bench-log", bench_notes }
//   3. Calibration-guide sentences:
//        MODEL — era=v201 — code 12345678 — attempts-before 10 — RESULT accepted/rejected — date
//
// Promotion law (same as docs/BENCH-CALIBRATION-GUIDE.md):
//   * donor-owned only
//   * attempts ≤ 2 → refuse experiment (refunded-service route)
//   * one accept → shop-note
//   * three independent accepts of the same model → PR candidate
//   * a logged rejection is data, not a failure — but that unit stops
//   * officialFlipAllowed is ALWAYS false (human PR required)
// Virtual-replay records never count toward promotion.
// =====================================================================

import { z } from "zod"
import { BENCH_KIND, BENCH_VERSION, type BenchPack, type BenchRecord, type PromotionProposal } from "./types.ts"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const recordSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(["frp", "modem-nck", "mifi", "other"]),
  deviceId: z.string().min(1),
  model: z.string().min(1),
  brand: z.string().min(1),
  androidMajor: z.number().int().min(1).max(99).nullable(),
  securityPatch: z.string().nullable(),
  chipsetFamily: z.string().min(1),
  era: z.string().optional(),
  methodId: z.string().min(1),
  code: z.string().optional(),
  attemptsBefore: z.number().int().min(0).max(99),
  result: z.enum(["accepted", "rejected", "aborted", "not-attempted"]),
  date: z.string().regex(DATE_RE),
  operatorNote: z.string(),
  donorOwned: z.boolean(),
  unitSerialHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  source: z.enum(["structured", "oracle-note", "sentence", "virtual-replay"]),
})

export const BenchPackSchema = z.object({
  kind: z.literal(BENCH_KIND),
  version: z.literal(BENCH_VERSION),
  exportedAt: z.string().min(4),
  records: z.array(recordSchema),
})

export interface IngestResult {
  ok: boolean
  pack: BenchPack | null
  records: BenchRecord[]
  errors: string[]
  proposals: PromotionProposal[]
}

const SENTENCE =
  /^(.+?)\s+[—-]\s+era=([^\s—-]+)\s+[—-]\s+code\s+([A-Za-z0-9]+)\s+[—-]\s+attempts-before\s+(\d+)\s+[—-]\s+RESULT\s+(accepted|rejected|aborted)\s+[—-]\s+(\d{4}-\d{2}-\d{2})\s*$/i

function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown"
}

function parseSentence(text: string, index: number): BenchRecord | null {
  const m = text.trim().match(SENTENCE)
  if (!m) return null
  const model = m[1].trim()
  const era = m[2].trim()
  const result = m[5].toLowerCase() as BenchRecord["result"]
  return {
    id: `sentence-${index}-${slug(model)}`,
    domain: era.toLowerCase().startsWith("v") ? "modem-nck" : "frp",
    deviceId: slug(model),
    model,
    brand: "unknown",
    androidMajor: null,
    securityPatch: null,
    chipsetFamily: "Unknown",
    era,
    methodId: era.toLowerCase().startsWith("v") ? `nck-${era.toLowerCase()}` : "unknown",
    code: m[3],
    attemptsBefore: Number(m[4]),
    result,
    date: m[6],
    operatorNote: text.trim(),
    donorOwned: true,
    source: "sentence",
  }
}

function recordsFromOracleNotes(notes: unknown): BenchRecord[] {
  if (!Array.isArray(notes)) return []
  const out: BenchRecord[] = []
  notes.forEach((n, i) => {
    const text = typeof n === "string" ? n : (n && typeof n === "object" && "text" in n ? String((n as { text: unknown }).text) : "")
    if (!text) return
    const parsed = parseSentence(text, i)
    if (parsed) {
      parsed.source = "oracle-note"
      out.push(parsed)
    }
  })
  return out
}

export function parseBenchInput(raw: unknown): { records: BenchRecord[]; errors: string[] } {
  const errors: string[] = []
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return { records: [], errors: ["Empty input."] }
    try {
      return parseBenchInput(JSON.parse(trimmed))
    } catch {
      const rec = parseSentence(trimmed, 0)
      if (rec) return { records: [rec], errors: [] }
      // Multi-line freeform: try each line.
      const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      const recs = lines.map((l, i) => parseSentence(l, i)).filter((r): r is BenchRecord => r !== null)
      if (recs.length > 0) return { records: recs, errors: [] }
      return { records: [], errors: ["Not JSON and not a calibration-guide sentence."] }
    }
  }
  if (typeof raw !== "object" || raw === null) {
    return { records: [], errors: ["Input is not an object or string."] }
  }
  const obj = raw as Record<string, unknown>
  if (obj.kind === BENCH_KIND) {
    const parsed = BenchPackSchema.safeParse(obj)
    if (!parsed.success) {
      return { records: [], errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }
    }
    return { records: parsed.data.records, errors: [] }
  }
  if (obj.kind === "patch-oracle-bench-log") {
    const recs = recordsFromOracleNotes(obj.bench_notes)
    if (recs.length === 0) errors.push("Oracle log had no parseable calibration sentences in bench_notes.")
    return { records: recs, errors }
  }
  if (Array.isArray(obj.records)) {
    const parsed = z.array(recordSchema).safeParse(obj.records)
    if (!parsed.success) {
      return { records: [], errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }
    }
    return { records: parsed.data, errors: [] }
  }
  return { records: [], errors: [`Unknown kind '${String(obj.kind)}'. Expected ${BENCH_KIND} or patch-oracle-bench-log.`] }
}

export function proposePromotions(records: BenchRecord[]): PromotionProposal[] {
  const byDevice = new Map<string, BenchRecord[]>()
  for (const r of records) {
    if (r.source === "virtual-replay") continue
    const list = byDevice.get(r.deviceId) ?? []
    list.push(r)
    byDevice.set(r.deviceId, list)
  }
  const proposals: PromotionProposal[] = []
  for (const [deviceId, recs] of byDevice) {
    if (recs.some((r) => !r.donorOwned)) {
      proposals.push({
        deviceId,
        kind: "refused-not-donor",
        accepted: 0,
        rejected: 0,
        independentUnits: 0,
        reason: "A record is not marked donor-owned. Customer devices are never used for promotion.",
        officialFlipAllowed: false,
      })
      continue
    }
    if (recs.some((r) => r.attemptsBefore <= 2 && r.result !== "not-attempted")) {
      proposals.push({
        deviceId,
        kind: "refused-low-attempts",
        accepted: recs.filter((r) => r.result === "accepted").length,
        rejected: recs.filter((r) => r.result === "rejected").length,
        independentUnits: 0,
        reason: "Attempts ≤ 2 — that unit takes the refunded-service route, not experiments.",
        officialFlipAllowed: false,
      })
      continue
    }
    const accepted = recs.filter((r) => r.result === "accepted")
    const rejected = recs.filter((r) => r.result === "rejected")
    const unitKeys = new Set(accepted.map((r, i) => r.unitSerialHash ?? `anon-${r.date}-${i}`))
    const independentUnits = unitKeys.size
    if (rejected.length > 0 && accepted.length === 0) {
      proposals.push({
        deviceId,
        kind: "stopped-on-reject",
        accepted: 0,
        rejected: rejected.length,
        independentUnits: 0,
        reason: "Logged rejection with no accepts — valuable data. Stop. Do not promote.",
        officialFlipAllowed: false,
      })
      continue
    }
    if (independentUnits >= 3) {
      proposals.push({
        deviceId,
        kind: "pr-candidate",
        accepted: accepted.length,
        rejected: rejected.length,
        independentUnits,
        reason: `${independentUnits} independent accepted units. Eligible for a HUMAN PR that flips the shop label — never auto-applied.`,
        officialFlipAllowed: false,
      })
      continue
    }
    if (accepted.length >= 1) {
      proposals.push({
        deviceId,
        kind: "shop-note",
        accepted: accepted.length,
        rejected: rejected.length,
        independentUnits,
        reason: `${accepted.length} accept(s), ${independentUnits} independent unit(s). Shop note only — need 3 independent accepts for a PR candidate.`,
        officialFlipAllowed: false,
      })
      continue
    }
    proposals.push({
      deviceId,
      kind: "none",
      accepted: 0,
      rejected: rejected.length,
      independentUnits: 0,
      reason: "No accepted hardware evidence yet.",
      officialFlipAllowed: false,
    })
  }
  return proposals
}

export function ingestBenchLog(raw: unknown): IngestResult {
  const { records, errors } = parseBenchInput(raw)
  const proposals = proposePromotions(records)
  const pack: BenchPack | null = records.length
    ? { kind: BENCH_KIND, version: BENCH_VERSION, exportedAt: new Date().toISOString(), records }
    : null
  return {
    ok: errors.length === 0 && records.length > 0,
    pack,
    records,
    errors,
    proposals,
  }
}

export function emptyPack(): BenchPack {
  return { kind: BENCH_KIND, version: BENCH_VERSION, exportedAt: new Date().toISOString(), records: [] }
}
