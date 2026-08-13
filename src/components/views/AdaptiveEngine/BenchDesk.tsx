import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  VIRTUAL_DONORS,
  replayAllDonors,
  fingerprintFromGetprop,
  ingestBenchLog,
  SOFTWARE_ONLY_HONESTY,
  type PromotionProposal,
} from "@/lib/bench"
import { computeBand, buildAdaptivePlan, chainSummary } from "@/lib/adaptive-engine"
import { FlaskConical, Upload, ScanSearch } from "lucide-react"

// =====================================================================
// Bench desk — software half of hardware validation.
// Virtual-donor replay + getprop paste + evidence ingest.
// Never claims a real-device confirmation. Never auto-flips labels.
// =====================================================================

const KIND_STYLE: Record<PromotionProposal["kind"], string> = {
  none: "border-zinc-500/40 text-zinc-300",
  "shop-note": "border-yellow-500/40 text-yellow-300",
  "pr-candidate": "border-green-500/40 text-green-300",
  "refused-low-attempts": "border-red-500/40 text-red-300",
  "stopped-on-reject": "border-orange-500/40 text-orange-300",
  "refused-not-donor": "border-red-500/40 text-red-300",
}

export function BenchDesk() {
  const rows = useMemo(() => replayAllDonors(), [])
  const [dump, setDump] = useState("")
  const [dumpOut, setDumpOut] = useState<string | null>(null)
  const [logText, setLogText] = useState("")
  const [ingestOut, setIngestOut] = useState<string | null>(null)
  const [proposals, setProposals] = useState<PromotionProposal[]>([])

  function handleDump() {
    if (!dump.trim()) return
    const parsed = fingerprintFromGetprop(dump)
    parsed.fingerprint.frpState = parsed.fingerprint.frpState === "Inactive" ? "Inactive" : "Active"
    const band = computeBand(parsed.fingerprint)
    const plan = buildAdaptivePlan(parsed.fingerprint)
    setDumpOut(
      [
        `brand=${parsed.fingerprint.brand} model=${parsed.fingerprint.modelCode || "?"} chipset=${parsed.fingerprint.chipsetFamily} android=${parsed.fingerprint.androidMajor ?? "?"}`,
        `band=${band.band} (${band.label})`,
        chainSummary(plan),
        ...parsed.warnings.map((w) => `note: ${w}`),
        SOFTWARE_ONLY_HONESTY,
      ].join("\n"),
    )
  }

  function handleIngest() {
    if (!logText.trim()) return
    const result = ingestBenchLog(logText)
    setIngestOut(
      result.ok
        ? `Parsed ${result.records.length} record(s). officialFlipAllowed is always false.`
        : `Ingest failed: ${result.errors.join("; ") || "no records"}`,
    )
    setProposals(result.proposals)
  }

  return (
    <div className="space-y-4">
      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConical className="h-4 w-4 text-violet-300" /> Bench desk — software half of hardware validation
            <Badge variant="outline" className="text-[9px]">no device commands</Badge>
          </CardTitle>
          <CardDescription>
            Real Android 15/16 confirmation stays bench-gated by design. This tab replays the
            engine against public-spec virtual donors, classifies a pasted getprop dump, and
            turns an exported bench log into a promotion proposal. It never flips an official label.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-[11px] text-zinc-400">{SOFTWARE_ONLY_HONESTY}</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Virtual donors — engine routing replay</CardTitle>
          <CardDescription>
            Synthetic fingerprints from public device specs. Green = the engine routes this class
            the way the stretch ledger expects. That is not an unlock measurement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-[10px]">
          {rows.map((r) => {
            const donor = VIRTUAL_DONORS.find((d) => d.deviceId === r.deviceId)!
            const ok = r.bandMatch && r.primaryMatch
            return (
              <div key={r.deviceId} className="rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={ok ? "border-green-500/40 text-green-300" : "border-red-500/40 text-red-300"}>
                    {ok ? "route ok" : "route miss"}
                  </Badge>
                  <span className="font-medium text-zinc-200">{donor.label}</span>
                  <Badge variant="outline">{r.band}</Badge>
                  <Badge variant="outline">{r.primary ?? "—"}</Badge>
                  <span className="text-zinc-500">union {r.unionCoverage}/97</span>
                </div>
                <div className="mt-1 text-zinc-500">{donor.blocker}</div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScanSearch className="h-4 w-4" /> Paste a getprop dump
          </CardTitle>
          <CardDescription>
            <code>adb shell getprop</code> from an owned donor. ADB authorization is never inferred.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            value={dump}
            onChange={(e) => setDump(e.target.value)}
            placeholder={'[ro.product.brand]: [samsung]\n[ro.product.model]: [SM-A155F]\n[ro.build.version.release]: [15]\n[ro.hardware]: [mt6789]'}
            className="min-h-[90px] w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[11px]"
          />
          <Button size="sm" variant="outline" onClick={handleDump}>Classify dump</Button>
          {dumpOut && (
            <pre className="max-h-48 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300">
              {dumpOut}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4" /> Ingest a bench log
          </CardTitle>
          <CardDescription>
            Structured pack, Patch Oracle export, or a calibration sentence:
            <span className="font-mono"> MODEL — era=v201 — code … — attempts-before N — RESULT accepted/rejected — YYYY-MM-DD</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            placeholder='{ "kind": "droidkit-bench-evidence", "version": 1, "exportedAt": "…", "records": [ … ] }'
            className="min-h-[90px] w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[11px]"
          />
          <Button size="sm" variant="outline" onClick={handleIngest}>Ingest + propose</Button>
          {ingestOut && <div className="text-[11px] text-zinc-300">{ingestOut}</div>}
          {proposals.map((p) => (
            <div key={p.deviceId} className="rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2 text-[11px]">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={KIND_STYLE[p.kind]}>{p.kind}</Badge>
                <span className="font-mono text-zinc-200">{p.deviceId}</span>
                <span className="text-zinc-500">{p.accepted} accept / {p.rejected} reject / {p.independentUnits} units</span>
              </div>
              <div className="mt-1 text-zinc-400">{p.reason}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
