import { useMemo, useRef, useState, type ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  frpDetect,
  frpBuildDeviceProfile,
  frpPartitionSurvey,
  type DeviceProfile,
  type FrpDetectionResult,
  type PartitionSurveyRaw,
} from "@/lib/frp-commands"
import {
  brandIdOf,
  createAdaptiveSession,
  buildAdaptivePlan,
  AdaptiveJournal,
  fingerprintKey,
  assessAvb,
  planRollback,
  AVB_HONESTY,
  simulatePath,
  flowForBrand,
  classifyFromDump,
  chainSummary,
  CATALOG,
  getMethod,
  runValidationMatrix,
  verdictLabel,
  buildAnalyticsReport,
  generateAdbScript,
  generateUiAutomationScript,
  buildDumpManifest,
  buildPatchPlan,
  evaluateFlashGates,
  generateRecoveryScript,
  evaluateSafety,
  validateUpdatePack,
  A15_16_PATCH_DIGEST,
  LAB_LEDGER,
  evaluateParallelLanes,
  QUANTUM_NOTE,
  NO_EVASION_NOTE,
  HIDE_SEEK_POLICY,
  RESEARCH_HONESTY,
  ANDROID_1516_NOTE,
  type Fingerprint,
  type FsmStateId,
  type DeviceExecutor,
  type ValidationMatrixRow,
} from "@/lib/adaptive-engine"
import { RealityCheckPanel } from "@/components/views/FrpRemoval/RealityCheck"
import { BenchDesk } from "@/components/views/AdaptiveEngine/BenchDesk"
import { type DeviceInfo } from "@/tauri-commands"
import { createLogger } from "@/lib/logger"
import {
  ShieldCheck, Cpu, GitBranch, Workflow, Play, RefreshCw,
  ScrollText, AlertTriangle, CheckCircle2, Timer, FileJson, ScanSearch,
  BarChart3, FileCode2, HardDrive, PackageCheck, ClipboardCopy, Layers, Gauge,
  FlaskConical,
} from "lucide-react"

const logger = createLogger("AdaptiveEngine")

// =====================================================================
// FRP Adaptive Engine — first-class feature (docs/FRP-ADAPTIVE-ENGINE-PLAN.md)
// Round 2 (full WBS): algorithm selector + progress monitor (CA4),
// analytics/calibration (CA2), execution scripts (A1-3.1, A2-2.3),
// patch planner + gates + recovery (A3), update-pack pipeline (CA3).
// Honest bands: feasibility is measured, never promised.
// =====================================================================

interface AdaptiveEngineProps {
  selectedDevice: DeviceInfo
}

type AlgoId = "all" | "exploit" | "ui" | "patch"

const BAND_COLORS: Record<string, string> = {
  none_needed: "border-zinc-500/30 bg-zinc-500/5",
  adb_live: "border-green-500/30 bg-green-500/5",
  testmode_contested: "border-yellow-500/30 bg-yellow-500/5",
  chipset_hardware: "border-orange-500/30 bg-orange-500/5",
  official_only: "border-red-500/30 bg-red-500/5",
  unknown: "border-zinc-500/30 bg-zinc-500/5",
}

const RISK_COLORS: Record<string, string> = {
  none: "text-zinc-400 border-zinc-500/30",
  low: "text-green-400 border-green-500/30",
  medium: "text-yellow-400 border-yellow-500/30",
  high: "text-red-400 border-red-500/30",
}

function toEngineFingerprint(profile: DeviceProfile, detection: FrpDetectionResult | null): Fingerprint {
  const majorMatch = (profile.android_version || "").trim().match(/^(\d{1,2})/)
  return {
    brand: brandIdOf(profile.brand),
    brandRaw: profile.brand,
    modelCode: profile.model_code,
    marketingName: profile.marketing_name,
    chipsetFamily: profile.chipset_family,
    chipsetName: profile.chipset_name,
    androidMajor: majorMatch ? parseInt(majorMatch[1], 10) : null,
    androidVersionRaw: profile.android_version,
    sdkVersion: profile.sdk_version,
    securityPatch: profile.security_patch ?? detection?.security_patch ?? null,
    binaryVersion: profile.binary_version,
    bootloaderVersion: profile.bootloader_version,
    buildFingerprint: profile.build_fingerprint,
    knoxVersion: profile.knox_version,
    frpState: profile.frp_state,
    adbState: profile.adb_state,
    deviceMode: profile.device_mode,
    hasSim: profile.has_sim,
    hasWifi: profile.has_wifi,
  }
}

/** Deterministic offline validation executor (mock — labelled as such). */
function mockMatrixExecutor(): DeviceExecutor {
  let state = { frp_active: "1", device_provisioned: "0", user_setup_complete: "0" }
  return {
    async runAdb(cmd) {
      if (cmd.includes("settings put") || cmd.includes("content insert") || cmd.includes("pm disable-user")) {
        state.device_provisioned = "1"
        state.user_setup_complete = "1"
      }
      if (cmd.includes("pm uninstall")) state.frp_active = "0"
      return "ok (mock)"
    },
    async detectState() {
      return { ...state }
    },
  }
}

export function AdaptiveEngine({ selectedDevice }: AdaptiveEngineProps) {
  const journalRef = useRef<AdaptiveJournal | null>(null)
  if (!journalRef.current) journalRef.current = new AdaptiveJournal()

  const [consentChecked, setConsentChecked] = useState(false)
  const [activeAlgo, setActiveAlgo] = useState<AlgoId>("all")
  const [profile, setProfile] = useState<DeviceProfile | null>(null)
  const [detection, setDetection] = useState<FrpDetectionResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const [fsmSeed, setFsmSeed] = useState(7)
  const [simulated, setSimulated] = useState<ReturnType<typeof simulatePath> | null>(null)
  const [dumpText, setDumpText] = useState("")
  const [dumpResult, setDumpResult] = useState<string | null>(null)

  const [survey, setSurvey] = useState<PartitionSurveyRaw | null>(null)
  const [surveying, setSurveying] = useState(false)
  const [backupsReady, setBackupsReady] = useState(false)
  const [bitVersionChecked, setBitVersionChecked] = useState(false)
  const [firmwareArchived, setFirmwareArchived] = useState(false)
  const [hashesVerified, setHashesVerified] = useState(false)
  const [exported, setExported] = useState(false)

  const [matrixRows, setMatrixRows] = useState<ValidationMatrixRow[] | null>(null)
  const [copyNote, setCopyNote] = useState<string | null>(null)

  const [packText, setPackText] = useState("")
  const [packResult, setPackResult] = useState<string | null>(null)

  const fingerprint = useMemo(
    () => (profile ? toEngineFingerprint(profile, detection) : null),
    [profile, detection],
  )
  const session = useMemo(
    () => (fingerprint ? createAdaptiveSession(fingerprint) : null),
    [fingerprint],
  )

  async function handleScan() {
    setScanning(true)
    setScanError(null)
    try {
      const [prof, det] = await Promise.all([
        frpBuildDeviceProfile(selectedDevice.serial_no),
        frpDetect(selectedDevice.serial_no),
      ])
      setProfile(prof)
      setDetection(det)
      const engineFp = toEngineFingerprint(prof, det)
      const plan = buildAdaptivePlan(engineFp)
      journalRef.current!.append(
        "plan",
        `${prof.brand}::${prof.model_code}`,
        `Scan: ${prof.chipset_family} · Android ${prof.android_version} · patch ${prof.security_patch ?? "?"} · ADB ${prof.adb_state} · FRP ${prof.frp_state} → ${plan.band.label} → ${chainSummary(plan)}`,
      )
      logger.info("adaptive scan complete", { model: prof.model_code })
    } catch (e) {
      const msg = String(e)
      setScanError(msg)
      logger.warn("adaptive scan failed", { error: msg })
    } finally {
      setScanning(false)
    }
  }

  async function handleSurvey() {
    if (!profile) return
    setSurveying(true)
    try {
      const raw = await frpPartitionSurvey(selectedDevice.serial_no)
      setSurvey(raw)
      journalRef.current!.append(
        "info",
        fingerprintKey({ brandRaw: profile.brand, modelCode: profile.model_code }),
        "Partition survey completed (read-only).",
      )
    } catch (e) {
      logger.warn("partition survey failed", { error: String(e) })
    } finally {
      setSurveying(false)
    }
  }

  const avb =
    survey && fingerprint
      ? assessAvb(
          { readOnly: survey.read_only, properties: survey.properties, blockDevices: survey.block_devices },
          fingerprint,
        )
      : null

  const rollback = useMemo(() => {
    if (!session) return null
    const persistent = session.plan.chain
      .filter((m) => m.persistence === "firmware_flash")
      .map((m) => ({ label: m.name, kind: "flash" as const }))
    if (persistent.length === 0) return null
    return planRollback(
      persistent,
      persistent.map((p) => ({ partition: p.label, captured: backupsReady })),
    )
  }, [session, backupsReady])

  function handleSimulate() {
    if (!fingerprint) return
    const path = simulatePath(fingerprint.brand, fsmSeed)
    setSimulated(path)
    logger.info("fsm simulated", { brand: fingerprint.brand, seed: fsmSeed, outcome: path.outcome })
  }

  function handleClassify() {
    if (!fingerprint || !dumpText.trim()) return
    const c = classifyFromDump(dumpText, fingerprint.brand)
    setDumpResult(
      `→ ${c.state} (confidence ${Math.round(c.confidence * 100)}%${c.matched.length ? `, matched: ${c.matched.join(", ")}` : ""})`,
    )
  }

  function handleExport() {
    const json = journalRef.current!.exportJson()
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `droidkit-adaptive-${selectedDevice.serial_no}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
  }

  function handleValidationMatrix() {
    const ladder = ["adb_provisioning_flags", "content_provider_injection", "setup_wizard_disable", "setup_wizard_uninstall"]
      .map((id) => getMethod(id))
      .filter((m): m is NonNullable<typeof m> => m !== undefined)
    const executor = mockMatrixExecutor()
    void runValidationMatrix(ladder, executor).then(({ rows }) => {
      setMatrixRows(rows)
      for (const row of rows) {
        journalRef.current!.append("verify", "offline-matrix", `${row.note}: ${verdictLabel(row.verdict)}`, {
          method: row.methodId,
          outcome: row.verdict === "failed" ? "failure" : "success",
        })
      }
      logger.info("offline validation matrix complete", { rows: rows.length })
    })
  }

  function handleUpdatePackValidate() {
    if (!packText.trim()) return
    try {
      const payload = JSON.parse(packText)
      const result = validateUpdatePack(payload)
      setPackResult(`${result.summary}${result.errors.length ? "\n" + result.errors.map((e) => `❌ ${e}`).join("\n") : ""}`)
    } catch (e) {
      setPackResult(`Not valid JSON: ${String(e)}`)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyNote("Copied to clipboard ✓")
    } catch {
      setCopyNote("Copy failed — select the text manually")
    }
    window.setTimeout(() => setCopyNote(null), 2500)
  }

  const flow = fingerprint ? flowForBrand(fingerprint.brand) : null

  // ---- CA4: deterministic decision-pipeline progress (never "unlock %") ----
  const workItems = [
    { label: "Ownership consent", weight: 10, done: consentChecked },
    { label: "Device fingerprint scan", weight: 15, done: profile !== null },
    { label: "Band + exploit plan", weight: 15, done: session !== null },
    { label: "UI FSM simulation", weight: 20, done: simulated !== null },
    { label: "Read-only partition survey", weight: 15, done: survey !== null },
    { label: "Backup/rollback manifest", weight: 10, done: backupsReady },
    { label: "Journal export", weight: 15, done: exported },
  ]
  const progressPct = workItems.reduce((s, w) => s + (w.done ? w.weight : 0), 0)

  const safety = useMemo(() => {
    if (!session) return null
    return evaluateSafety(session.plan, {
      consentOwnership: consentChecked,
      frpActive: fingerprint?.frpState === "Active",
      backupsReady,
      bitVersionChecked,
      hardwareLaneOk: true,
    })
  }, [session, consentChecked, fingerprint, backupsReady, bitVersionChecked])

  // ---- CA4: algorithm selector ----
  const algoCards: { id: AlgoId; label: string; desc: string }[] = [
    { id: "all", label: "Coordinated", desc: "All three algorithms in one pipeline" },
    { id: "exploit", label: "Algorithm #1 · Exploit Automation", desc: "Fingerprint → band → ranked chain → verification" },
    { id: "ui", label: "Algorithm #2 · UI Interaction", desc: "Rule-based FSM, classifier, humanized input" },
    { id: "patch", label: "Algorithm #3 · Partition Safety", desc: "Dump → minimal patch plan → gates → recovery" },
  ]
  const tabs = [
    { id: "plan", algo: "exploit" as AlgoId },
    { id: "fsm", algo: "ui" as AlgoId },
    { id: "partition", algo: "patch" as AlgoId },
    { id: "patch", algo: "patch" as AlgoId },
    { id: "analytics", algo: "all" as AlgoId },
    { id: "execution", algo: "all" as AlgoId },
    { id: "updates", algo: "all" as AlgoId },
    { id: "research", algo: "all" as AlgoId },
    { id: "bench", algo: "all" as AlgoId },
    { id: "journal", algo: "all" as AlgoId },
  ]
  const visibleTabs = tabs.filter((t) => activeAlgo === "all" || t.algo === activeAlgo)

  const adbScript = useMemo(
    () => (session ? generateAdbScript(session.plan, fsmSeed) : null),
    [session, fsmSeed],
  )
  const uiScript = useMemo(
    () => (simulated ? generateUiAutomationScript(simulated.trace, fsmSeed) : null),
    [simulated, fsmSeed],
  )
  const scriptText = useMemo(() => {
    const all = adbScript ?? uiScript
    if (!all) return ""
    return [...all.header, ...all.lines.map((l) => l.line), ...all.footer].join("\n")
  }, [adbScript, uiScript])

  const dumpManifest = fingerprint ? buildDumpManifest(fingerprint.chipsetFamily) : null
  const patchPlan = session ? buildPatchPlan(session.fingerprint.chipsetFamily, session.band.band) : null
  const flashGates = evaluateFlashGates({ backupsReady, bitVersionChecked, firmwareArchived, hashesVerified })
  const recovery = dumpManifest ? generateRecoveryScript(dumpManifest) : null

  const report = useMemo(
    () => buildAnalyticsReport(journalRef.current!.recent(1000), CATALOG),
    [matrixRows, // eslint-disable-line react-hooks/exhaustive-deps
    ],
  )

  // Round-3 research layer: parallel three-lane evaluation + patch digest (isolated, read-only).
  const [patchFilter, setPatchFilter] = useState<"all" | "15" | "16">("all")
  const gapReport = useMemo(() => {
    if (!fingerprint) return null
    return evaluateParallelLanes(
      fingerprint,
      {
        verifiedBootState: avb?.verifiedBootState,
        vbmetaDeviceState: avb?.vbmetaDeviceState,
        buildTags: avb?.buildTags,
      },
      fsmSeed,
    )
  }, [fingerprint, avb, fsmSeed])
  const digestRows = A15_16_PATCH_DIGEST.filter(
    (p) => patchFilter === "all" || p.android === patchFilter || p.android === "15+16",
  )

  return (
    <div className="space-y-4 p-4">
      {/* Consent gate — own-device / authorized-servicer only */}
      <Card className="border-zinc-500/30 bg-zinc-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-green-400" /> Ownership &amp; authorization gate
          </CardTitle>
          <CardDescription>
            FRP removal is lawful on devices you own (second-hand purchase, forgotten credentials,
            authorized refurbishing). Bypassing locks on devices you do not own is illegal.
            The engine refuses to run until this is confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch id="adaptive-consent" checked={consentChecked} onCheckedChange={setConsentChecked} />
          <Label htmlFor="adaptive-consent">
            I own this device (or am authorized to service it), and I have a backup of its data.
          </Label>
        </CardContent>
      </Card>

      {/* Algorithm selector + progress monitor (CA4) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4" /> Algorithm selector &amp; progress
          </CardTitle>
          <CardDescription>
            Select the algorithm lane to focus, or run all three coordinated. Progress is the
            decision-pipeline (scan → plan → simulate → survey → backups → export) — it is NOT an
            unlock percentage, and it never will be.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            {algoCards.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveAlgo(c.id)}
                className={`rounded-md border p-2 text-left text-[11px] transition-colors ${
                  activeAlgo === c.id ? "border-green-500/50 bg-green-500/10" : "border-zinc-500/30 bg-zinc-500/5 hover:border-zinc-400/40"
                }`}
              >
                <div className="font-medium text-zinc-200">{c.label}</div>
                <div className="text-zinc-500">{c.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-zinc-500" />
            <span className="text-[11px] text-zinc-400">Pipeline progress: {progressPct}%</span>
            <Progress value={progressPct} className="h-1.5 flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
            {workItems.map((w) => (
              <div key={w.label} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                {w.done ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <span className="text-zinc-700">○</span>}
                {w.label} ({w.weight})
              </div>
            ))}
          </div>
          {safety && (
            <div className={`rounded-md border p-2 text-[11px] ${safety.allowed ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <span className="font-medium text-zinc-200">Safety coordinator: </span>
              <span className={safety.allowed ? "text-green-400" : "text-red-400"}>
                {safety.allowed ? "allowed" : "REFUSED"}
              </span>
              {safety.failures.map((f, i) => (
                <div key={i} className="text-red-400">⛔ {f}</div>
              ))}
              {safety.warnings.map((w, i) => (
                <div key={i} className="text-yellow-400">⚠ {w}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan + fingerprint */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScanSearch className="h-4 w-4" /> Device fingerprint
          </CardTitle>
          <CardDescription>
            Reuses the existing <code>frp_build_device_profile</code> + <code>frp_detect</code>{" "}
            commands — the Adaptive Engine adds the decision layer on top.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleScan} disabled={!consentChecked || scanning}>
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning…" : "Scan device"}
            </Button>
            {scanError && <span className="text-[11px] text-red-400">{scanError}</span>}
          </div>
          {fingerprint && session && (
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-4">
                <div><span className="text-zinc-500">Brand</span><div className="text-zinc-200">{fingerprint.brandRaw || "?"}</div></div>
                <div><span className="text-zinc-500">Model</span><div className="text-zinc-200">{fingerprint.modelCode || "?"}</div></div>
                <div><span className="text-zinc-500">Chipset</span><div className="text-zinc-200">{fingerprint.chipsetFamily}</div></div>
                <div><span className="text-zinc-500">Android</span><div className="text-zinc-200">{fingerprint.androidMajor ?? "?"} (SDK {fingerprint.sdkVersion || "?"})</div></div>
                <div><span className="text-zinc-500">Security patch</span><div className="text-zinc-200">{fingerprint.securityPatch ?? "unknown"}</div></div>
                <div><span className="text-zinc-500">ADB state</span><div className="text-zinc-200">{fingerprint.adbState}</div></div>
                <div><span className="text-zinc-500">FRP state</span><div className="text-zinc-200">{fingerprint.frpState}</div></div>
                <div><span className="text-zinc-500">Mode</span><div className="text-zinc-200">{fingerprint.deviceMode}</div></div>
              </div>
              <div className={`rounded-md border p-3 ${BAND_COLORS[session.band.band] ?? BAND_COLORS.unknown}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">{session.band.label}</span>
                  <span className="text-zinc-400">feasibility {session.band.feasibility}/97</span>
                </div>
                <Progress value={session.band.feasibility} className="mt-2 h-1.5" />
                <p className="mt-2 text-zinc-400">{session.band.detail}</p>
                <p className="mt-1 text-zinc-300"><span className="text-zinc-500">Route: </span>{session.band.nextRoute}</p>
                <div className="mt-2 space-y-0.5 text-zinc-500">
                  {session.band.rationale.map((r, i) => <div key={i}>• {r}</div>)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs key={activeAlgo} defaultValue={visibleTabs[0].id}>
        <TabsList className="flex-wrap">
          {visibleTabs.map((t) => {
            const icons: Record<string, ReactNode> = {
              plan: <GitBranch className="mr-1 h-3.5 w-3.5" />,
              fsm: <Workflow className="mr-1 h-3.5 w-3.5" />,
              partition: <Cpu className="mr-1 h-3.5 w-3.5" />,
              patch: <HardDrive className="mr-1 h-3.5 w-3.5" />,
              analytics: <BarChart3 className="mr-1 h-3.5 w-3.5" />,
              execution: <FileCode2 className="mr-1 h-3.5 w-3.5" />,
              updates: <PackageCheck className="mr-1 h-3.5 w-3.5" />,
              research: <BarChart3 className="mr-1 h-3.5 w-3.5" />,
              bench: <FlaskConical className="mr-1 h-3.5 w-3.5" />,
              journal: <ScrollText className="mr-1 h-3.5 w-3.5" />,
            }
            return (
              <TabsTrigger key={t.id} value={t.id}>
                {icons[t.id] ?? null}
                {t.id === "plan" ? "Exploit chain" : t.id === "fsm" ? "UI state machine" : t.id === "partition" ? "Partition survey" : t.id === "patch" ? "Patch planner" : t.id === "analytics" ? "Analytics" : t.id === "execution" ? "Scripts" : t.id === "updates" ? "Update packs" : t.id === "research" ? "Patch research" : "Journal"}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* ---------------- Exploit chain ---------------- */}
        <TabsContent value="plan" className="space-y-4">
          {!session || !fingerprint ? (
            <Card><CardContent className="pt-4 text-[12px] text-zinc-500">Scan the device to build the plan.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ranked chain — {chainSummary(session.plan)}</CardTitle>
                  <CardDescription>
                    Escalation policy: <Badge variant="outline">{session.plan.escalationPolicy}</Badge>{" "}
                    · evidence-ranked, verify-after-every-rung.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {session.plan.chain.map((m, i) => (
                    <div key={m.id} className="flex items-start gap-2 rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2">
                      <Badge variant="outline" className="shrink-0">{i === 0 ? "primary" : `fallback ${i}`}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-medium text-zinc-200">{m.name}</span>
                          <Badge variant="outline" className="text-[10px]">{m.klass}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${RISK_COLORS[m.risk]}`}>risk: {m.risk}</Badge>
                          <Badge variant="outline" className="text-[10px]">{m.layer}</Badge>
                          <Badge variant="outline" className="text-[10px]">evidence {m.evidenceWeight}/100</Badge>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {m.preconditions(fingerprint)
                            ? "✓ preconditions pass"
                            : `✗ ${m.preconditionNote}`}
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-400">{m.decay.note}</div>
                        <div className="mt-1 space-y-0.5 text-[11px] text-zinc-500">
                          {m.steps.map((s, si) => (
                            <div key={si}>• [{s.kind}] {s.label} — {s.detail}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {session.plan.refusal && (
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4" /> Refusal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-[12px] text-zinc-300">
                    <div><span className="text-zinc-500">Route: </span>{session.plan.refusal.route}</div>
                    <div className="text-zinc-400">{session.plan.refusal.note}</div>
                  </CardContent>
                </Card>
              )}

              {session.plan.warnings.length > 0 && (
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-400">Warnings</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-[11px] text-zinc-300">
                    {session.plan.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Verification loop</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-[11px] text-zinc-400">
                  {session.plan.verification.map((v, i) => <div key={i}>✓ {v}</div>)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cross-check — Research Reality Check</CardTitle></CardHeader>
                <CardContent><RealityCheckPanel profile={profile!} detection={detection} /></CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ---------------- UI state machine ---------------- */}
        <TabsContent value="fsm" className="space-y-4">
          {!fingerprint ? (
            <Card><CardContent className="pt-4 text-[12px] text-zinc-500">Scan the device first.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><Workflow className="h-4 w-4" /> {flow!.label}</CardTitle>
                  <CardDescription>{flow!.note}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {flow!.path.map((s: FsmStateId, i) => (
                      <span key={`${s}-${i}`} className="flex items-center gap-1">
                        <Badge variant="outline" className={s === "google_verify" ? "border-red-500/40 text-red-300" : ""}>{s}</Badge>
                        {i < flow!.path.length - 1 && <span className="text-zinc-600">→</span>}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleSimulate}>
                      <Play className="h-4 w-4" /> Simulate path
                    </Button>
                    <Label className="text-[11px]">seed</Label>
                    <input
                      type="number"
                      value={fsmSeed}
                      onChange={(e) => setFsmSeed(parseInt(e.target.value || "0", 10))}
                      className="w-20 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-[11px]"
                    />
                    {simulated && (
                      <Badge variant="outline" className={simulated.outcome === "locked_out" ? "border-red-500/40" : "border-green-500/40"}>
                        outcome: {simulated.outcome}
                      </Badge>
                    )}
                  </div>
                  {simulated && simulated.trace.length > 0 && (
                    <div className="max-h-64 space-y-1 overflow-auto rounded-md border border-zinc-800 p-2 text-[10px]">
                      {simulated.trace.map((t) => (
                        <div key={t.index} className="flex gap-2 font-mono">
                          <span className="text-zinc-600">{String(t.index).padStart(2, "0")}</span>
                          <span className="text-zinc-300">{t.state} → {t.next}</span>
                          <span className="text-zinc-500">{t.event}</span>
                          <Timer className="h-3 w-3 self-center text-zinc-600" />
                          <span className="text-zinc-500">{t.delayMs}ms</span>
                          <span className="truncate text-zinc-600">{t.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Live classifier — paste a uiautomator dump</CardTitle>
                  <CardDescription>
                    Rules-based, no AI: keyword table + brand boosters. Unknown dialogs hit the
                    probe budget (3) and then escalate to manual guidance + journaling.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <textarea
                    value={dumpText}
                    onChange={(e) => setDumpText(e.target.value)}
                    placeholder='e.g. … package="com.google.android.gsf.login" … text="This device was reset. To continue, sign in with a Google Account…"'
                    className="min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[11px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleClassify}>Classify</Button>
                    {dumpResult && <span className="font-mono text-[11px] text-green-300">{dumpResult}</span>}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ---------------- Partition survey ---------------- */}
        <TabsContent value="partition" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><Cpu className="h-4 w-4" /> Read-only partition survey</CardTitle>
              <CardDescription>
                getprop + <code>ls /dev/block/by-name</code> only. The survey command has no write
                path — the engine analyzes boot state and plans rollback; it never writes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button size="sm" onClick={handleSurvey} disabled={!profile || surveying}>
                {surveying ? "Surveying…" : "Run survey (read-only)"}
              </Button>
              {avb && (
                <div className="rounded-md border border-zinc-500/20 bg-zinc-500/5 p-3 text-[11px]">
                  <div className="grid grid-cols-2 gap-y-1 md:grid-cols-4">
                    <div><span className="text-zinc-500">verifiedbootstate</span><div className="text-zinc-200">{avb.verifiedBootState ?? "?"}</div></div>
                    <div><span className="text-zinc-500">vbmeta device_state</span><div className="text-zinc-200">{avb.vbmetaDeviceState ?? "?"}</div></div>
                    <div><span className="text-zinc-500">build tags</span><div className="text-zinc-200">{avb.buildTags ?? "?"}</div></div>
                    <div><span className="text-zinc-500">bootloader locked</span><div className="text-zinc-200">{avb.bootloaderLocked === null ? "?" : String(avb.bootloaderLocked)}</div></div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className={avb.verdict === "avb_enforcing" ? "border-green-500/40 text-green-300" : avb.verdict === "avb_relaxed" ? "border-yellow-500/40 text-yellow-300" : ""}>
                      {avb.verdict}
                    </Badge>
                  </div>
                </div>
              )}
              {survey && survey.block_devices.length > 0 && (
                <div className="max-h-40 overflow-auto rounded-md border border-zinc-800 p-2 font-mono text-[10px] text-zinc-400">
                  {survey.block_devices.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-300">AVB honesty (why we don't offer "undetectable patching")</CardTitle></CardHeader>
            <CardContent className="text-[11px] text-zinc-300">{AVB_HONESTY}</CardContent>
          </Card>
          {session && rollback && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Rollback plan (fail-safe)</CardTitle>
                <CardDescription>Required before any persistent step in the chain.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <Switch id="backups-ready" checked={backupsReady} onCheckedChange={setBackupsReady} />
                  <Label htmlFor="backups-ready">Backups captured (partition images + vbmeta digests + stock firmware archive)</Label>
                </div>
                {rollback.requiredBackups.map((b, i) => <div key={i} className="text-zinc-300">{b}</div>)}
                {rollback.refusalNote ? (
                  <div className="text-red-400">⛔ {rollback.refusalNote}</div>
                ) : (
                  rollback.restoreSteps.map((s, i) => <div key={i} className="text-zinc-400">{s}</div>)
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------- Patch planner (Algorithm #3) ---------------- */}
        <TabsContent value="patch" className="space-y-4">
          {!fingerprint || !session || !dumpManifest || !patchPlan || !recovery ? (
            <Card><CardContent className="pt-4 text-[12px] text-zinc-500">Scan the device to open the patch planner.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><HardDrive className="h-4 w-4" /> Patch plan — {patchPlan.lane}</CardTitle>
                  <CardDescription>
                    Minimal-touch policy: {patchPlan.touches.length === 0 ? "no partitions" : patchPlan.touches.join(", ")} ·{" "}
                    vbmeta writes: {patchPlan.refusesVbmetaWrites ? "refused by design" : "???"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-[11px]">
                  {patchPlan.preconditions.map((p, i) => <div key={i} className="text-yellow-300">◇ {p}</div>)}
                  {patchPlan.steps.map((s, i) => <div key={i} className="text-zinc-300">{s}</div>)}
                  {patchPlan.warning && <div className="text-red-400">⛔ {patchPlan.warning}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Flash safety gates (refuse semantics)</CardTitle>
                  <CardDescription>{ANDROID_1516_NOTE}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Switch id="gate-bit" checked={bitVersionChecked} onCheckedChange={setBitVersionChecked} />
                    <Label htmlFor="gate-bit">Bit/version gate checked</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="gate-fw" checked={firmwareArchived} onCheckedChange={setFirmwareArchived} />
                    <Label htmlFor="gate-fw">Stock firmware archive ready</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="gate-hash" checked={hashesVerified} onCheckedChange={setHashesVerified} />
                    <Label htmlFor="gate-hash">Backup hashes re-verified</Label>
                  </div>
                  <div className="text-zinc-500">(Backups switch lives in the Partition survey tab.)</div>
                  {flashGates.map((g) => (
                    <div key={g.id} className={`flex gap-2 ${g.passed ? "text-green-400" : g.critical ? "text-red-400" : "text-yellow-400"}`}>
                      {g.passed ? "✅" : g.critical ? "⛔" : "⚠"} {g.label} — {g.detail}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dump manifest (read-only, AVB-safe)</CardTitle>
                  <CardDescription>{dumpManifest.avbSafeNote}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-[11px]">
                  {dumpManifest.items.map((it) => (
                    <div key={it.partition} className="rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-200">{it.partition}</span>
                        <Badge variant="outline" className="text-[10px]">{it.backupRecommended}</Badge>
                      </div>
                      <div className="text-zinc-500">{it.role}</div>
                      <div className="mt-1 font-mono text-[10px] text-zinc-400">
                        {it.commands.map((c, i) => <div key={i}>{c}</div>)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Automated recovery procedure (write steps, gated)</CardTitle>
                  <CardDescription>
                    Generated from the dump manifest — the only sanctioned write path is restore-from-backup.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 font-mono text-[10px]">
                  {recovery.steps.map((s, i) => (
                    <div key={i} className={s.write ? "text-red-400" : "text-zinc-400"}>{s.write ? "⛔" : "·"} {s.line}</div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ---------------- Analytics (CA2) ---------------- */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" /> Success/failure analytics + calibration</CardTitle>
              <CardDescription>
                {RESEARCH_HONESTY} Downward-only rule: weights drop on measured failures, never rise without bench evidence.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-[11px]">
              <Button size="sm" variant="outline" onClick={handleValidationMatrix}>
                <Play className="h-4 w-4" /> Run offline validation matrix (mock executor)
              </Button>
              {matrixRows && (
                <div className="space-y-1">
                  {matrixRows.map((r) => (
                    <div key={r.methodId} className="flex justify-between rounded-md border border-zinc-500/20 bg-zinc-500/5 p-1.5">
                      <span className="text-zinc-300">{r.note}</span>
                      <Badge variant="outline" className={r.verdict === "removed_verified" ? "border-green-500/40 text-green-300" : r.verdict === "flags_set" ? "border-yellow-500/40 text-yellow-300" : "border-red-500/40 text-red-300"}>
                        {r.verdict}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Totals — attempts {report.totals.attempts} · successes {report.totals.successes} · failures {report.totals.failures}</span>
                </div>
                {report.methods.map((m) => (
                  <div key={m.methodId} className="mt-1 flex justify-between border-t border-zinc-800 pt-1 text-zinc-300">
                    <span className="font-mono">{m.methodId}</span>
                    <span>{m.successes}/{m.attempts} ({m.successRatio}%)</span>
                  </div>
                ))}
                {report.methods.length === 0 && <div className="text-zinc-600">No method outcomes recorded yet — run the matrix or a bench session.</div>}
              </div>
              {report.calibration.map((c) => (
                <div key={c.methodId} className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-zinc-300">
                  <span className="font-mono text-red-300">{c.methodId}:</span> evidence weight {c.currentWeight} → {c.suggestedWeight} ({c.successes}/{c.attempts})
                  <div className="text-zinc-500">{c.reason}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Scripts (A1-3.1 / A2-2.3) ---------------- */}
        <TabsContent value="execution" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><FileCode2 className="h-4 w-4" /> Generated operator scripts</CardTitle>
              <CardDescription>
                Deterministic, humanized scripts from the plan and the FSM trace — for the Shell view or a
                bench. Refusal plans generate a refusal script, never commands.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={!adbScript} onClick={() => copyText(scriptText)}>
                  <ClipboardCopy className="h-4 w-4" /> Copy script
                </Button>
                {copyNote && <span className="text-[11px] text-green-400">{copyNote}</span>}
                {adbScript && <Badge variant="outline">{adbScript.title}</Badge>}
                {uiScript && <Badge variant="outline">{uiScript.title}</Badge>}
              </div>
              {scriptText ? (
                <pre className="max-h-80 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] leading-4 text-zinc-300">
                  {scriptText}
                </pre>
              ) : (
                <div className="text-[12px] text-zinc-500">
                  Scan the device (ADB script) and/or simulate the FSM path (UI automation script) to generate output.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Update packs (CA3) ---------------- */}
        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><PackageCheck className="h-4 w-4" /> Update-pack pipeline</CardTitle>
              <CardDescription>
                The catalog, UI flows and patch lanes are DATA. Paste an update pack (exploits | ui_flows |
                patches) to validate it against the zod schema — certainty-forbidden invariants included —
                then merge → <code>npm run test:adaptive</code> → ship. CLI: <code>npm run update:validate -- path</code>;
                refinement tool: <code>npm run refine:ui-flows -- journal.json</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                value={packText}
                onChange={(e) => setPackText(e.target.value)}
                placeholder='{ "packVersion": 1, "kind": "exploits", "updatedAt": "2026-08-13", "entries": [ … ] }'
                className="min-h-[120px] w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[11px]"
              />
              <Button size="sm" variant="outline" onClick={handleUpdatePackValidate}>Validate pack</Button>
              {packResult && (
                <pre className="max-h-60 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300">
                  {packResult}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Patch research (round 3, isolated) ---------------- */}
        <TabsContent value="research" className="space-y-4">
          {!gapReport || !fingerprint ? (
            <Card><CardContent className="pt-4 text-[12px] text-zinc-500">Scan the device to open the research layer.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" /> Parallel lane evaluation — the gap, seen</CardTitle>
                  <CardDescription>
                    {QUANTUM_NOTE}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    {gapReport.lanes.map((l) => (
                      <div
                        key={l.algorithm}
                        className={`rounded-md border p-2 ${
                          l.status === "viable" ? "border-green-500/30 bg-green-500/5"
                          : l.status === "conditional" ? "border-yellow-500/30 bg-yellow-500/5"
                          : l.status === "refused" ? "border-red-500/30 bg-red-500/5"
                          : "border-zinc-500/30 bg-zinc-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-zinc-200">Algorithm {l.algorithm === "exploit" ? "#1 Exploit" : l.algorithm === "ui" ? "#2 UI" : "#3 Patch"}</span>
                          <Badge variant="outline" className="text-[10px]">{l.status}</Badge>
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-500">
                          primary: {l.primaryMethod ?? "—"} · expected rate {l.expectedRate}/97 · score {l.score}
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-400">{l.notes[0]}</div>
                        <div className="mt-1 text-[10px] text-zinc-600">{l.labNote}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-zinc-400">Union coverage {gapReport.unionCoverage}/97 · decision coverage {gapReport.decisionCoverage}%</span>
                    <Progress value={gapReport.unionCoverage} className="h-1.5 flex-1" />
                  </div>
                  <div className="rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2 text-[11px] text-zinc-300">
                    <span className="text-zinc-500">Recommendation: </span>{gapReport.recommendation}
                  </div>
                  <div className="space-y-0.5 text-[10px] text-zinc-400">
                    {gapReport.gaps.map((g, i) => <div key={i}>◼ {g}</div>)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Google protection map (seek — read-only)</CardTitle>
                  <CardDescription>{HIDE_SEEK_POLICY}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-[11px]">
                  <div className="grid grid-cols-2 gap-y-1 md:grid-cols-3">
                    <div><span className="text-zinc-500">AVB state</span><div className="text-zinc-200">{gapReport.protection.verifiedBootState ?? "?"}</div></div>
                    <div><span className="text-zinc-500">vbmeta</span><div className="text-zinc-200">{gapReport.protection.vbmetaDeviceState ?? "?"}</div></div>
                    <div><span className="text-zinc-500">security patch</span><div className="text-zinc-200">{gapReport.protection.securityPatch ?? "?"}</div></div>
                  </div>
                  <div className="mt-1"><span className="text-zinc-500">USB gate: </span>
                    <Badge variant="outline" className={gapReport.protection.usbRisk === "high" ? "border-red-500/40 text-red-300" : gapReport.protection.usbRisk === "medium" ? "border-yellow-500/40 text-yellow-300" : ""}>{gapReport.protection.usbRisk}</Badge>
                  </div>
                  <div className="text-zinc-400">{gapReport.protection.usbRiskNote}</div>
                  <div className="text-zinc-500">{gapReport.protection.attestationLayer} — {gapReport.protection.summary}</div>
                  <div className="mt-1 rounded-md border border-orange-500/30 bg-orange-500/5 p-2 text-zinc-300">{NO_EVASION_NOTE}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Android 15/16 patch digest (P1–P10)</CardTitle>
                  <CardDescription>
                    What Google closed and what remains, per stack layer — full citations in
                    <span className="font-mono"> docs/ANDROID-15-16-PATCH-RESEARCH.md</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-1">
                    {(["all", "15", "16"] as const).map((f) => (
                      <Badge
                        key={f}
                        variant="outline"
                        className={`cursor-pointer ${patchFilter === f ? "border-green-500/50 text-green-300" : ""}`}
                        onClick={() => setPatchFilter(f)}
                      >
                        {f === "all" ? "all" : `Android ${f}`}
                      </Badge>
                    ))}
                  </div>
                  <div className="max-h-72 space-y-1 overflow-auto">
                    {digestRows.map((p) => (
                      <div key={p.id} className="rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2 text-[10px]">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">{p.android}</Badge>
                          <Badge variant="outline" className="text-[9px]">{p.layer}</Badge>
                          <span className="font-medium text-zinc-200">{p.title}</span>
                        </div>
                        <div className="mt-1 text-red-400/80">✕ {p.whatClosed}</div>
                        <div className="text-green-400/80">✓ {p.whatRemains}</div>
                        <div className="mt-1 text-zinc-600">
                          impact — exploit: {p.impact.exploit} · ui: {p.impact.ui} · patch: {p.impact.patch} · {p.source}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lab expectations (evidence-banded, lab-gated)</CardTitle>
                  <CardDescription>Downward-only law: bench sessions move these numbers down until hardware evidence supports an upward move.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-[10px]">
                  {LAB_LEDGER.map((l, i) => (
                    <div key={i} className="flex justify-between border-b border-zinc-800 py-1">
                      <span className="text-zinc-300">[{l.lane}] {l.condition}</span>
                      <span className={`${l.band === "high" ? "text-green-400" : l.band === "medium" ? "text-yellow-400" : "text-red-400"}`}>
                        {l.expectedRate}/97 · {l.band} · {l.source}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ---------------- Bench desk (software half of hardware validation) ---------------- */}
        <TabsContent value="bench" className="space-y-4">
          <BenchDesk />
        </TabsContent>

        {/* ---------------- Journal ---------------- */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><ScrollText className="h-4 w-4" /> Session journal</CardTitle>
              <CardDescription>
                Success AND failure cases are logged — the catalog is calibrated from both.
                JSON export is the feedback format for bench/QA analysis and the refinement tool.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" onClick={handleExport}>
                <FileJson className="h-4 w-4" /> Export JSON
              </Button>
              <div className="max-h-56 space-y-1 overflow-auto rounded-md border border-zinc-800 p-2 text-[10px] font-mono">
                {journalRef.current!.recent(40).map((e, i) => (
                  <div key={`${e.ts}-${i}`} className="flex gap-2">
                    <span className="text-zinc-600">{e.ts.slice(11, 19)}</span>
                    <span className="text-zinc-500">[{e.kind}]</span>
                    <span className="truncate text-zinc-300">{e.fingerprintKey}</span>
                    <span className="truncate text-zinc-500">{e.text}</span>
                  </div>
                ))}
                {journalRef.current!.recent(1).length === 0 && (
                  <span className="text-zinc-600">No entries yet — scan the device to open a session.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {profile && (
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <CheckCircle2 className="h-3 w-3" />
          Sources: {session ? session.plan.sources.join(" · ") : "—"} — bands, not promises.
        </div>
      )}
    </div>
  )
}
