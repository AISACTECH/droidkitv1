import { LaneHeader, MethodCard, BandBadge } from "./shared"
import { PC_ACCOUNT_TYPES, PC_BOOT_KEYS, PC_WINDOWS_METHODS, PC_SAFETY_FIRST, PC_CHNTPW_METHOD, PC_DOMAIN_METHOD } from "@/lib/rescue-data"
import { Laptop, Keyboard } from "lucide-react"

export function PcRescueLane() {
  return (
    <div className="space-y-3">
      <LaneHeader
        icon={<Laptop className="h-4 w-4 text-cyan-400" />}
        title="PC / Laptop password rescue"
        blurb="First truth: a locked laptop cannot be unlocked from inside itself — we either use an account that still works, the built-in reset paths, or we boot it from a rescue USB. Identify the account type first — it decides everything."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        {PC_ACCOUNT_TYPES.map(t => (
          <div key={t.sign} className="p-2 rounded border bg-muted/30 text-[11px] space-y-1">
            <div className="font-medium">{t.sign}</div>
            <div className="text-muted-foreground">= {t.meaning}</div>
            <div className="text-muted-foreground">{t.route}</div>
          </div>
        ))}
      </div>

      <MethodCard m={PC_SAFETY_FIRST} />
      <div className="space-y-1.5">
        {PC_WINDOWS_METHODS.map(m => <MethodCard key={m.title} m={m} />)}
        <MethodCard m={PC_CHNTPW_METHOD} />
        <MethodCard m={PC_DOMAIN_METHOD} />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-semibold flex items-center gap-1.5">
          <Keyboard className="h-3.5 w-3.5 text-muted-foreground" /> Boot-menu keys (to start from the rescue USB)
          <BandBadge band="doable" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-[10px]">
          {PC_BOOT_KEYS.map(b => (
            <div key={b.brand} className="p-1.5 rounded border bg-muted/30">
              <span className="font-medium">{b.brand}:</span> {b.bootMenu} <span className="text-muted-foreground">(BIOS: {b.bios})</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Tap the key repeatedly right after pressing power. If Windows starts loading you were too late — shut down and try again.</p>
      </div>
    </div>
  )
}
