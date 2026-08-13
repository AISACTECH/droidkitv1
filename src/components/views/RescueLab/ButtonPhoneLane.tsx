import { LaneHeader, MethodCard, BandBadge } from "./shared"
import { BUTTONPHONE_METHODS, BUTTONPHONE_NOTE, BUTTONPHONE_BRAND_GUIDE } from "@/lib/rescue-data"
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

      <div className="space-y-1">
        <div className="text-[11px] font-semibold">Brand coverage map ({BUTTONPHONE_BRAND_GUIDE.length} families — know the silicon before you open the toolbox)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {BUTTONPHONE_BRAND_GUIDE.map(b => (
            <div key={b.brand} className="p-1.5 rounded border bg-muted/30 text-[10px] space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-[11px]">{b.brand}</span>
                <BandBadge band={b.band} />
              </div>
              <div className="text-muted-foreground">Inside: {b.chipset}</div>
              <div>Defaults: <span className="font-mono">{b.defaults}</span></div>
              <div className="text-muted-foreground">{b.route}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
