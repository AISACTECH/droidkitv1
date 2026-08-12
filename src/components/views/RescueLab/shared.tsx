import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Copy, Check } from "lucide-react"
import { bandLabel, type RescueBand, type RescueMethod } from "@/lib/rescue-data"

export function BandBadge({ band }: { band: RescueBand }) {
  const cls =
    band === "doable" ? "border-green-500/40 text-green-300 bg-green-500/10"
    : band === "conditional" ? "border-yellow-500/40 text-yellow-300 bg-yellow-500/10"
    : "border-red-500/40 text-red-300 bg-red-500/10"
  return <Badge variant="outline" className={`text-[9px] px-1 py-0 ${cls}`}>{bandLabel[band]}</Badge>
}

export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
      title="Copy command"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200) } catch { /* clipboard blocked — user selects manually */ }
      }}
    >
      {ok ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export function MethodCard({ m }: { m: RescueMethod }) {
  return (
    <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium">{m.title}</span>
        <BandBadge band={m.band} />
      </div>
      <p className="text-[11px] text-muted-foreground">{m.when}</p>
      <ol className="space-y-1 text-[11px]">
        {m.steps.map((s, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-muted-foreground shrink-0">{i + 1}.</span>
            <span className="flex-1">
              {s.text}
              {s.cmd && (
                <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] bg-black/30 border rounded px-1.5 py-0.5 w-fit">
                  {s.cmd} <CopyButton text={s.cmd} />
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
      {m.warn && (
        <p className="text-[10px] p-1.5 rounded bg-red-500/10 border border-red-500/25 text-red-200">{m.warn}</p>
      )}
    </div>
  )
}

export function LaneHeader({ icon, title, blurb }: { icon: React.ReactNode; title: string; blurb: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs font-semibold">{icon}{title}</div>
      <p className="text-[11px] text-muted-foreground">{blurb}</p>
    </div>
  )
}
