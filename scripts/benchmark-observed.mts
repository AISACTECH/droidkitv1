#!/usr/bin/env node
/**
 * Observed FRP benchmark — physical evidence only.
 *
 * Virtual donors, routing bands, source-code branches, command acceptance and
 * synthetic agents are deliberately ineligible. A matrix cell becomes rankable
 * only after three independent owned/authorized physical units have a recorded
 * post-reboot outcome.
 */
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const root = join(import.meta.dirname, "..")
const evidenceDir = join(root, "docs", "bench", "observed")
const MIN_UNITS_PER_CELL = 3

interface EvidenceRecord {
  schemaVersion: 1
  evidenceKind: "physical-device"
  tool: string
  toolVersion: string
  deviceId: string
  brand: string
  model: string
  chipset: string
  androidVersion: string
  securityPatch: string
  buildFingerprintHash: string
  ownershipAttested: true
  donorOrCustomerAuthorized: true
  operationClass: string
  result: "verified_after_reboot" | "failed_after_reboot" | "pending" | "refused"
  bootChanged: boolean
  frpStateAfter: "Active" | "Inactive" | "Unknown"
  observedAt: string
  evidenceHash: string
}

function filesBelow(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesBelow(path) : [path]
  })
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function validate(raw: unknown, file: string): EvidenceRecord {
  if (!raw || typeof raw !== "object") throw new Error(`${file}: expected an object`)
  const r = raw as Record<string, unknown>
  if (r.schemaVersion !== 1 || r.evidenceKind !== "physical-device") {
    throw new Error(`${file}: only schemaVersion 1 physical-device evidence is eligible`)
  }
  for (const key of [
    "tool", "toolVersion", "deviceId", "brand", "model", "chipset",
    "androidVersion", "securityPatch", "buildFingerprintHash",
    "operationClass", "observedAt", "evidenceHash",
  ]) {
    if (!text(r[key])) throw new Error(`${file}: missing ${key}`)
  }
  if (r.ownershipAttested !== true || r.donorOrCustomerAuthorized !== true) {
    throw new Error(`${file}: ownership and service authorization attestations are required`)
  }
  if (!["verified_after_reboot", "failed_after_reboot", "pending", "refused"].includes(String(r.result))) {
    throw new Error(`${file}: invalid result`)
  }
  if (!["Active", "Inactive", "Unknown"].includes(String(r.frpStateAfter))) {
    throw new Error(`${file}: invalid frpStateAfter`)
  }
  if (Number.isNaN(Date.parse(String(r.observedAt)))) {
    throw new Error(`${file}: observedAt must be ISO-8601`)
  }
  if (!/^[a-f0-9]{64}$/i.test(String(r.buildFingerprintHash)) || !/^[a-f0-9]{64}$/i.test(String(r.evidenceHash))) {
    throw new Error(`${file}: hashes must be 64 hex characters`)
  }
  return raw as EvidenceRecord
}

function wilson(successes: number, total: number): [number, number] {
  if (total === 0) return [0, 0]
  const z = 1.96
  const p = successes / total
  const denominator = 1 + (z * z) / total
  const centre = (p + (z * z) / (2 * total)) / denominator
  const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) / denominator
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)]
}

const evidenceFiles = filesBelow(evidenceDir).filter(file => file.endsWith(".json"))
const rejected: { file: string; reason: string }[] = []
const records: EvidenceRecord[] = []
for (const file of evidenceFiles) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"))
    const list = Array.isArray(parsed) ? parsed : [parsed]
    for (const entry of list) records.push(validate(entry, relative(root, file)))
  } catch (error) {
    rejected.push({ file: relative(root, file), reason: String(error) })
  }
}

// Evidence hashes are the independent-unit identity. Duplicate submissions do
// not increase the denominator.
const unique = [...new Map(records.map(record => [record.evidenceHash, record])).values()]
const cells = new Map<string, EvidenceRecord[]>()
for (const record of unique) {
  const key = [
    record.tool,
    record.toolVersion,
    record.brand,
    record.model,
    record.chipset,
    record.androidVersion,
    record.securityPatch,
  ].join("|")
  cells.set(key, [...(cells.get(key) ?? []), record])
}

const matrix = [...cells.entries()].map(([key, values]) => {
  const final = values.filter(r => r.result === "verified_after_reboot" || r.result === "failed_after_reboot")
  const successes = final.filter(r =>
    r.result === "verified_after_reboot" && r.bootChanged && r.frpStateAfter === "Inactive"
  ).length
  const [low, high] = wilson(successes, final.length)
  return {
    key,
    units: values.length,
    finalOutcomes: final.length,
    successes,
    successRate: final.length ? successes / final.length : null,
    wilson95: final.length ? [low, high] : null,
    rankable: final.length >= MIN_UNITS_PER_CELL,
  }
})

const rankable = matrix.filter(cell => cell.rankable)
const report = {
  schemaVersion: 1,
  generatedFrom: "physical evidence files only",
  inputHash: createHash("sha256")
    .update(unique.map(record => record.evidenceHash).sort().join("\n"))
    .digest("hex"),
  policy: {
    minimumIndependentFinalOutcomesPerCell: MIN_UNITS_PER_CELL,
    successDefinition: "post-reboot boot identity changed AND fresh FRP state is Inactive",
    excluded: ["virtual donors", "mock mode", "routing bands", "command acceptance", "synthetic agents"],
  },
  evidenceFiles: evidenceFiles.length,
  acceptedUniqueRecords: unique.length,
  rejected,
  matrix,
  rankingStatus: rankable.length ? "eligible-cells-present" : "INSUFFICIENT_EVIDENCE_NO_RANKING",
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log("Observed FRP benchmark — physical evidence only")
  console.log("================================================")
  console.log(`Evidence files: ${evidenceFiles.length}`)
  console.log(`Accepted unique records: ${unique.length}`)
  console.log(`Rejected files: ${rejected.length}`)
  console.log(`Rankable matrix cells: ${rankable.length}`)
  console.log(`Status: ${report.rankingStatus}`)
  if (!rankable.length) {
    console.log("No product ranking will be emitted until each compared cell has at least three independent post-reboot outcomes.")
  }
}

process.exit(rejected.length ? 1 : 0)
