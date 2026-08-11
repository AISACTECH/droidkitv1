import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale, CheckCircle2, AlertTriangle, Info, Cpu, ShieldCheck } from "lucide-react"
import type { DeviceProfile, FrpDetectionResult } from "@/lib/frp-commands"

/**
 * Research Reality Check — evidence-based feasibility assessment (Aug 2026 research).
 *
 * Sources distilled into these rules (see RESEARCH-2026-FRP.md):
 *  - Android 14 + One UI 6: *#0*#, browser-APK, TalkBack, SIM-PIN and ADB-at-setup are mostly patched.
 *  - Android 15/16: software-only routes "mostly fail" industry-wide; vendors pivot to hardware
 *    modes (Brom/EDL/Odin) or IMEI server services.
 *  - ADB removal works when USB debugging was enabled + authorized before the reset,
 *    or when a live authorization route (test-mode / diagnostic menu / SPD auto-ADB) exists.
 *  - Chipset hardware paths remain open below the OS: MTK Brom (open-source mtkclient protocol),
 *    SPD bootrom auto-ADB tools, Exynos Download-Mode Odin flows, Qualcomm EDL 9008.
 */

interface RealityCheckProps {
  profile: DeviceProfile
  detection: FrpDetectionResult | null
}

type AdbWindow = "open" | "narrow" | "closed"

interface Assessment {
  window: AdbWindow
  feasibility: number
  windowLabel: string
  windowDetail: string
  recommendedPath: string
  chipsetRoute: string
  evidence: string[]
}

function parseAndroidMajor(v: string): number | null {
  const m = v.trim().match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function parsePatchYear(p: string | null): number | null {
  if (!p) return null
  const m = p.trim().match(/^(20\d\d)/)
  return m ? parseInt(m[1], 10) : null
}

function chipsetRouteFor(profile: DeviceProfile): { route: string; note: string } {
  switch (profile.chipset_family) {
    case "Exynos":
      return {
        route: "Download Mode + Odin: flash enable-ADB package (legacy: combination firmware), then this app's ADB removal, then reflash stock",
        note: "SamFw-class flow. On Android 10+ flash full stock firmware first, then *#0*# test-mode flow if the diagnostic menu opens.",
      }
    case "Qualcomm":
      return {
        route: "EDL 9008 + chipset firehose loader, erase FRP partition at block level",
        note: "Recent models may require an EDL engineering cable and a signed loader. This is a hardware-level path — below the OS, so patch level cannot close it.",
      }
    case "MediaTek":
      return {
        route: "Brom/Preloader mode + erase frp partition (open-source mtkclient protocol class)",
        note: "Most open path in 2026: the BROM exploit chain is public and cross-platform. Newer secured chips may demand a signed Download Agent (SLA/DAA).",
      }
    case "Spreadtrum":
      return {
        route: "SPD bootrom tool (Vol keys + USB entry auto-enables ADB and developer prompt)",
        note: "Community SPD tools for Tecno/Infinix/Itel work offline on this chipset family.",
      }
    default:
      return {
        route: "ADB window only; otherwise official Google account recovery or authorized service center",
        note: "Unknown chipset — no public hardware erase path is integrated here yet.",
      }
  }
}

export function assessDevice(profile: DeviceProfile, detection: FrpDetectionResult | null): Assessment {
  const major = parseAndroidMajor(profile.android_version)
  const patchYear = parsePatchYear(profile.security_patch ?? detection?.security_patch ?? null)

  let window: AdbWindow = "narrow"
  const unknownVersion = major === null
  if (major !== null && major <= 12 && (patchYear === null || patchYear <= 2022)) window = "open"
  else if (major !== null && major >= 15) window = "closed"
  else if (major === 14 && patchYear !== null && patchYear >= 2024) window = "closed"
  else if (major === 13 && (patchYear === null || patchYear <= 2023)) window = "narrow"

  const evidenceBase: Record<AdbWindow, { label: string; detail: string; base: number }> = {
    open: {
      label: "ADB window: OPEN",
      detail: "Android ≤ 12 with pre-2023 patch — the era where ADB, test-mode, and provisioning methods broadly succeed.",
      base: 88,
    },
    narrow: {
      label: "ADB window: NARROW",
      detail: "Android 13–14 era — model- and patch-dependent. If the *#0*# diagnostic menu opens or ADB was pre-authorized before reset, ADB removal can still complete.",
      base: 55,
    },
    closed: {
      label: "ADB window: CLOSED (patched)",
      detail: "Android 15+/recent patch — Google has closed setup-screen, browser-APK and ADB-before-setup routes industry-wide. No software-only vendor beats this wall.",
      base: 15,
    },
  }

  const w = evidenceBase[window]
  const { route, note } = chipsetRouteFor(profile)

  // Hardware chipset paths sit below the OS patch wall — keep a meaningful route open.
  const hardwareBonus = window === "closed"
    ? (profile.chipset_family === "MediaTek" ? 35 : profile.chipset_family === "Spreadtrum" ? 30 : profile.chipset_family === "Exynos" || profile.chipset_family === "Qualcomm" ? 25 : 0)
    : 0
  const knownModelBonus = profile.marketing_name ? 3 : 0
  const feasibility = Math.min(97, Math.max(5, w.base + hardwareBonus + knownModelBonus))

  const recommendedPath = window === "open"
    ? "This app's ADB methods now — run Verify Handshake, then Reset / Auto-Bypass."
    : window === "narrow"
      ? "Try the *#0*# test-mode flow first. If the diagnostic menu opens and USB debugging authorizes, run this app's ADB removal. If not, use the chipset route below."
      : "Software-only routes are patched on this device. Use the chipset hardware route below, official Google account recovery, or an authorized service center. ADB only helps if it was authorized BEFORE the reset."

  const evidence = [
    "2026 testing consensus: TalkBack / SIM-PIN / browser-APK / *#0*# tricks mostly fail on Android 14+ (One UI 6) and are effectively dead on 15/16 (Wondershare research lab, Apeaksoft SamFw 2026 review).",
    "Independent field reports: ADB-based FRP removal still completes wherever USB debugging can be legitimately activated before or during setup (r/FRPbypassSamsung, r/FRPtools).",
    "Below-OS paths persist: open-source MTKClient erases the FRP partition over Brom mode; SPD bootrom tools auto-enable ADB on Tecno/Infinix/Itel; Exynos Odin + enable-ADB flow remains documented for 2026.",
  ]

  return {
    window,
    feasibility,
    windowLabel: w.label,
    windowDetail: w.detail,
    recommendedPath,
    chipsetRoute: `${route} — ${note}`,
    evidence: unknownVersion
      ? [...evidence, "Android version could not be parsed from the scan — assessment assumes the middle band."]
      : evidence,
  }
}

export function RealityCheckPanel({ profile, detection }: RealityCheckProps) {
  const a = assessDevice(profile, detection)

  const bandColor =
    a.window === "open" ? "border-green-500/30 bg-green-500/5"
    : a.window === "narrow" ? "border-yellow-500/30 bg-yellow-500/5"
    : "border-red-500/30 bg-red-500/5"
  const textColor =
    a.window === "open" ? "text-green-400"
    : a.window === "narrow" ? "text-yellow-400"
    : "text-red-400"
  const barColor =
    a.feasibility >= 70 ? "bg-green-500"
    : a.feasibility >= 40 ? "bg-yellow-500"
    : "bg-red-500"

  return (
    <Card className={`border ${bandColor}`}>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-2">
          <Scale className={`h-4 w-4 ${textColor}`} />
          Research Reality Check — Evidence-Based Feasibility (Aug 2026)
          <Badge variant="outline" className={`text-[10px] ${textColor}`}>{a.windowLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2 text-[11px]">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${barColor}`} style={{ width: `${a.feasibility}%` }} />
          </div>
          <span className={`text-sm font-bold ${textColor}`}>{a.feasibility}%</span>
        </div>

        <p className="text-muted-foreground leading-4">{a.windowDetail}</p>

        <div className="p-2 rounded bg-muted/50 border space-y-1">
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
            <span><strong>Recommended for this device:</strong> {a.recommendedPath}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <span><strong>{profile.chipset_family} hardware route:</strong> {a.chipsetRoute}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <Info className="h-3.5 w-3.5 text-muted-foreground" /> Why (sources in RESEARCH-2026-FRP.md):
          </div>
          {a.evidence.map((e, i) => (
            <div key={i} className="flex items-start gap-1.5 text-muted-foreground leading-4">
              <AlertTriangle className="h-3 w-3 text-yellow-500/70 mt-0.5 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
          <ShieldCheck className="h-3 w-3" />
          Honest-scope promise: DroidKit claims success only inside the envelope above — the same envelope that governs every commercial tool (SamFw, Dr.Fone, 4uKey).
        </div>
      </CardContent>
    </Card>
  )
}
