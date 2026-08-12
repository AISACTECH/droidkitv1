import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LaneHeader, CopyButton, BandBadge } from "./shared"
import { BLACKSCREEN_TRIAGE, FORCE_RESTART, MYTH_HDMI } from "@/lib/rescue-data"
import { MonitorOff, Power, AlertTriangle } from "lucide-react"

export function BlackScreenLane() {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({})

  return (
    <div className="space-y-3">
      <LaneHeader
        icon={<MonitorOff className="h-4 w-4 text-red-400" />}
        title="Black-screen rescue — triage"
        blurb="Golden rule: DATA FIRST, repair second. A dead panel hides a live brain surprisingly often — answer one question and follow the verdict."
      />

      <div className="flex items-start gap-2 text-[10px] p-2 rounded bg-blue-500/5 border border-blue-500/25">
        <AlertTriangle className="h-4 w-4 text-blue-300 mt-0.5 shrink-0" />
        <p className="text-muted-foreground">{MYTH_HDMI}</p>
      </div>

      {BLACKSCREEN_TRIAGE.map(q => {        const a = answers[q.id]
        const branch = a === undefined || a === null ? null : a ? q.yes : q.no
        return (
          <div key={q.id} className="p-2.5 rounded-lg border bg-muted/30 space-y-2">
            <div className="text-xs font-medium">{q.question}</div>
            <div className="flex gap-1.5">
              <Button size="sm" variant={a === true ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setAnswers(s => ({ ...s, [q.id]: true }))}>YES</Button>
              <Button size="sm" variant={a === false ? "destructive" : "outline"} className="h-7 text-[11px]" onClick={() => setAnswers(s => ({ ...s, [q.id]: false }))}>NO</Button>
            </div>
            {branch && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <BandBadge band={branch.band} />
                  <span className="font-medium">{branch.verdict}</span>
                </div>
                <ol className="space-y-1 text-[11px]">
                  {branch.moves.map((m, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">
                        {m.text}
                        {m.cmd && (
                          <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] bg-black/30 border rounded px-1.5 py-0.5 w-fit">
                            {m.cmd} <CopyButton text={m.cmd} />
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )
      })}

      <div className="space-y-1">
        <div className="text-[11px] font-semibold flex items-center gap-1.5">
          <Power className="h-3.5 w-3.5 text-muted-foreground" /> Force-restart & recovery combos
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[10px]">
          {FORCE_RESTART.map(f => (
            <div key={f.brand} className="p-1.5 rounded border bg-muted/30">
              <span className="font-medium">{f.brand}</span>
              <div>Restart: {f.combo}</div>
              <div className="text-muted-foreground">Recovery: {f.recovery}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          DroidKit cross-links: a phone the PC can see (Devices view) can be mirrored + controlled from the Screen view even with a dead panel, backed up via Files, and reflashed from the FRP Lab Phase Runbook — one app, whole rescue journey.
        </p>
      </div>
    </div>
  )
}
