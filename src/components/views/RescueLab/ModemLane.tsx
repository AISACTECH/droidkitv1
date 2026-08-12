import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LaneHeader, MethodCard, CopyButton, BandBadge } from "./shared"
import {
  MODEM_AT_COMMANDS, MODEM_FIRMWARE, MODEM_LEGAL_NOTE,
  MIFI_PHYSICS_NOTE, MIFI_IDENTIFY, MIFI_BRAND_ROUTES, MIFI_AFTER_UNLOCK,
} from "@/lib/rescue-data"
import { checkImei, huaweiCandidates, algoSelfTest, HUAWEI_ATTEMPTS_WARNING, type NckResult } from "@/lib/nck-modem"
import { Router, Scale, Terminal, Wifi, AlertTriangle, KeyRound, ShieldCheck } from "lucide-react"

function NckGenerator() {
  const [imei, setImei] = useState("")
  const [result, setResult] = useState<NckResult | null>(null)
  const [error, setError] = useState("")

  const generate = () => {
    const check = checkImei(imei)
    if (!check.ok) { setError(check.reason); setResult(null); return }
    setError("")
    setResult(huaweiCandidates(imei))
  }

  return (
    <div className="p-2.5 rounded-lg border border-green-500/30 bg-green-500/5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <KeyRound className="h-4 w-4 text-green-400" />
        <span className="text-xs font-semibold">Huawei legacy code generator (IMEI → candidates)</span>
        <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-300">{algoSelfTest()}</Badge>
      </div>

      <div className="flex items-start gap-2 text-[10px] p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-200">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        {HUAWEI_ATTEMPTS_WARNING}
      </div>

      <div className="text-[10px] text-muted-foreground">
        Pre-flight, copy into your terminal first:
        <span className="ml-1 inline-flex items-center gap-1 font-mono bg-black/30 border rounded px-1.5 py-0.5">
          AT^CARDLOCK? <CopyButton text={"AT^CARDLOCK?"} />
        </span>
        → reply shows lock state + attempts left. Then identify the era from the brand table above.
      </div>

      <div className="flex gap-1.5">
        <input
          className="flex-1 h-7 px-2 rounded border bg-background text-[11px] font-mono"
          placeholder="15-digit IMEI (sticker under battery / AT+CGSN)"
          value={imei}
          onChange={e => setImei(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") generate() }}
        />
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={generate}>
          <KeyRound className="h-3.5 w-3.5 mr-1" /> Generate
        </Button>
      </div>

      {error && <p className="text-[10px] text-red-300">{error}</p>}

      {result && (
        <div className="space-y-1">
          {result.candidates.map(c => (
            <div key={c.algo} className="p-1.5 rounded border bg-muted/30 text-[11px] space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm tracking-widest">{c.code}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{c.algo}</Badge>
                {c.verified
                  ? <Badge variant="outline" className="text-[9px] px-1 py-0 border-green-500/40 text-green-300"><ShieldCheck className="h-2.5 w-2.5 mr-0.5" />vector-verified</Badge>
                  : <Badge variant="outline" className="text-[9px] px-1 py-0 border-yellow-500/40 text-yellow-300">UNVERIFIED — bench first</Badge>}
                <CopyButton text={c.code} />
              </div>
              <p className="text-muted-foreground">Era: {c.era}</p>
              <p className="text-muted-foreground">{c.note}</p>
            </div>
          ))}
          <p className="text-[10px] text-yellow-200/90 flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            Enter the ONE candidate that matches your modem's generation — never all of them, never one after another. One rejection = stop and research the exact model.
          </p>
        </div>
      )}
    </div>
  )
}

export function ModemLane() {
  return (
    <div className="space-y-3">
      <LaneHeader
        icon={<Router className="h-4 w-4 text-orange-400" />}
        title="Modem & pocket-WiFi rescue — health, carrier unlock, firmware"
        blurb="USB dongles & MiFis talk AT commands over their COM port. Diagnose first, unlock second, reflash third."
      />

      <div className="flex items-start gap-2 text-[11px] p-2 rounded bg-red-500/5 border border-red-500/30">
        <Scale className="h-4 w-4 text-red-300 mt-0.5 shrink-0" />
        <p className="text-muted-foreground">{MODEM_LEGAL_NOTE}</p>
      </div>

      {/* ---- MiFi carrier unlock (the dead-carrier fix) ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <Wifi className="h-4 w-4 text-green-400" /> Free a locked MiFi — even from a dead carrier (Orange, Telkom-era…)
        </div>
        <div className="flex items-start gap-2 text-[11px] p-2 rounded bg-green-500/5 border border-green-500/25">
          <ShieldCheck className="h-4 w-4 text-green-300 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">{MIFI_PHYSICS_NOTE}</p>
        </div>

        <MethodCard m={{
          title: "Step 1 — identify & pre-flight (2 minutes, zero risk)",
          band: "doable",
          when: "Every successful unlock starts here; every bricked/hard-locked modem skipped it.",
          steps: MIFI_IDENTIFY,
        }} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {MIFI_BRAND_ROUTES.map(b => (
            <div key={b.brand} className="p-2 rounded border bg-muted/30 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium">{b.brand}</span>
                <BandBadge band={b.band} />
              </div>
              <p className="text-muted-foreground">{b.route}</p>
            </div>
          ))}
        </div>

        <NckGenerator />

        <MethodCard m={{
          title: "Step 3 — after the unlock (make the internet actually work)",
          band: "doable",
          when: "Unlocked but no internet is almost always the APN, not the unlock.",
          steps: MIFI_AFTER_UNLOCK,
        }} />
      </div>

      {/* ---- original AT diagnosis + firmware ---- */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" /> AT command cheat-sheet (copy into your terminal)
        </div>
        <div className="space-y-1">
          {MODEM_AT_COMMANDS.map(a => (
            <div key={a.cmd} className="flex items-center gap-2 p-1.5 rounded border bg-muted/30 text-[11px]">
              <code className="font-mono text-[10px] bg-black/30 border rounded px-1.5 py-0.5">{a.cmd}</code>
              <CopyButton text={a.cmd} />
              <span className="flex-1 text-muted-foreground">{a.meaning}</span>
              <BandBadge band={a.band} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {MODEM_FIRMWARE.map(m => <MethodCard key={m.title} m={m} />)}
      </div>
    </div>
  )
}
