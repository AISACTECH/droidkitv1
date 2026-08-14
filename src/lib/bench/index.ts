// =====================================================================
// Bench desk — public API (isolated from the Adaptive Engine)
// =====================================================================

export { BENCH_KIND, BENCH_VERSION } from "./types.ts"
export type {
  BenchDomain,
  BenchPack,
  BenchRecord,
  BenchResult,
  BenchSource,
  GetpropParse,
  PromotionKind,
  PromotionProposal,
  ReplayRow,
  VirtualDonor,
} from "./types.ts"

export { VIRTUAL_DONORS, donorById } from "./donors.ts"
export { parseGetpropLines, guessChipsetFamily, fingerprintFromGetprop } from "./getprop.ts"
export { replayDonor, replayAllDonors, replayDonorFromDump, SOFTWARE_ONLY_HONESTY } from "./replay.ts"
export { BenchPackSchema, parseBenchInput, proposePromotions, ingestBenchLog, emptyPack } from "./ingest.ts"
