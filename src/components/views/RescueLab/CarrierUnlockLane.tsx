import { LaneHeader, MethodCard } from "./shared"
import { CARRIER_DETECT, CARRIER_PHYSICS_NOTE } from "@/lib/rescue-data"
import { RadioTower, ShieldAlert } from "lucide-react"

export function CarrierUnlockLane() {
  return (
    <div className="space-y-3">
      <LaneHeader
        icon={<RadioTower className="h-4 w-4 text-blue-400" />}
        title="Carrier / network unlock"
        blurb="Detect → official route → conditional routes. In that order, honestly."
      />
      <div className="flex items-start gap-2 text-[11px] p-2 rounded bg-blue-500/5 border border-blue-500/25">
        <ShieldAlert className="h-4 w-4 text-blue-300 mt-0.5 shrink-0" />
        <p className="text-muted-foreground">{CARRIER_PHYSICS_NOTE}</p>
      </div>
      <div className="space-y-1.5">
        {CARRIER_DETECT.map(m => <MethodCard key={m.title} m={m} />)}
      </div>
    </div>
  )
}
