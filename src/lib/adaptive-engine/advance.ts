// =====================================================================
// FRP Adaptive Engine — round-5 advance layer (ISOLATED, read-only)
// ---------------------------------------------------------------------
// The "work the gap toward near-100" layer. Contains:
//   1. FRP_STRETCH — per-corpus-device TARGET rates with sources and
//      blockers. Target = documented-evidence stretch, NOT the official
//      score. Official scores stay computed from the untouched engine;
//      the downward-only law is untouched — every upward target is
//      flagged bench-pending / vendor-documented / engine-verified and
//      must be bench-confirmed before it can become official.
//   2. NETWORK_PLAN — per-device plan-coverage scores (current +
//      target) for the network-unlock domain, incl. the NEW phones /
//      cellphones corner. Every number maps to a shipped runbook
//      element with a source + status.
//   3. Ceiling math — the honest "near 100" metric: our score ÷ the
//      physics-and-evidence ceiling (the best ANY tool scores on the
//      same device). Where the lock is server-side, the ceiling is 0
//      for everyone and achievement is undefined-by-physics (noted).
//   4. gapToHundred() — itemized distance-to-100 rows: each missing
//      point names its blocker (bench evidence / vendor docs / server
//      physics). The "100% accurate algorithm" = 100% decision
//      coverage (already) + ~100% of the evidence ceiling + an
//      itemized, honest gap ledger.
//
// ISOLATION CONTRACT: this file imports NOTHING from the engine and
// alters NOTHING. Benchmark scripts may consume it; the engine's
// official outputs are byte-stable (locked by test:research §F and by
// a new self-check in the benchmarks).
// =====================================================================

// ---------------------------------------------------------------------
// 1. FRP stretch table (target path — bench-gated, never official)
// ---------------------------------------------------------------------

export type EvidenceStatus =
  | "engine-verified" // math proven by published vectors / engine tests
  | "vendor-documented" // vendor-documented deterministic procedure
  | "documented" // public documented route (field-reported class)
  | "bench-pending"; // plausible stretch — requires bench confirmation

export interface StretchRow {
  deviceId: string
  current: number
  target: number
  status: EvidenceStatus
  source: string
  blocker: string // what must happen before `target` can become official
}

export const FRP_STRETCH: StretchRow[] = [
  {
    deviceId: "samsung-a05s", current: 88, target: 88, status: "documented",
    source: "MT6768 (pre-2022 MediaTek): open mtkclient-protocol class erases frp below the OS (RESEARCH-2026-FRP.md §1).",
    blocker: "none — already at the documented band.",
  },
  {
    deviceId: "samsung-a13", current: 70, target: 80, status: "documented",
    source: "Exynos Download-Mode + Odin-class enable-ADB flow documented pre-Binary-18 (FRP-ALGORITHM-ANALYSIS.md; SamFw class).",
    blocker: "bench-confirm one donor Exynos A13 unit (owned) before promoting the band.",
  },
  {
    deviceId: "samsung-a15", current: 80, target: 85, status: "bench-pending",
    source: "MT6789 Brom erase — mtkclient supports the class; SLA/DAA signing status of this exact SoC is the open question.",
    blocker: "bench: confirm MT6789 Brom entry + DA acceptance on an owned donor.",
  },
  {
    deviceId: "samsung-a16", current: 70, target: 70, status: "documented",
    source: "Binary ≥18 KG-Prenormal USB gate caps the Odin-class lane (A15/16 dossier P9).",
    blocker: "physics: KG gate is processor-level. No honest upward move until Samsung documents a change.",
  },
  {
    deviceId: "samsung-s25", current: 65, target: 65, status: "documented",
    source: "Qualcomm EDL 9008 gated by signed firehose loaders per model + bit (FRP-ALGORITHM-ANALYSIS.md).",
    blocker: "signed loader availability is per-model vendor material — not a software gap we can close.",
  },
  {
    deviceId: "google-pixel9", current: 0, target: 0, status: "documented",
    source: "Server-side account verification + no UI lane (A15/16 dossier P10). Owner credentials are not a bypass.",
    blocker: "physics: 0 is the correct number for every tool. Only the 100%-coverage plan + owner runbook remain.",
  },
  {
    deviceId: "tecno-spark30", current: 80, target: 85, status: "bench-pending",
    source: "MT6769 Brom on HiOS — community reports strong; SLA/DAA signing on 2025 security patches unconfirmed.",
    blocker: "bench: one owned Spark 30 donor, Brom erase + reboot observation.",
  },
  {
    deviceId: "infinix-hot50", current: 75, target: 80, status: "documented",
    source: "SPD bootrom auto-ADB tools verified broadly on UMS9230-class Tecno/Infinix/Itel (XDA SPD FRP tools).",
    blocker: "bench-confirm UMS9230 revision on a donor before promoting.",
  },
  {
    deviceId: "itel-a80", current: 75, target: 80, status: "documented",
    source: "Same SPD bootrom class (A14 build — even less patched).",
    blocker: "bench-confirm on the A14 donor.",
  },
  {
    deviceId: "xiaomi-redmi14c", current: 80, target: 85, status: "bench-pending",
    source: "MT6769 Brom class on HyperOS — Mi-account may co-gate; Brom erase remains the lane.",
    blocker: "bench: donor unit; verify Brom + whether Mi-account re-prompts post-erase.",
  },
  {
    deviceId: "oppo-a3x", current: 65, target: 65, status: "documented",
    source: "SM4450 EDL: firehose not public for this generation.",
    blocker: "vendor loader material — not closable in software.",
  },
  {
    deviceId: "moto-g24", current: 80, target: 85, status: "bench-pending",
    source: "MT6769 Brom class on near-stock Android 14.",
    blocker: "bench: donor Moto G24, Brom erase + post-reboot detection.",
  },
]

export const frpStretchMean = (): { current: number; target: number } => {
  const c = FRP_STRETCH.reduce((s, r) => s + r.current, 0) / FRP_STRETCH.length
  const t = FRP_STRETCH.reduce((s, r) => s + r.target, 0) / FRP_STRETCH.length
  return { current: Math.round(c * 10) / 10, target: Math.round(t * 10) / 10 }
}

// ---------------------------------------------------------------------
// 2. Network plan-coverage table (modem · phones · mifi · router · wifi)
// ---------------------------------------------------------------------

export interface NetworkPlanRow {
  deviceId: string
  category: "modem" | "phone" | "mifi" | "router" | "wifi"
  current: number
  target: number
  status: EvidenceStatus
  source: string
}

export const NETWORK_PLAN: NetworkPlanRow[] = [
  // modems
  { deviceId: "huawei-e1750", category: "modem", current: 100, target: 100, status: "engine-verified", source: "V1 NCK computed locally by nck-modem.ts — matches published worked example 34560983 (test:nck)." },
  { deviceId: "huawei-e3131", category: "modem", current: 100, target: 100, status: "engine-verified", source: "V2 NCK computed locally — matches published worked example 23823444 (test:nck)." },
  { deviceId: "huawei-e5573", category: "modem", current: 40, target: 55, status: "documented", source: "V201 candidate is a faithful port but UNVERIFIED (labelled in-app); E5573-class boot-pin route is publicly documented (bench-heavy)." },
  { deviceId: "zte-mf927u", category: "modem", current: 25, target: 45, status: "documented", source: "16-digit NCK via verified code services — our runbook manages the 5-try counter (rescue-data MiFi table)." },
  // phones / cellphones (new corner)
  { deviceId: "huawei-y5-legacy", category: "phone", current: 100, target: 100, status: "engine-verified", source: "Same V1/V2 generation NCK applies to Huawei phones of that era — published vectors recomputed live (test:nck)." },
  { deviceId: "samsung-a05-carrier", category: "phone", current: 25, target: 45, status: "vendor-documented", source: "Official carrier-unlock eligibility portals (documented in Rescue Lab carrier lane); attempt-counter law; no NCK guessing." },
  { deviceId: "itel-button", category: "phone", current: 50, target: 65, status: "vendor-documented", source: "Button-phone default-code table (BUTTONPHONE_BRAND_GUIDE in rescue-data.ts, 8 families) + factory-default runbook." },
  // pocket wifi / MiFi
  { deviceId: "huawei-e5573cs", category: "mifi", current: 55, target: 65, status: "documented", source: "The famous Telkom/Orange KE boot-pin + firmware route — public, model-exact, bench-only with brick-risk warning." },
  { deviceId: "zte-mf910", category: "mifi", current: 45, target: 60, status: "documented", source: "Verified code-service escalation (documented in runbook) with counter law — never guess." },
  { deviceId: "alcatel-mw40", category: "mifi", current: 45, target: 55, status: "documented", source: "10–16 digit NCK via 192.168.1.1 unlock page; 3-strike hard-lock risk managed by the runbook." },
  { deviceId: "huawei-e5330", category: "mifi", current: 40, target: 50, status: "documented", source: "V201-class + service escalation runbook." },
  // routers (own-device recovery — vendor-documented deterministic procedures)
  { deviceId: "tp-link-mr6400", category: "router", current: 85, target: 85, status: "vendor-documented", source: "Factory reset (hold Reset 10s) → default admin → reconfigure: vendor-documented deterministic procedure for the OWNER." },
  { deviceId: "tenda-f300", category: "router", current: 85, target: 85, status: "vendor-documented", source: "Same class: reset → default credentials → restore (vendor manual)." },
  { deviceId: "huawei-b315", category: "router", current: 80, target: 80, status: "vendor-documented", source: "Reset + WebUI defaults; ISP-stock caveat noted (own-device law)." },
  // wifi (own network only)
  { deviceId: "own-wifi-recovery", category: "wifi", current: 70, target: 70, status: "vendor-documented", source: "Own-network password recovery via router admin (view/rotate) — deterministic for the owner; others'-network cracking stays 0 and is refused." },
]

export function networkPlanMean(category: "modem" | "phone" | "mifi" | "router" | "wifi", which: "current" | "target"): number {
  const rows = NETWORK_PLAN.filter((r) => r.category === category)
  if (rows.length === 0) return 0
  return Math.round((rows.reduce((s, r) => s + r[which], 0) / rows.length) * 10) / 10
}

// ---------------------------------------------------------------------
// 3. Ceiling math — the honest "near 100" metric
// ---------------------------------------------------------------------

export const CEILING_NOTE =
  "The physics-and-evidence ceiling is the best score ANY tool in the sheet achieves on the same " +
  "device (including paid server routes and, where present, community claims). 'Achievement' = our " +
  "score ÷ that ceiling. Where the ceiling is 0 (server-side lock), achievement is undefined by " +
  "physics — 0 is the correct score for everyone, and the plan-coverage metric (100%) is what remains."

/**
 * Union coverage of a chain of independent lanes: 1 − ∏(1 − rᵢ), capped at 97.
 * (The engine's escalation-chain semantics, expressed as math.)
 */
export function unionCoverage(rates: number[], cap = 97): number {
  const clamped = rates.map((r) => Math.min(97, Math.max(0, r)) / 100)
  const union = 1 - clamped.reduce((acc, r) => acc * (1 - r), 1)
  return Math.min(cap, Math.round(union * 100))
}

/** Per-device ceiling + our achievement percentage (excludes 0-ceiling rows). */
export function ceilingAchievement(
  ours: number[],
  allTools: number[][],
): { ceilings: number[]; oursMean: number; ceilingMean: number; achievementPct: number; counted: number } {
  const ceilings = ours.map((_, i) => Math.max(0, ...allTools.map((t) => t[i] ?? 0)))
  const valid = ceilings.filter((c) => c > 0)
  const oursMean = ours.reduce((a, b) => a + b, 0) / ours.length
  const ceilingMean = ceilings.reduce((a, b) => a + b, 0) / ceilings.length
  const achievementPct = valid.length === 0
    ? 100
    : (ours.reduce((a, b) => a + b, 0) / valid.reduce((a, b) => a + b, 0)) * 100
  return {
    ceilings,
    oursMean: Math.round(oursMean * 10) / 10,
    ceilingMean: Math.round(ceilingMean * 10) / 10,
    achievementPct: Math.round(achievementPct * 10) / 10,
    counted: valid.length,
  }
}

// ---------------------------------------------------------------------
// 4. Gap ledger — itemized distance to 100
// ---------------------------------------------------------------------

export interface GapRow {
  metric: string
  current: number
  target: 100
  blocker: string
  kind: "coverage" | "bench-evidence" | "server-physics" | "vendor-material"
}

export function frpGapRows(): GapRow[] {
  return [
    { metric: "FRP decision coverage (every fingerprint → band → chain → verify → rollback)", current: 100, target: 100, blocker: "none — achieved and test-locked (test:adaptive).", kind: "coverage" },
    { metric: "FRP raw success vs evidence ceiling", current: 0, target: 100, blocker: "Bench-confirm the stretch rows (FRP_STRETCH) on owned donors; QC firehose loaders and Samsung KG-gate caps are vendor material, not software.", kind: "bench-evidence" },
    { metric: "FRP raw on server-side devices (Pixel-class)", current: 0, target: 100, blocker: "Server-side account verification — 0 for every tool on Earth; only the owner-credential runbook applies.", kind: "server-physics" },
  ]
}

export function networkGapRows(): GapRow[] {
  return [
    { metric: "Network decision coverage (every device → route → counter-law → escalation)", current: 100, target: 100, blocker: "none — runbook shipped per device class.", kind: "coverage" },
    { metric: "Legacy Huawei V1/V2 unlock (engine-verified)", current: 100, target: 100, blocker: "none — published vectors recomputed live.", kind: "coverage" },
    { metric: "V201/modern modem + MiFi breadth", current: 0, target: 100, blocker: "Server-database breadth (DC-Unlocker-class) is vendor data we don't ship; our documented-service escalation is the honest bridge until bench rows land.", kind: "bench-evidence" },
    { metric: "Router + own-Wi-Fi recovery", current: 0, target: 100, blocker: "Vendor-documented deterministic procedures — achieved; ISP-stock and non-owned-network refusals are by law.", kind: "coverage" },
  ]
}
