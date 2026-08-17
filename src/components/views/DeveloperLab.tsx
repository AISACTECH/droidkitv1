import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  frpDetect,
  frpBuildDeviceProfile,
  frpRunMethod,
  frpVerifyHandshake,
  frpGetChipsetAlgorithms,
  frpGetAlgorithmPhases,
  prepareDestructiveOperation,
  type FrpDetectionResult,
  type DeviceProfile,
  type HandshakeVerification,
  type FrpAlgorithmInfo,
  type AlgorithmPhase,
  type ChipsetFamily,
  type PhaseAction,
} from "@/lib/frp-commands"
import { type DeviceInfo } from "@/tauri-commands"
import { assessDevice } from "@/components/views/FrpRemoval/RealityCheck"
import { PatchOracle } from "@/components/views/DeveloperLab/PatchOracle"
import {
  FlaskConical, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Download, Cpu, ClipboardList, Braces, ShieldCheck, Activity,
} from "lucide-react"
import { createLogger } from "@/lib/logger"
import {
  OperationSafetyGate,
  isOperationPreflightReady,
} from "@/components/OperationSafetyGate"

const logger = createLogger("DeveloperLab")

// =====================================================================
// FRP Developer Lab — EXPERIMENTAL
// Works on the gaps listed in FRP-ALGORITHM-ANALYSIS.md:
//   #6 Multi-phase verification  → every method run is followed by a
//      fresh frpDetect() and a BEFORE/AFTER state comparison.
//   #7 Auto-escalation           → evidence-ranked ADB ladder runs to a
//      verdict instead of a single attempt.
//   #8 Progress tracking          → deterministic, weight-based progress
//      (no random cosmetology).
//   Hardware paths (EDL/Brom/Odin/SPD) that the ADB engine cannot execute
//   yet are surfaced as an interactive Phase Runbook driven by the real
//   algorithm.rs phase weights — the developer checks off each phase as
//   it completes on-device, giving a truthful 0-100%.
// Purely additive: uses only pre-existing Tauri commands.
// =====================================================================

interface DeveloperLabProps {
  selectedDevice: DeviceInfo
}

type JournalLevel = "info" | "cmd" | "ok" | "warn" | "fail" | "verify"

interface JournalEntry {
  ts: string
  level: JournalLevel
  text: string
}

interface Verdict {
  status: "removed_verified" | "flags_set_unverified" | "escalated_failed"
  confidence: number
  winningMethod: string | null
  summary: string
}

/** ADB-only, fully-automatic methods, ranked by research evidence (safest/most
 *  general first). Manual-interaction methods (talkback, browser...) are NOT
 *  auto-runnable and are surfaced as guidance instead. */
const AUTO_LADDER: { id: string; label: string; classLabel: string }[] = [
  { id: "device_provisioning", label: "Device Provisioning Flags", classLabel: "flags" },
  { id: "content_provider_bypass", label: "Content Provider Injection", classLabel: "flags" },
  { id: "setup_wizard_disable", label: "Setup Wizard Disable", classLabel: "packages" },
  { id: "setup_wizard_uninstall", label: "Setup Wizard Uninstall (user 0)", classLabel: "packages" },
]

const CHIPSETS: ChipsetFamily[] = ["Exynos", "Qualcomm", "MediaTek", "Spreadtrum", "Kirin", "Unknown"]

function now(): string {
  return new Date().toLocaleTimeString()
}

function actionLabel(action: PhaseAction): string {
  if (typeof action === "string") return action
  const key = Object.keys(action)[0]
  return key
}

export function DeveloperLab({ selectedDevice }: DeveloperLabProps) {
  // --- session state ---
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [handshake, setHandshake] = useState<HandshakeVerification | null>(null)
  const [profile, setProfile] = useState<DeviceProfile | null>(null)
  const [before, setBefore] = useState<FrpDetectionResult | null>(null)
  const [after, setAfter] = useState<FrpDetectionResult | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0) // deterministic 0-100
  const [progressLabel, setProgressLabel] = useState("")
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false)
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const [typedAuthorization, setTypedAuthorization] = useState("")
  const safetyReady = isOperationPreflightReady(selectedDevice.serial_no, {
    ownershipConfirmed,
    backupConfirmed,
    typedAuthorization,
  })

  // --- runbook state ---
  const [chipset, setChipset] = useState<ChipsetFamily | null>(null)
  const [algorithms, setAlgorithms] = useState<FrpAlgorithmInfo[]>([])
  const [selectedAlgo, setSelectedAlgo] = useState<FrpAlgorithmInfo | null>(null)
  const [phases, setPhases] = useState<AlgorithmPhase[]>([])
  const [checkedPhases, setCheckedPhases] = useState<Set<number>>(new Set())
  const [loadingRunbook, setLoadingRunbook] = useState(false)

  useEffect(() => {
    setOwnershipConfirmed(false)
    setBackupConfirmed(false)
    setTypedAuthorization("")
  }, [selectedDevice.serial_no])

  const assessment = useMemo(
    () => (profile ? assessDevice(profile, before) : null),
    [profile, before],
  )

  const runbookProgress = useMemo(
    () => phases.reduce((sum, p, i) => sum + (checkedPhases.has(i) ? p.weight : 0), 0),
    [phases, checkedPhases],
  )

  const log = (level: JournalLevel, text: string) => {
    setJournal(j => [...j.slice(-299), { ts: now(), level, text }])
  }

  // ------------------------- ENGINE -------------------------

  const runEngine = async () => {
    if (!safetyReady) {
      log("warn", "Safety pre-flight incomplete; no mutating command was sent.")
      return
    }
    setRunning(true)
    setVerdict(null)
    setAfter(null)
    // Deterministic weight plan: handshake 5, snapshot 10, 4×(run 14 + verify 6) = 80, verdict 5 → 100
    const bump = (w: number, label: string) => { setProgress(p => Math.min(100, p + w)); setProgressLabel(label) }
    setProgress(0)

    try {
      // Phase 0 — handshake
      bump(0, "Handshake")
      let hs: HandshakeVerification | null = null
      try {
        hs = await frpVerifyHandshake(selectedDevice.serial_no)
        setHandshake(hs)
        log(hs.handshake_ok ? "ok" : "warn", `Handshake: ${hs.handshake_ok ? "OK (RSA authorized)" : hs.message}`)
      } catch (e) {
        log("fail", `Handshake command failed: ${e}. If USB debugging was authorized before the reset, reconnect the cable.`)
      }
      bump(5, "Handshake")

      // Phase 1 — snapshot
      let prof: DeviceProfile | null = null
      let detBefore: FrpDetectionResult | null = null
      try {
        bump(0, "Device snapshot")
        prof = await frpBuildDeviceProfile(selectedDevice.serial_no)
        setProfile(prof)
        setChipset(prof.chipset_family)
        log("info", `Profile: ${prof.brand} ${prof.model_code} · ${prof.chipset_family} · Android ${prof.android_version} · patch ${prof.security_patch ?? "N/A"}`)
        detBefore = await frpDetect(selectedDevice.serial_no)
        setBefore(detBefore)
        log("info", `FRP state BEFORE: ${detBefore.frp_state} · provisioned=${detBefore.device_provisioned} · setupComplete=${detBefore.user_setup_complete} · wizardRunning=${detBefore.setup_wizard_running}`)
      } catch (e) {
        log("fail", `Snapshot failed: ${e} — is a device connected and authorized?`)
        bump(10, "Snapshot failed")
        setVerdict({ status: "escalated_failed", confidence: 0, winningMethod: null, summary: "Could not read device state. Connect an authorized device and re-run." })
        setRunning(false)
        return
      }
      bump(10, "Snapshot")

      const assess = assessDevice(prof, detBefore)
      log("info", `Research assessment: ${assess.windowLabel} · feasibility ${assess.feasibility}%`)
      if (assess.window === "closed") {
        log("warn", "ADB window CLOSED on this device (2026 evidence). Ladder will still run in case ADB was pre-authorized — but expect the chipset hardware route (runbook below) to be the real path.")
      }

      // Phase 2 — escalation ladder with verification loop
      let finalVerdict: Verdict | null = null
      for (const step of AUTO_LADDER) {
        log("cmd", `RUN ${step.id} — ${step.label}`)
        let ran = false
        try {
          const permit = await prepareDestructiveOperation({
            deviceSerial: selectedDevice.serial_no,
            expectedModel: selectedDevice.model,
            operation: `frp_method:${step.id}`,
            ownershipConfirmed,
            backupConfirmed,
            typedConfirmation: typedAuthorization,
          })
          const res = await frpRunMethod(selectedDevice.serial_no, step.id, permit.token)
          ran = res.verification_status !== "active_after_operation"
            && res.verification_status !== "no_verified_change"
          for (const s of res.steps.slice(0, 4)) {
            log(s.success ? "ok" : "fail", `  ${s.command}${s.output ? ` → ${s.output.slice(0, 60)}` : ""}${s.error ? ` (error: ${s.error.slice(0, 60)})` : ""}`)
          }
          log(ran ? "ok" : "warn", `  method reports: ${ran ? "success" : "not successful"} — ${res.message.slice(0, 140)}`)
        } catch (e) {
          log("fail", `  ${step.id} threw: ${e}`)
        }
        bump(14, step.label)

        // Phase 2b — VERIFY (gap #6): re-detect and compare against BEFORE
        let detAfter: FrpDetectionResult | null = null
        try {
          detAfter = await frpDetect(selectedDevice.serial_no)
          setAfter(detAfter)
          const flippedInactive = detAfter.frp_state === "Inactive" && detBefore.frp_state !== "Inactive"
          const flagsFlipped = (detAfter.device_provisioned && detAfter.user_setup_complete)
            && !(detBefore.device_provisioned && detBefore.user_setup_complete)
          if (flippedInactive) {
            log("verify", `VERIFY ✓ FRP state flipped → Inactive after ${step.id}`)
            finalVerdict = {
              status: "flags_set_unverified",
              confidence: 60,
              winningMethod: step.id,
              summary: `${step.label} changed the current-boot reading to Inactive. This is not final success: reboot, reconnect and perform a fresh scan before closing the service record.`,
            }
          } else if (flagsFlipped) {
            log("verify", `VERIFY ~ provisioning flags flipped after ${step.id} (provisioned=1, setupComplete=1)`)
            finalVerdict = {
              status: "flags_set_unverified",
              confidence: 70,
              winningMethod: step.id,
              summary: `${step.label} changed provisioning flags, but final FRP state is not verified. Reboot, reconnect and run a fresh scan.`,
            }
          } else {
            log("verify", `VERIFY ✗ no state change after ${step.id} — escalating`)
          }
        } catch (e) {
          log("fail", `  verification probe failed: ${e}`)
        }
        bump(6, `Verify ${step.id}`)

        if (finalVerdict) break
      }

      // Phase 3 — verdict
      if (!finalVerdict) {
        finalVerdict = {
          status: "escalated_failed",
          confidence: 0,
          winningMethod: null,
          summary: `All ${AUTO_LADDER.length} automated ADB methods ran with no measured state change. This matches the 2026 evidence for patched devices. Next honest path: ${assess.chipsetRoute}`,
        }
        log("warn", "Ladder exhausted with no verified change — open the Phase Runbook below for the chipset hardware path.")
      }
      log(finalVerdict.status === "removed_verified" ? "ok" : finalVerdict.status === "flags_set_unverified" ? "warn" : "fail",
        `VERDICT: ${finalVerdict.status} (${finalVerdict.confidence}%) — ${finalVerdict.summary}`)
      setVerdict(finalVerdict)
      bump(5, "Verdict")
      setProgress(100)
      logger.info("Lab engine finished", { verdict: finalVerdict.status, confidence: finalVerdict.confidence })
    } finally {
      setRunning(false)
      setProgressLabel("")
    }
  }

  // ------------------------- RUNBOOK -------------------------

  const loadRunbook = async (family: ChipsetFamily) => {
    setLoadingRunbook(true)
    setSelectedAlgo(null)
    setPhases([])
    setCheckedPhases(new Set())
    try {
      const algos = await frpGetChipsetAlgorithms(family)
      setAlgorithms(algos)
      log("info", `Runbook loaded for ${family}: ${algos.length} algorithm(s)`)
    } catch (e) {
      log("fail", `Runbook load failed: ${e}`)
      setAlgorithms([])
    } finally {
      setLoadingRunbook(false)
    }
  }

  const openAlgorithm = async (algo: FrpAlgorithmInfo) => {
    setSelectedAlgo(algo)
    setCheckedPhases(new Set())
    try {
      const ph = await frpGetAlgorithmPhases(algo.id)
      setPhases(ph.length ? ph : algo.phases || [])
    } catch {
      setPhases(algo.phases || [])
    }
  }

  const togglePhase = (i: number) => {
    setCheckedPhases(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  // ------------------------- EXPORT -------------------------

  const exportJournal = () => {
    const data = {
      exported_at: new Date().toISOString(),
      device: selectedDevice,
      handshake,
      profile,
      detection_before: before,
      detection_after: after,
      verdict,
      journal,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `paralock-lab-${selectedDevice.serial_no}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const levelColor: Record<JournalLevel, string> = {
    info: "text-muted-foreground",
    cmd: "text-blue-400",
    ok: "text-green-400",
    warn: "text-yellow-400",
    fail: "text-red-400",
    verify: "text-cyan-400",
  }

  // ------------------------- RENDER -------------------------

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <FlaskConical className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              FRP Developer Lab
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">EXPERIMENTAL</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Auto-escalation engine · verification loop · truthful progress — targets gaps #6/#7/#8 from FRP-ALGORITHM-ANALYSIS.md
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportJournal} disabled={journal.length === 0}>
          <Download className="h-3 w-3" /> Export Session JSON
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="pr-3 space-y-3">
          {/* Experimental warning */}
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-purple-300/80 leading-4">
                  <strong>Authorized service feature.</strong> The engine executes ADB write operations only after Rust verifies a serial/model-bound one-use permit, then measures current-boot state after every step.
                  Current-boot readings are never labelled final success; reboot and a fresh scan remain mandatory.
                  In browser preview mode all device calls return mock data, so the full pipeline can be exercised safely.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engine card */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Play className="h-4 w-4 text-green-400" />
                Auto-Escalation Engine — run ladder, verify after every method
              </CardTitle>
              <CardDescription className="text-[11px]">
                Deterministic weights: handshake 5% · snapshot 10% · 4×(run 14% + verify 6%) · verdict 5%. If no measured change occurs, the engine tells you — then routes to the hardware runbook.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
                <OperationSafetyGate
                  compact
                  deviceSerial={selectedDevice.serial_no}
                  ownershipConfirmed={ownershipConfirmed}
                  backupConfirmed={backupConfirmed}
                  typedAuthorization={typedAuthorization}
                  onOwnershipChange={setOwnershipConfirmed}
                  onBackupChange={setBackupConfirmed}
                  onTypedAuthorizationChange={setTypedAuthorization}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Button size="sm" className="h-8 text-xs gap-2" onClick={runEngine} disabled={running || !safetyReady}>
                  {running ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  {running ? "Engine running..." : "Run Engine"}
                </Button>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-bold w-10 text-right">{Math.round(progress)}%</span>
              </div>
              {progressLabel && <div className="text-[10px] text-muted-foreground">Phase: {progressLabel}</div>}

              {/* verdict */}
              {verdict && (
                <div className={`p-3 rounded border text-xs space-y-2 ${
                  verdict.status === "removed_verified" ? "bg-green-500/10 border-green-500/30"
                  : verdict.status === "flags_set_unverified" ? "bg-yellow-500/10 border-yellow-500/30"
                  : "bg-red-500/10 border-red-500/30"
                }`}>
                  <div className="flex items-center gap-2 font-semibold">
                    {verdict.status === "removed_verified" ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                      : verdict.status === "flags_set_unverified" ? <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      : <XCircle className="h-4 w-4 text-red-400" />}
                    Verdict: {verdict.status.replace(/_/g, " ")}
                    {verdict.winningMethod && <Badge variant="outline" className="text-[9px]">{verdict.winningMethod}</Badge>}
                  </div>
                  <p className="text-[11px]">{verdict.summary}</p>
                  {verdict.status !== "escalated_failed" && (
                    <div className="text-[11px] p-2 rounded bg-muted/50 border">
                      <strong>Manual final check (the honest last 8-30%):</strong> reboot the device (Shell: <code>adb reboot</code>). If it boots past Google verification to setup/home, the removal held. Then press Run Engine again — the snapshot should report FRP Inactive.
                    </div>
                  )}
                </div>
              )}

              {/* before/after compare */}
              {(before || after) && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {([
                    ["BEFORE", before],
                    ["AFTER", after],
                  ] as const).map(([tag, d]) => (
                    <div key={tag} className="p-2 rounded bg-muted/50 border space-y-0.5">
                      <div className="font-semibold flex items-center gap-1"><Activity className="h-3 w-3" />{tag}</div>
                      {d ? (
                        <>
                          <div>FRP: <span className={d.frp_state === "Active" ? "text-red-400" : "text-green-400"}>{d.frp_state}</span></div>
                          <div>provisioned: {String(d.device_provisioned)} · setupComplete: {String(d.user_setup_complete)}</div>
                          <div>wizardRunning: {String(d.setup_wizard_running)} · accounts: {d.google_accounts.length}</div>
                        </>
                      ) : <div className="text-muted-foreground">not measured yet</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* evidence panel */}
              {assessment && (
                <div className="text-[11px] p-2 rounded bg-blue-500/5 border border-blue-500/20 space-y-1">
                  <div className="flex items-center gap-1 font-medium"><ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Evidence read — {assessment.windowLabel} · research feasibility {assessment.feasibility}%</div>
                  <div className="text-muted-foreground">{assessment.recommendedPath}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journal */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-cyan-400" />
                Session Journal
                <Badge variant="outline" className="text-[9px]">{journal.length} entries</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-48 rounded border bg-black/20">
                <div className="p-2 font-mono text-[10px] space-y-0.5">
                  {journal.length === 0 && <div className="text-muted-foreground">Run the engine to populate the journal…</div>}
                  {journal.map((e, i) => (
                    <div key={i} className={levelColor[e.level]}>
                      <span className="opacity-50">[{e.ts}]</span> {e.text}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Separator />

          {/* Phase Runbook */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Cpu className="h-4 w-4 text-orange-400" />
                Phase Runbook — chipset hardware paths (EDL · Brom · Odin · SPD)
              </CardTitle>
              <CardDescription className="text-[11px]">
                Operator checklist driven by algorithm.rs phase weights. The app does not execute EDL/Brom/Odin/SPD here. A full bar means every checklist item was acknowledged, not that FRP removal succeeded.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="flex gap-1 flex-wrap">
                {CHIPSETS.map(c => (
                  <Button
                    key={c}
                    size="sm"
                    variant={(chipset ?? profile?.chipset_family) === c ? "default" : "outline"}
                    className="h-7 text-[11px]"
                    disabled={loadingRunbook}
                    onClick={() => { setChipset(c); loadRunbook(c) }}
                  >
                    {c}
                  </Button>
                ))}
                {!chipset && profile && (
                  <Badge variant="outline" className="text-[10px] self-center">auto: {profile.chipset_family} from scan</Badge>
                )}
              </div>

              {algorithms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {algorithms.map(algo => (
                    <button
                      key={algo.id}
                      onClick={() => openAlgorithm(algo)}
                      className={`text-left p-2.5 rounded-lg border transition-colors ${selectedAlgo?.id === algo.id ? "border-orange-500 bg-orange-500/10" : "border-border/50 hover:bg-muted/50"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{algo.label}</span>
                        <span className="text-xs font-bold text-green-400" title="Evidence band (lab-gated)">{algo.success_rate}% band</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{algo.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedAlgo && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{selectedAlgo.label} — phase checklist</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all" style={{ width: `${runbookProgress}%` }} />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{runbookProgress}%</span>
                  </div>
                  <div className="space-y-1.5">
                    {phases.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => togglePhase(i)}
                        className={`w-full text-left p-2 rounded-lg border transition-colors flex items-start gap-2 ${checkedPhases.has(i) ? "border-green-500/40 bg-green-500/5" : "border-border/50 hover:bg-muted/40"}`}
                      >
                        {checkedPhases.has(i)
                          ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                          : <div className="h-4 w-4 rounded-full border border-muted-foreground/50 mt-0.5 shrink-0" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{i + 1}. {p.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{actionLabel(p.action)}</Badge>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">w{p.weight}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {runbookProgress >= 100 && (
                    <div className="text-[11px] p-2 rounded bg-green-500/10 border border-green-500/30 text-green-300">
                      All phases checked. Final honest step: observe boot-to-welcome without Google verification, then re-scan — the engine snapshot should read FRP Inactive.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw snapshot */}
          {(profile || handshake) && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Braces className="h-4 w-4 text-muted-foreground" />
                  Raw Snapshot (developer truth)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-40 rounded border bg-black/20">
                  <pre className="p-2 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify({ handshake, profile, detection_before: before, detection_after: after }, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Patch Oracle — physics-layer forecaster (additive, offline, no device commands) */}
          <PatchOracle profile={profile} />
        </div>
      </ScrollArea>
    </div>
  )
}
