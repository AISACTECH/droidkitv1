import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LaneHeader, MethodCard, CopyButton, BandBadge } from "./shared"
import {
  MODEM_AT_COMMANDS, MODEM_FIRMWARE, MODEM_LEGAL_NOTE,
  MIFI_PHYSICS_NOTE, MIFI_IDENTIFY, MIFI_BRAND_ROUTES, MIFI_AFTER_UNLOCK,
} from "@/lib/rescue-data"
import { checkImei, huaweiCandidates, algoSelfTest, HUAWEI_ATTEMPTS_WARNING, type NckResult, type NckCandidate } from "@/lib/nck-modem"
import { buildSession, probeNativeSerial, entryCommand, type BackendKind, type StepStatus } from "@/lib/modem-session"
import { Router, Scale, Terminal, Wifi, AlertTriangle, KeyRound, ShieldCheck, Zap, CheckCircle2, XCircle, Circle, CircleSlash } from "lucide-react"

// ---------------- Auto-Session (USB handshake workflow) ----------------

function statusIcon(s: StepStatus) {
  switch (s) {
    case "done": return <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
    case "active": return <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
    case "blocked": return <CircleSlash className="h-3.5 w-3.5 text-red-400 shrink-0" />
    default: return <Circle className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
  }
}

function AutoSession() {
  const [backend, setBackend] = useState<BackendKind>("checking")
  const [attempts, setAttempts] = useState<string>("")
  const [imei, setImei] = useState("")
  const [cands, setCands] = useState<NckResult | null>(null)
  const [picked, setPicked] = useState<NckCandidate | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [imeiMsg, setImeiMsg] = useState("")

  useEffect(() => {
    let alive = true
    probeNativeSerial((cmd: string) => invoke(cmd)).then(ok => { if (alive) setBackend(ok ? "native" : "manual") })
    return () => { alive = false }
  }, [])

  const attemptsNum = attempts.trim() === "" ? null : Number(attempts)
  const attemptsValid = attemptsNum !== null && Number.isFinite(attemptsNum) && attemptsNum >= 0
  const imeiCheck = imei.trim() === "" ? null : checkImei(imei)

  const onImei = (v: string) => {
    setImei(v); setPicked(null); setConfirmed(false); setCands(null); setImeiMsg("")
  }
  const genCandidates = () => {
    const c = checkImei(imei)
    if (!c.ok) { setImeiMsg(c.reason); return }
    setCands(huaweiCandidates(imei))
  }

  const steps = buildSession({
    native: backend === "native",
    attemptsLeft: attemptsValid ? attemptsNum : null,
    imeiOk: imeiCheck?.ok === true,
    eraPicked: picked !== null,
    confirmed,
  })
  const entryReady = picked !== null && confirmed && imeiCheck?.ok === true && attemptsValid && (attemptsNum ?? 0) > 2

  return (
    <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Zap className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold">USB handshake auto-session</span>
        {backend === "checking" && <Badge variant="outline" className="text-[9px]">checking backend…</Badge>}
        {backend === "native" && <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-300">native serial: LIVE — app talks to the port</Badge>}
        {backend === "manual" && <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-300">guided mode this build (native serial RFC ready — same steps, autofire later)</Badge>}
      </div>

      <div className="space-y-1">
        {steps.map(s => (
          <div key={s.id} className={`flex items-start gap-2 p-1.5 rounded border text-[11px] ${s.status === "blocked" ? "border-red-500/40 bg-red-500/5" : s.status === "done" ? "border-green-500/40 bg-green-500/5" : "bg-muted/30"}`}>
            {statusIcon(s.status)}
            <div className="flex-1">
              <span className="font-medium">{s.title}</span>
              <p className="text-muted-foreground">{s.detail}</p>
              {s.cmd && (
                <span className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[10px] bg-black/30 border rounded px-1.5 py-0.5">
                  {s.cmd} <CopyButton text={s.cmd} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* gate inputs */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <label className="space-y-0.5">
          <span className="text-muted-foreground">Attempts left (from AT^CARDLOCK?)</span>
          <input className="w-full h-7 px-2 rounded border bg-background font-mono" placeholder="e.g. 10" value={attempts}
            onChange={e => { setAttempts(e.target.value); setConfirmed(false) }} />
        </label>
        <label className="space-y-0.5">
          <span className="text-muted-foreground">IMEI (15 digits — checksum enforced)</span>
          <input className="w-full h-7 px-2 rounded border bg-background font-mono" placeholder="86*************" value={imei}
            onChange={e => onImei(e.target.value)} />
        </label>
      </div>
      {imeiCheck && !imeiCheck.ok && <p className="text-[10px] text-red-300">{imeiCheck.reason}</p>}
      {imeiMsg && <p className="text-[10px] text-red-300">{imeiMsg}</p>}
      {imeiCheck?.ok && !cands && (
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={genCandidates}>
          <KeyRound className="h-3.5 w-3.5 mr-1" /> IMEI valid — compute era candidates
        </Button>
      )}

      {cands && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Pick the ONE era matching your model (brand table above). The others stay sealed.</p>
          {cands.candidates.filter(c => !c.algo.startsWith("FLASH")).map(c => (
            <button key={c.algo}
              onClick={() => { setPicked(c); setConfirmed(false) }}
              className={`w-full text-left p-1.5 rounded border text-[11px] flex items-center gap-2 ${picked?.algo === c.algo ? "border-cyan-500 bg-cyan-500/10" : "border-border/50 hover:bg-muted/40"}`}>
              <span className="font-mono font-bold tracking-widest">{c.code}</span>
              <span className="text-muted-foreground">{c.algo}</span>
              {c.verified
                ? <Badge variant="outline" className="text-[9px] px-1 py-0 border-green-500/40 text-green-300 ml-auto">vector-verified</Badge>
                : <Badge variant="outline" className="text-[9px] px-1 py-0 border-yellow-500/40 text-yellow-300 ml-auto">UNVERIFIED — bench first</Badge>}
            </button>
          ))}
        </div>
      )}

      {picked && (
        <label className="flex items-start gap-2 text-[11px] p-1.5 rounded border border-yellow-500/30 bg-yellow-500/5">
          <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          <span className="text-yellow-100/90">I matched <b>{picked.algo}</b> to the exact model, attempts remain, and a rejection means STOP (no second guesses against a counter).</span>
        </label>
      )}

      {entryReady && picked && (
        <div className="p-2 rounded border border-green-500/40 bg-green-500/10 space-y-1">
          <div className="text-[10px] text-green-200 font-medium">Entry command — fire ONCE, by hand, only now:</div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] bg-black/30 border rounded px-1.5 py-0.5">
            {entryCommand(picked.code)} <CopyButton text={entryCommand(picked.code)} />
          </span>
          <p className="text-[10px] text-muted-foreground">Then re-read AT^CARDLOCK? to verify unlock, set the APN, and log the result in the Patch Oracle bench log.</p>
        </div>
      )}
    </div>
  )
}

// ---------------- Raw generator (advanced) ----------------

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
        <span className="text-xs font-semibold">Huawei legacy code generator (raw, advanced)</span>
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

        <AutoSession />

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

      <p className="text-[10px] text-muted-foreground flex items-start gap-1">
        <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
        Backend note: this build speaks over ADB, not raw serial — the Auto-Session runs in guided mode until the RFC serial module (docs/RFC-MODEM-SERIAL-BACKEND.md) lands in a bench session; the UI needs zero edits then.
      </p>
    </div>
  )
}
