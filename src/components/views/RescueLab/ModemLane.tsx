import { LaneHeader, MethodCard, CopyButton, BandBadge } from "./shared"
import { MODEM_AT_COMMANDS, MODEM_FIRMWARE, MODEM_LEGAL_NOTE } from "@/lib/rescue-data"
import { Router, Scale, Terminal } from "lucide-react"

export function ModemLane() {
  return (
    <div className="space-y-3">
      <LaneHeader
        icon={<Router className="h-4 w-4 text-orange-400" />}
        title="Modem rescue — health check & firmware"
        blurb="USB dongles & MiFis talk AT commands over their COM port. Diagnose first (any terminal — PuTTY/screen/Serial app on the modem's port), reflash second."
      />

      <div className="flex items-start gap-2 text-[11px] p-2 rounded bg-red-500/5 border border-red-500/30">
        <Scale className="h-4 w-4 text-red-300 mt-0.5 shrink-0" />
        <p className="text-muted-foreground">{MODEM_LEGAL_NOTE}</p>
      </div>

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
