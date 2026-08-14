// =====================================================================
// Patch Oracle — physics-layer survival engine + future-patch forecaster
// ---------------------------------------------------------------------
// EXPERIMENTAL. Pure, offline, deterministic rules + curated evidence.
// No device commands are sent from this module — it is a reasoning
// engine only, so it is safe to run with no phone attached and in the
// browser (mock) build.
//
// Honesty contract (same as FrpRemoval/RealityCheck.tsx and
// .github/copilot-instructions.md):
//   * We NEVER print "100%" for anything enforceable by a server.
//   * Statuses are evidence bands (alive / contested / blocked /
//     unknown), each with an explicit confidence and a fallback rung.
//   * Every forecast is falsifiable: it ships with a date and a "how we
//     will know we were wrong" condition, and resolved forecasts feed a
//     small-sample calibration meter. That meter is how we pursue
//     accuracy — by measuring ourselves, not by claiming.
//
// The physics insight the engine encodes:
//   Software can be patched. Mask ROM cannot. eFuses are one-way
//   physics. Therefore every enforcement layer has a patchability
//   axis, and methods that live *below* the patchable stack decay
//   slowly, while methods that live *inside* apps/setup-wizard decay
//   fast. Prediction = enumerating the vendor's remaining degrees of
//   freedom and dating them.
// =====================================================================

import type { ChipsetFamily, FrpAlgorithmId } from "@/lib/frp-commands"

// ---------- bands & confidence ----------

export type SurvivalStatus = "alive" | "contested" | "blocked" | "unknown"
export type Confidence = "low" | "medium" | "high"

/** Where an enforcement mechanism — or an attack — physically lives.
 *  Ordered by patchability (app = trivially patchable … hardware = never). */
export type StackLayer = "app" | "os" | "server" | "bootloader" | "bootrom" | "hardware"

export interface StackLayerInfo {
  layer: StackLayer
  label: string
  patchable: "over-the-air" | "service-centre" | "never"
  physics: string
}

/** The patch stack, most-patchable first. This *is* the prediction model:
 *  enforcement migrates toward the two ends (server + hardware) because
 *  everything in the middle can be reached by an attacker with physical
 *  access; the ends cannot be reached the same way. */
export const PATCH_STACK: StackLayerInfo[] = [
  { layer: "app",        label: "Apps / Setup Wizard / TalkBack", patchable: "over-the-air",   physics: "Plain code. Dies first — historically every app-layer bypass (TalkBack, browser, QuickShortcutMaker) was closed within patch cycles." },
  { layer: "os",         label: "Android framework / settings DB", patchable: "over-the-air",  physics: "Provisioning flags and wizard state. Closed progressively Android 11 → 14." },
  { layer: "server",     label: "Google / Samsung cloud check",   patchable: "never",          physics: "Android ID + IMEI bound to the account on Google's side. You cannot compute around a question asked to someone else's database." },
  { layer: "bootloader", label: "Bootloader / fastboot / EDL",    patchable: "service-centre", physics: "Signed images, firehose programmers, AVB. Patchable at manufacture & by signed updates; user-side key is absent." },
  { layer: "bootrom",    label: "Mask Boot ROM (silicon)",        patchable: "never",          physics: "Burned in at the fab. A bug here (Kamakiri-class MTK, SPD auto-ADB) lasts the chip's whole life. This is the patch-proof physics layer." },
  { layer: "hardware",   label: "Bus / flash physics (ISP, JTAG, eFuse)", patchable: "never",  physics: "The flash chip obeys whoever holds its pins. The last resort of every repair bench — with brick risk and RPMB caveats." },
]

// ---------- curated evidence timeline ----------

export interface PatchEvent {
  id: string
  date: string           // YYYY-MM
  actor: "Google" | "Samsung" | "MediaTek" | "Qualcomm" | "Unisoc" | "Repair ecosystem"
  summary: string
  closesLayer: StackLayer
  confidence: Confidence
  source: string
}

/** Curated, dated events. Every entry is a claim about the world that the
 *  repo's research docs can back; where reporting is thin the confidence
 *  says so. Extend THIS LIST when the bench observes something new —
 *  the engine re-scores automatically. */
export const PATCH_TIMELINE: PatchEvent[] = [
  { id: "a11-flags",  date: "2021-09", actor: "Google",   closesLayer: "os",  confidence: "high",
    summary: "Android 11+ hardens provisioning/setup-complete flags: settings-put '70% style' tricks start failing across vendors.",
    source: "RESEARCH-2026-FRP.md · vendor release notes" },
  { id: "talkback",   date: "2023-06", actor: "Google",   closesLayer: "app", confidence: "high",
    summary: "TalkBack/accessibility-menu bypass routes closed across GMS builds; keyboard/OSK variants die with them.",
    source: "Community verification threads, 2023" },
  { id: "kg-rmm",     date: "2023-10", actor: "Samsung",  closesLayer: "server", confidence: "high",
    summary: "Knox Guard (KG) / RMM state enforced with server check-ins — financed/enterprise phones re-lock even after local wipes.",
    source: "Samsung Knox docs; repair-forum consensus" },
  { id: "firehose",   date: "2024-06", actor: "Qualcomm", closesLayer: "bootloader", confidence: "high",
    summary: "EDL (9008) firehose programmer signing enforced by OEMs: only signed loaders talk to the chip; leaked loaders age out.",
    source: "Qualcomm EDL documentation; repair-forum consensus" },
  { id: "sla-daa",    date: "2024-09", actor: "MediaTek", closesLayer: "bootrom", confidence: "medium",
    summary: "SLA/DAA (Serial-Link & Download-Agent auth) enabled by default on newer MTK silicon (Dimensity 8xxx/9xxx, late Helio G). Plain Brom handshakes refused; exploit- or auth-bypass-only.",
    source: "mtkclient project notes; bkerler research" },
  { id: "sam-2026-01", date: "2026-01", actor: "Samsung", closesLayer: "app", confidence: "high",
    summary: "January 2026 security patch closes the last public browser/APK/test-menu install routes on One UI 6.1.1 / 7.",
    source: "XDA & repair-tool changelogs, Jan–Feb 2026" },
  { id: "server-frp", date: "2026-06", actor: "Google",   closesLayer: "server", confidence: "high",
    summary: "Android 15 enforcement confirmed server-side: Android ID + IMEI checked against Google during setup. Public consensus: no free/public route defeats this check on fully-enrolled devices.",
    source: "XDA, June 2026 — see ANDROID-15-16 research" },
  { id: "oneui8",     date: "2026-07", actor: "Samsung",  closesLayer: "server", confidence: "medium",
    summary: "One UI 8 (Android 16) extends the server-side check and tightens Knox cloud attestation on launch devices.",
    source: "Early One UI 8 field reports" },
  { id: "isp-bench",  date: "2026-08", actor: "Repair ecosystem", closesLayer: "hardware", confidence: "medium",
    summary: "Bench consensus: ISP boxes (UFI/Easy-JTAG class) remain the deterministic fallback for dead software windows — cost, brick risk and RPMB-backed FRP limits apply.",
    source: "docs/PHYSICS-LAYER-RESEARCH.md bench notes" },
]

const event = (id: string): PatchEvent =>
  PATCH_TIMELINE.find(e => e.id === id) ?? PATCH_TIMELINE[PATCH_TIMELINE.length - 1]

// ---------- survival assessment ----------

export interface OracleInput {
  /** free text, e.g. "Samsung", "Tecno", "Infinix", "Itel", "Xiaomi", "Pixel" */
  vendor: string
  chipset: ChipsetFamily
  /** e.g. 14, 15, 16 — 0/NaN means unknown */
  androidVersion: number
  /** 'YYYY-MM' or 'YYYY-MM-DD' or '' (unknown) */
  securityPatch: string
}

export interface MethodOutlook {
  methodId: FrpAlgorithmId | "isp_jtag" | "chip_off"
  label: string
  methodLayer: StackLayer
  status: SurvivalStatus
  confidence: Confidence
  reason: string
  evidenceDates: string[]
  fallback: string
}

export interface OracleVerdict {
  input: OracleInput
  outlooks: MethodOutlook[]
  /** one-line honest headline — never a percentage promise */
  headline: string
  /** single best next action given the bands */
  bestRung: string
}

const patchMonth = (p: string): string => (p.length >= 7 ? p.slice(0, 7) : p)
const atLeast = (p: string, ym: string): boolean => p !== "" && patchMonth(p) >= ym

const is = (vendor: string, ...names: string[]) => {
  const v = vendor.toLowerCase()
  return names.some(n => v.includes(n))
}

const TRANSSION = ["tecno", "infinix", "itel"]

/** The rules. Each rule is: which layer the method fights in, and what the
 *  timeline did to that layer for this input. Bands are deliberately coarse;
 *  a coarse band you can defend beats a fake percentage. */
export function assessSurvival(input: OracleInput): OracleVerdict {
  const { chipset, androidVersion: av } = input
  const vendor = input.vendor || "Unknown"
  const sp = patchMonth(input.securityPatch)
  const samsung = is(vendor, "samsung")
  const transsion = is(vendor, ...TRANSSION)
  const pixel = is(vendor, "google", "pixel")
  const knownAv = Number.isFinite(av) && av >= 5
  const a15plus = knownAv && av >= 15
  const a14plus = knownAv && av >= 14
  const a12to14 = knownAv && av >= 12 && av <= 14

  const outlooks: MethodOutlook[] = []

  // -- ADB provisioning flags (os layer) ---------------------------------
  outlooks.push({
    methodId: "adb_provisioning",
    label: "ADB provisioning flags / setup-wizard state",
    methodLayer: "os",
    status: !knownAv ? "unknown" : av <= 11 ? "alive" : a12to14 ? "contested" : "blocked",
    confidence: knownAv ? "high" : "low",
    reason: !knownAv
      ? "Android version unknown — flags routes were closed progressively 11 → 14."
      : av <= 11
        ? "Pre-2021 flags behaviour largely intact on this generation."
        : a12to14
          ? "Post-Android-11 hardening era: works on some patch levels, dies on others — verify on-device."
          : "Android 14+ era: provisioning-flag FRP removal is closed by the OS; expect flags to be ignored or reverted.",
    evidenceDates: [event("a11-flags").date],
    fallback: "Drop one rung below the OS: chipset bootloader/bootrom path (Runbook lane) or ISP.",
  })

  // -- Samsung test mode (app layer) --------------------------------------
  if (samsung) {
    outlooks.push({
      methodId: "samsung_test_mode",
      label: "Samsung test mode (*#0*#) + browser/APK routes",
      methodLayer: "app",
      status: !knownAv ? "unknown" : a15plus && atLeast(sp, event("sam-2026-01").date) ? "blocked"
        : a14plus ? "contested" : "contested",
      confidence: knownAv && sp ? "medium" : "low",
      reason: a15plus && atLeast(sp, event("sam-2026-01").date)
        ? "Jan-2026 patch closed the remaining public test-menu/browser install routes on One UI 6.1.1/7."
        : "Menu availability is patch-level roulette on One UI 6/7 — treat as contested and verify.",
      evidenceDates: [event("sam-2026-01").date, event("talkback").date],
      fallback: "Odin stock flash no longer clears FRP by itself (server check). Go below-OS or accept official unlock.",
    })
  }

  // -- Exynos download mode (bootloader layer) -----------------------------
  if (samsung || chipset === "Exynos") {
    outlooks.push({
      methodId: "exynos_download_mode",
      label: "Exynos Download Mode + Odin",
      methodLayer: "bootloader",
      status: !knownAv ? "contested" : a15plus ? "blocked" : "contested",
      confidence: "medium",
      reason: a15plus
        ? "Flashing still works, but flashing does not erase FRP on Android 15+ — the re-lock is decided by a server the flash never touches."
        : "Flash-then-menu worked on many A13/14 builds; route narrows with every patch level.",
      evidenceDates: [event("sam-2026-01").date, event("server-frp").date, event("oneui8").date],
      fallback: "Knox-state check first (KG/RMM re-locks regardless). ISP for persist-level work.",
    })
  }

  // -- MediaTek Brom (bootrom layer) ---------------------------------------
  if (chipset === "MediaTek" || transsion) {
    outlooks.push({
      methodId: "mediatek_brom",
      label: "MediaTek BootROM (Brom) FRP erase",
      methodLayer: "bootrom",
      status: !knownAv ? "contested" : a15plus ? "contested" : "alive",
      confidence: "medium",
      reason: a15plus
        ? "Brom erases the FRP partition below the patchable stack, but two gates decide the outcome now: SLA/DAA on the chip (auth needed) and whether this unit is IMEI-enrolled in the server-side check. Bench-verify; do not promise."
        : "BootROM is mask silicon — unpatchable. On SLA-off chips this remains the most reliable software route (mtkclient `e frp`).",
      evidenceDates: [event("sla-daa").date, event("server-frp").date],
      fallback: "If SLA/DAA refuses the handshake: Kamakiri-class payload or vendor DA auth; if IMEI-enrolled server-side: official unlock — no physics shortcut exists against someone else's database.",
    })
  }

  // -- Qualcomm EDL (bootloader layer) --------------------------------------
  if (chipset === "Qualcomm" || is(vendor, "xiaomi", "redmi", "poco", "oppo", "vivo", "oneplus")) {
    outlooks.push({
      methodId: "qualcomm_edl",
      label: "Qualcomm EDL (9008) firehose",
      methodLayer: "bootloader",
      status: "contested",
      confidence: "medium",
      reason: "EDL is gate-kept by OEM-signed firehose programmers. With the right signed loader for the exact model it works; loaders are not redistributable, so per-model it is coin-flip availability, not physics.",
      evidenceDates: [event("firehose").date],
      fallback: "No signed loader → ISP/JTAG level, or official unlock.",
    })
  }

  // -- SPD / Unisoc (bootrom layer) -----------------------------------------
  if (chipset === "Spreadtrum" || transsion) {
    outlooks.push({
      methodId: "spd_bootloader",
      label: "Unisoc/SPD bootrom auto-ADB / fastboot route",
      methodLayer: "bootrom",
      status: !knownAv ? "contested" : a14plus ? "contested" : "alive",
      confidence: "medium",
      reason: a14plus
        ? "Auto-ADB bootrom tricks survive on many Unisoc Transsion models, but AVB + locked bootloaders on A14+ builds are closing models one by one."
        : "SPD bootrom paths historically alive on T606/T616-class Transsion devices.",
      evidenceDates: [event("sla-daa").date, event("a11-flags").date],
      fallback: "Research-download signed-pac flash, else ISP.",
    })
  }

  // -- Pixel note -----------------------------------------------------------
  if (pixel) {
    outlooks.push({
      methodId: "adb_provisioning",
      label: "Pixel: fastboot/AVB route",
      methodLayer: "bootloader",
      status: "blocked",
      confidence: "high",
      reason: "Pixels are the reference implementation for the server-side check and hardware attestation (Titan M). Locked-bootloader Pixels on current patches have no public FRP route — accept official unlock.",
      evidenceDates: [event("server-frp").date],
      fallback: "Google account recovery / proof-of-purchase channel only.",
    })
  }

  // -- Hardware floor: always listed (the physics layer) --------------------
  outlooks.push({
    methodId: "isp_jtag",
    label: "ISP / JTAG (eMMC-UFS direct, UFI/Easy-JTAG class)",
    methodLayer: "hardware",
    status: "contested",
    confidence: "medium",
    reason: "The flash obeys its pins — but where FRP state lives matters: persist-partition FRP erasable; RPMB-backed FRP is keyed and resists offline edits. Brick risk is real; bench equipment cost is real.",
    evidenceDates: [event("isp-bench").date],
    fallback: "Last resort below this is chip-off (destructive-adjacent) or official channel.",
  })
  outlooks.push({
    methodId: "chip_off",
    label: "Chip-off (physical flash transplant / lab)",
    methodLayer: "hardware",
    status: "contested",
    confidence: "low",
    reason: "Physics never patches a socket, but cost/skill/RPMB make this a forensic-lab route, not a shop route. Listed for completeness of the stack.",
    evidenceDates: [event("isp-bench").date],
    fallback: "Official unlock is usually cheaper than this rung.",
  })

  // -- headline + best rung --------------------------------------------------
  const alive = outlooks.filter(o => o.status === "alive").length
  const contested = outlooks.filter(o => o.status === "contested").length
  const headline = !knownAv
    ? "Unknown Android version — bands are low-confidence; scan the device (Build Profile) to score for real."
    : a15plus
      ? "Android 15+ era: anything decided by a server is out of physics' reach. Below-OS routes remain — verify on bench, never promise."
      : `Pre-15 era: ${alive} alive / ${contested} contested route(s) for this class. Still verify — patch level decides.`
  const best = outlooks.find(o => o.status === "alive") ?? outlooks.find(o => o.status === "contested")

  return {
    input,
    outlooks,
    headline,
    bestRung: best ? `${best.label} — ${best.status}, confidence ${best.confidence}` : "No route computed",
  }
}

// ---------- falsifiable forecasts + calibration ----------

export interface Forecast {
  id: string
  prediction: string
  confidence: Confidence
  /** decide-by date, YYYY-MM */
  testBy: string
  /** the observation that would PROVE the prediction wrong — Popper-style */
  falsifier: string
  status: "open" | "hit" | "miss"
  resolvedNote?: string
}

export const FORECASTS: Forecast[] = [
  {
    id: "fc-server-all",
    prediction: "By mid-2027, every vendor shipping Android 16+ enrolls new activations in the IMEI+Android-ID server-side FRP check (Samsung and Pixel already do).",
    confidence: "high",
    testBy: "2027-06",
    falsifier: "A credible, reproducible public bypass of the server-side check on a fully-enrolled device appears.",
    status: "open",
  },
  {
    id: "fc-sla-mandatory",
    prediction: "By 2028, MediaTek ships SLA/DAA authentication always-on across all new silicon; unsigned plain-Brom dies on every chip without a public bootrom exploit.",
    confidence: "high",
    testBy: "2028-01",
    falsifier: "A 2027–2028 MTK retail chip accepts unauthenticated Brom download out of the box.",
    status: "open",
  },
  {
    id: "fc-rom-invariant",
    prediction: "Standing invariant: every bootrom exploit already public keeps working on its silicon for the chip's entire commercial life — mask ROM cannot be patched in the field.",
    confidence: "high",
    testBy: "2030-01",
    falsifier: "Any vendor ships an OTA that fixes a burned-in mask-ROM bug (physically impossible — that is the point of teaching this invariant).",
    status: "open",
  },
  {
    id: "fc-attestation",
    prediction: "By Android 17, hardware-key attestation (Titan/TEE) becomes mandatory during first-boot setup on GMS devices; software-emulated attestation responses stop passing.",
    confidence: "medium",
    testBy: "2027-09",
    falsifier: "Android 17 ships and software-spoofed attestation still passes on a locked flagship.",
    status: "open",
  },
  {
    id: "fc-transsion-efuse",
    prediction: "Transsion's 2027 Unisoc models ship eFuse-locked bootroms that kill the current auto-ADB routes.",
    confidence: "medium",
    testBy: "2027-12",
    falsifier: "A 2027 Tecno/Infinix Unisoc retail unit still exposes the auto-ADB bootrom route.",
    status: "open",
  },
  {
    id: "fc-odin-shrink",
    prediction: "Samsung further restricts consumer Download Mode (service-signed images only on flagships) within 24 months.",
    confidence: "low",
    testBy: "2028-08",
    falsifier: "Odin consumer flashing still works unchanged on 2028 flagships.",
    status: "open",
  },
  // ---- resolved history — feeds the calibration meter ----
  {
    id: "fc-browser-close",
    prediction: "Samsung will close the remaining browser/APK side-load FRP routes within two patch cycles (made Nov 2025).",
    confidence: "high",
    testBy: "2026-03",
    falsifier: "Routes still open after Mar 2026 patch.",
    status: "hit",
    resolvedNote: "Closed by the Jan-2026 patch (event sam-2026-01).",
  },
  {
    id: "fc-server15",
    prediction: "Android 15 moves the FRP yes/no decision server-side for newly-activated devices (made Mar 2026).",
    confidence: "high",
    testBy: "2026-07",
    falsifier: "Android 15 launches with purely on-device FRP enforcement.",
    status: "hit",
    resolvedNote: "Confirmed by XDA June-2026 reporting (event server-frp).",
  },
  {
    id: "fc-edl-open",
    prediction: "Leaked firehose programmers will keep EDL practically open on most Qualcomm models through 2025 (made Jan 2025).",
    confidence: "medium",
    testBy: "2026-01",
    falsifier: "OEM signing roll-out closes most leaked-loader paths.",
    status: "miss",
    resolvedNote: "Signing enforcement spread faster than predicted; many models now need per-model signed loaders.",
  },
]

export interface Calibration {
  resolved: number
  hits: number
  misses: number
  /** honest label — deliberately NOT a percentage on small samples */
  label: string
}

export function calibration(forecasts: Forecast[] = FORECASTS): Calibration {
  const done = forecasts.filter(f => f.status !== "open")
  const hits = done.filter(f => f.status === "hit").length
  const misses = done.length - hits
  const label = done.length < 10
    ? `${hits}/${done.length} resolved correct — sample too small to read as accuracy. The meter exists to grow this sample honestly.`
    : `${hits}/${done.length} resolved correct (${Math.round((hits / done.length) * 100)}%)`
  return { resolved: done.length, hits, misses, label }
}

/** The sentence that must travel everywhere this engine is shown. */
export const HONESTY_BANNER =
  "Experimental reasoning engine. Bands, not promises. No tool on Earth — this one included — can guarantee FRP removal where enforcement is decided by a server (Android 15/16). Physics-layer routes (bootROM/hardware) are patched never, closed sometimes, and must be bench-verified every single time."
