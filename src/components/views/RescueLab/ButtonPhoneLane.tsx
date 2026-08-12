import { LaneHeader, MethodCard } from "./shared"
import { BUTTONPHONE_METHODS, BUTTONPHONE_NOTE } from "@/lib/rescue-data"
import { Phone, ShieldCheck } from "lucide-react"

export function ButtonPhoneLane() {
  return (
    <div className="space-y-3">
      <LaneHeader
        icon={<Phone className="h-4 w-4 text-amber-400" />}
        title="Button-phone (keypad) password rescue"
        blurb="Itel, Tecno, Nokia keypads & clones. No servers involved anywhere — the lock lives in the phone's own firmware. Start free (codes), escalate to the service route only when needed."
      />
      <div className="flex items-start gap-2 text-[11px] p-2 rounded bg-green-500/5 border border-green-500/25">
        <ShieldCheck className="h-4 w-4 text-green-300 mt-0.5 shrink-0" />
        <p className="text-muted-foreground">{BUTTONPHONE_NOTE}</p>
      </div>
      <div className="space-y-1.5">
        {BUTTONPHONE_METHODS.map(m => <MethodCard key={m.title} m={m} />)}
      </div>
    </div>
  )
}
