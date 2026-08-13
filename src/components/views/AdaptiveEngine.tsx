import { useMemo, useRef, useState } from "react"
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
  type Fingerprint,
  type FsmStateId,
} from "@/lib/adaptive-engine"
import { RealityCheckPanel } from "@/components/views/FrpRemoval/RealityCheck"
import { type DeviceInfo } from "@/tauri-commands"
import { createLogger } from "@/lib/logger"
import {
  ShieldCheck, Cpu, GitBranch, Workflow, Play, RefreshCw,
  ScrollText, AlertTriangle, CheckCircle2, Timer, FileJson, ScanSearch,
} from "lucide-react"

const logger = createLogger("AdaptiveEngine")

// =====================================================================
// FRP Adaptive Engine — new first-class feature (docs/FRP-ADAPTIVE-ENGINE-PLAN.md)
// Decision tree + UI FSM + partition safety + journal. Honest bands:
// feasibility is measured, never promised.
// =====================================================================

interface AdaptiveEngineProps {
  selectedDevice: DeviceInfo
}

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

export function AdaptiveEngine({ selectedDevice }: AdaptiveEngineProps) {
  const journalRef = useRef<AdaptiveJournal | null>(null)
  if (!journalRef.current) journalRef.current = new AdaptiveJournal()

  const [consentChecked, setConsentChecked] = useState(false)
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
  }

  const flow = fingerprint ? flowForBrand(fingerprint.brand) : null

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

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan"><GitBranch className="mr-1 h-3.5 w-3.5" /> Exploit chain</TabsTrigger>
          <TabsTrigger value="fsm"><Workflow className="mr-1 h-3.5 w-3.5" /> UI state machine</TabsTrigger>
          <TabsTrigger value="partition"><Cpu className="mr-1 h-3.5 w-3.5" /> Partition safety</TabsTrigger>
          <TabsTrigger value="journal"><ScrollText className="mr-1 h-3.5 w-3.5" /> Journal</TabsTrigger>
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

        {/* ---------------- Partition safety ---------------- */}
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

        {/* ---------------- Journal ---------------- */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><ScrollText className="h-4 w-4" /> Session journal</CardTitle>
              <CardDescription>
                Success AND failure cases are logged — the catalog is calibrated from both.
                JSON export is the feedback format for bench/QA analysis.
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
