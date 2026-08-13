import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sparkles, Atom, Telescope, ShieldAlert, CheckCircle2, AlertTriangle,
  XCircle, HelpCircle, Download, Layers, Gauge, Trash2, PlusCircle,
} from "lucide-react"
import type { ChipsetFamily, DeviceProfile } from "@/lib/frp-commands"
import {
  assessSurvival, calibration, HONESTY_BANNER, PATCH_STACK, PATCH_TIMELINE, FORECASTS,
  type OracleInput, type SurvivalStatus, type Forecast,
} from "@/lib/patch-oracle"

// =====================================================================
// Patch Oracle 🔮 + Physics Lane ⚛️ — EXPERIMENTAL (additive panel)
// Pure reasoning UI: zero device commands. Inputs can be typed by hand
// or pre-filled from a scanned DeviceProfile.
// =====================================================================

interface PatchOracleProps {
  profile: DeviceProfile | null
}

const CHIPSETS: ChipsetFamily[] = ["Exynos", "Qualcomm", "MediaTek", "Spreadtrum", "Kirin", "Unknown"]
const ANDROID_VERSIONS = [16, 15, 14, 13, 12, 11, 10, 9, 8, 0] // 0 = unknown

const statusStyle: Record<SurvivalStatus, string> = {
  alive: "border-green-500/40 bg-green-500/10 text-green-300",
  contested: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  blocked: "border-red-500/40 bg-red-500/10 text-red-300",
  unknown: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
}

function StatusIcon({ status }: { status: SurvivalStatus }) {
  switch (status) {
    case "alive": return <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
    case "contested": return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
    case "blocked": return <XCircle className="h-4 w-4 text-red-400 shrink-0" />
    default: return <HelpCircle className="h-4 w-4 text-zinc-400 shrink-0" />
  }
}

const forecastBadge = (f: Forecast) =>
  f.status === "hit" ? "bg-green-500/15 text-green-300 border-green-500/30"
  : f.status === "miss" ? "bg-red-500/15 text-red-300 border-red-500/30"
  : "bg-blue-500/15 text-blue-300 border-blue-500/30"

interface BenchNote {
  ts: string
  text: string
}

export function PatchOracle({ profile }: PatchOracleProps) {
  const [vendor, setVendor] = useState(profile?.brand ?? "")
  const [chipset, setChipset] = useState<ChipsetFamily>(profile?.chipset_family ?? "Unknown")
  const [androidVersion, setAndroidVersion] = useState<number>(
    profile ? Number.parseInt(profile.android_version, 10) || 0 : 0,
  )
  const [securityPatch, setSecurityPatch] = useState(profile?.security_patch ?? "")
  const [manual, setManual] = useState(!profile)
  const [notes, setNotes] = useState<BenchNote[]>([])
  const [noteDraft, setNoteDraft] = useState("")

  const input: OracleInput = useMemo(
    () => ({ vendor, chipset, androidVersion, securityPatch }),
    [vendor, chipset, androidVersion, securityPatch],
  )
  const verdict = useMemo(() => assessSurvival(input), [input])
  const cal = useMemo(() => calibration(), [])

  const prefill = () => {
    if (!profile) return
    setVendor(profile.brand)
    setChipset(profile.chipset_family)
    setAndroidVersion(Number.parseInt(profile.android_version, 10) || 0)
    setSecurityPatch(profile.security_patch ?? "")
    setManual(false)
  }

  const addNote = () => {
    const text = noteDraft.trim()
    if (!text) return
    setNotes(n => [...n.slice(-199), { ts: new Date().toISOString(), text }])
    setNoteDraft("")
  }

  const exportJson = () => {
    const data = {
      kind: "patch-oracle-bench-log",
      exported_at: new Date().toISOString(),
      input,
      verdict: {
        headline: verdict.headline,
        bestRung: verdict.bestRung,
        outlooks: verdict.outlooks,
      },
      calibration: cal,
      forecasts: FORECASTS,
      bench_notes: notes,
      // Same notes, ready for `npm run bench:ingest` (calibration-guide sentences parse).
      ingest_hint: "npm run bench:ingest -- <this-file.json>  ·  officialFlipAllowed is always false",
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `droidkit-patch-oracle-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Patch Oracle 🔮 — physics-layer survival & future-patch forecaster
          <Badge variant="outline" className="text-[9px] border-violet-500/40 text-violet-300">EXPERIMENTAL</Badge>
          <Badge variant="outline" className="text-[9px]">offline · no device commands</Badge>
        </CardTitle>
        <CardDescription className="text-[11px]">
          Evidence-banded survival for every method, the patchable/never-patchable stack, and dated falsifiable forecasts.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* honesty banner — mandatory travel text */}
        <div className="flex items-start gap-2 text-[11px] p-2 rounded bg-violet-500/5 border border-violet-500/25">
          <ShieldAlert className="h-4 w-4 text-violet-300 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">{HONESTY_BANNER}</p>
        </div>

        {/* inputs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold">Subject device class</span>
            {!manual && profile ? (
              <Badge variant="outline" className="text-[10px]">
                from scan: {profile.brand} · {profile.chipset_family} · A{profile.android_version} · {profile.security_patch ?? "patch ?"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">manual input</Badge>
            )}
            {profile && (
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={prefill}>
                Use scanned profile
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setManual(true)}>
              Manual
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <input
              className="h-7 px-2 rounded border bg-background text-[11px]"
              placeholder="Vendor (Samsung, Tecno…)"
              value={vendor}
              onChange={e => { setManual(true); setVendor(e.target.value) }}
            />
            <select
              className="h-7 px-1 rounded border bg-background text-[11px]"
              value={chipset}
              onChange={e => { setManual(true); setChipset(e.target.value as ChipsetFamily) }}
            >
              {CHIPSETS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="h-7 px-1 rounded border bg-background text-[11px]"
              value={androidVersion}
              onChange={e => { setManual(true); setAndroidVersion(Number(e.target.value)) }}
            >
              {ANDROID_VERSIONS.map(v => <option key={v} value={v}>{v === 0 ? "Android ?" : `Android ${v}`}</option>)}
            </select>
            <input
              className="h-7 px-2 rounded border bg-background text-[11px]"
              placeholder="Patch YYYY-MM"
              value={securityPatch}
              onChange={e => { setManual(true); setSecurityPatch(e.target.value) }}
            />
          </div>
          <div className="text-[11px] font-medium">{verdict.headline}</div>
          <div className="text-[10px] text-muted-foreground">Best first rung: {verdict.bestRung}</div>
        </div>

        {/* survival matrix */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-cyan-400" /> Method survival bands
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {verdict.outlooks.map(o => (
              <div key={o.methodId + o.label} className={`p-2 rounded border text-[11px] space-y-1 ${statusStyle[o.status]}`}>
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={o.status} />
                  <span className="font-medium">{o.label}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">{o.methodLayer}</Badge>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{o.confidence}</Badge>
                </div>
                <p className="text-muted-foreground">{o.reason}</p>
                <div className="flex items-center gap-1 flex-wrap text-[9px] text-muted-foreground">
                  evidence: {o.evidenceDates.map(d => <Badge key={d} variant="outline" className="text-[9px] px-1 py-0">{d}</Badge>)}
                </div>
                <p className="text-[10px]"><span className="font-medium">If it fails:</span> {o.fallback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* physics stack */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-orange-400" /> The patch stack — what physics can and cannot change
            <Atom className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div className="space-y-1">
            {PATCH_STACK.map(l => (
              <div key={l.layer} className="flex items-start gap-2 p-1.5 rounded bg-muted/40 border text-[10px]">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1 py-0 shrink-0 mt-0.5 ${l.patchable === "never" ? "border-green-500/40 text-green-300" : l.patchable === "service-centre" ? "border-yellow-500/40 text-yellow-300" : "border-red-500/40 text-red-300"}`}
                >
                  {l.patchable === "never" ? "NEVER PATCHABLE" : l.patchable === "service-centre" ?  "SIGNED-ONLY" : "OTA-PATCHABLE"}
                </Badge>
                <div>
                  <span className="font-medium">{l.label}</span>
                  <p className="text-muted-foreground mt-0.5">{l.physics}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* forecasts + calibration */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold flex items-center gap-1.5">
            <Telescope className="h-3.5 w-3.5 text-blue-400" /> Future-patch forecasts — dated & falsifiable
            <Badge variant="outline" className="text-[9px]">{cal.label}</Badge>
          </div>
          <div className="space-y-1">
            {FORECASTS.map(f => (
              <div key={f.id} className="p-1.5 rounded bg-muted/40 border text-[10px] space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Badge className={`text-[9px] px-1 py-0 border ${forecastBadge(f)}`} variant="outline">
                    {f.status === "open" ? `OPEN · decide by ${f.testBy}` : f.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{f.confidence}</Badge>
                  <span className="font-medium">{f.prediction}</span>
                </div>
                <p className="text-muted-foreground">Falsifier: {f.falsifier}</p>
                {f.resolvedNote && <p className="text-muted-foreground">Resolution: {f.resolvedNote}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* evidence timeline */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold">Evidence timeline ({PATCH_TIMELINE.length} curated events)</div>
          <div className="flex flex-wrap gap-1">
            {PATCH_TIMELINE.map(e => (
              <Badge key={e.id} variant="outline" className="text-[9px]" title={`${e.summary} [${e.confidence}] ${e.source}`}>
                {e.date} · {e.actor} · {e.closesLayer}
              </Badge>
            ))}
          </div>
        </div>

        {/* bench notes + export */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold">Bench log — score the oracle against reality</div>
          <div className="flex gap-1.5">
            <input
              className="flex-1 h-7 px-2 rounded border bg-background text-[11px]"
              placeholder="Observation, e.g. 'Tecno Spark 20 A15 Brom refused — SLA asked for auth → forecast fc-sla-mandatory still open'"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addNote() }}
            />
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={addNote}>
              <PlusCircle className="h-3.5 w-3.5 mr-1" /> Log
            </Button>
            {notes.length > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setNotes([])}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {notes.length > 0 && (
            <ScrollArea className="h-24 rounded border bg-black/20">
              <div className="p-2 font-mono text-[10px] space-y-0.5">
                {notes.map((n, i) => <div key={i} className="text-muted-foreground">[{n.ts}] {n.text}</div>)}
              </div>
            </ScrollArea>
          )}
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={exportJson}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export oracle log (JSON)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
