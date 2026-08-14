// =====================================================================
// Virtual-donor replay — engine routing, never unlock claims
// --------------------------------------------------------------------
// Runs the existing Adaptive Engine against every VIRTUAL_DONOR and
// checks band + primary method. Also evaluates the parallel research
// layer so A15/16 software-only honesty stays visible.
// =====================================================================

import { buildAdaptivePlan, computeBand, evaluateParallelLanes } from "../adaptive-engine/index.ts"
import { VIRTUAL_DONORS } from "./donors.ts"
import { fingerprintFromGetprop } from "./getprop.ts"
import type { ReplayRow, VirtualDonor } from "./types.ts"

export const SOFTWARE_ONLY_HONESTY =
  "Patched Android 15/16 software-only success is 0% for every tool, including this one. Replay proves routing, not unlock."

export function replayDonor(donor: VirtualDonor): ReplayRow {
  const band = computeBand(donor.fingerprint)
  const plan = buildAdaptivePlan(donor.fingerprint)
  const primary = plan.chain[0]?.id ?? null
  const parallel = evaluateParallelLanes(donor.fingerprint, {}, 7)
  return {
    deviceId: donor.deviceId,
    band: band.band,
    primary,
    bandMatch: band.band === donor.expectedBand,
    primaryMatch: primary === donor.expectedPrimary,
    decisionCoverage: parallel.decisionCoverage,
    unionCoverage: parallel.unionCoverage,
    softwareOnlyHonesty: SOFTWARE_ONLY_HONESTY,
  }
}

export function replayAllDonors(): ReplayRow[] {
  return VIRTUAL_DONORS.map(replayDonor)
}

/** Prove the getprop dump parses to the same band the donor expects. */
export function replayDonorFromDump(donor: VirtualDonor): { bandMatch: boolean; chipsetMatch: boolean; parsedBrand: string } {
  const parsed = fingerprintFromGetprop(donor.getpropDump)
  // Force FRP Active — getprop rarely carries a reliable FRP flag, and
  // the donor protocol assumes a locked unit under test.
  parsed.fingerprint.frpState = "Active"
  const band = computeBand(parsed.fingerprint)
  return {
    bandMatch: band.band === donor.expectedBand,
    chipsetMatch: parsed.fingerprint.chipsetFamily === donor.fingerprint.chipsetFamily,
    parsedBrand: parsed.fingerprint.brand,
  }
}
