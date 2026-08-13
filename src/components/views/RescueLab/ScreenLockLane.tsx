import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LaneHeader, MethodCard, BandBadge } from "./shared"
import { SCREENLOCK_ERAS } from "@/lib/rescue-data"
import { crackGestureKey, dotPos, type CrackResult } from "@/lib/gesture-crack"
import { KeyRound, Search, Loader2, AlertTriangle } from "lucide-react"

/** Mini 3×3 grid visualising a cracked pattern. */
function PatternGrid({ pattern }: { pattern: number[] }) {
  const orderOf = (dot: number) => pattern.indexOf(dot)
  return (
    <div className="inline-grid grid-cols-3 gap-1.5 p-2 rounded border bg-black/20 w-fit">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(d => {
        const ord = orderOf(d)
        const hit = ord >= 0
        return (
          <div
            key={d}
            className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${hit ? "bg-green-500/25 border-green-500/60 text-green-200" : "border-muted-foreground/30 text-muted-foreground/40"}`}
            title={`dot ${d} (row ${dotPos(d).row + 1}, col ${dotPos(d).col + 1})`}
          >
            {hit ? ord + 1 : d}
          </div>
        )
      })}
    </div>
  )
}

export function ScreenLockLane() {
  const [hash, setHash] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CrackResult | null>(null)

  const crack = () => {
    setBusy(true)
    setResult(null)
    // let the spinner paint before the ~0.2–2s synchronous search
    setTimeout(() => {
      setResult(crackGestureKey(hash))
      setBusy(false)
    }, 30)
  }

  return (
    <div className="space-y-3">
      <LaneHeader
        icon={<KeyRound className="h-4 w-4 text-violet-400" />}
        title="Phone screen-lock rescue"
        blurb="The era decides the truth. Modern Android (9+): nobody keeps the data without the code — anyone claiming otherwise is wiping the phone and not saying it. Legacy pattern locks: genuinely crackable, data preserved — verified math below."
      />

      <div className="space-y-1">
        {SCREENLOCK_ERAS.map(e => (
          <div key={e.era} className="p-2 rounded border bg-muted/30 text-[11px] flex gap-2 items-start">
            <BandBadge band={e.band} />
            <div>
              <span className="font-medium">{e.era}</span>
              <p className="text-muted-foreground mt-0.5">{e.truth}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ⭐ verified legacy gesture cracker */}
      <div className="p-2.5 rounded-lg border border-violet-500/30 bg-violet-500/5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold">⭐ Legacy pattern cracker (Android ≤ 8, gesture.key)</span>
          <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-300">math unit-verified: 389,112/389,112 patterns</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Get the file honestly: rooted ADB (<code className="font-mono">adb pull /data/system/gesture.key</code>), TWRP file manager, or chip-level read on dead units. Then open it in a hex viewer and paste the 20 bytes as 40 hex characters here. Offline = no attempt counters, no risk to the phone.
        </p>
        <div className="flex gap-1.5">
          <input
            className="flex-1 h-7 px-2 rounded border bg-background text-[11px] font-mono"
            placeholder="e.g. 9e0112b37b0a5ffb43ce36b1f6a1727b14e320c1 (40 hex chars)"
            value={hash}
            onChange={e => setHash(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !busy) crack() }}
          />
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={crack}>
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
            Crack
          </Button>
        </div>
        {result && (
          <div className="text-[11px] space-y-1.5">
            {result.found && result.pattern ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-300">CRACKED</Badge>
                  <span className="font-mono">{result.patternText}</span>
                  <span className="text-muted-foreground text-[10px]">({result.searched.toLocaleString()} hashes in {result.ms}ms — offline)</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <PatternGrid pattern={result.pattern} />
                  <p className="text-[10px] text-muted-foreground max-w-xs">Draw the dots in the numbered order — that's the lock. Data untouched; tell the customer modern phones don't get this lucky.</p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-1.5 text-yellow-300">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {result.searched === 0
                  ? "That doesn't look like 40 hex characters — paste exactly the 20 bytes of gesture.key as hex."
                  : `Searched all ${result.searched.toLocaleString()} valid patterns — no match. The hash may be salted (Android 9+) or the bytes were copied wrong. Do NOT guess at the phone — attempts are precious.`}
              </div>
            )}
          </div>
        )}
      </div>

      <MethodCard m={{
        title: "Modern phone journey (Android 9+), end-to-end honest",
        band: "doable",
        when: "The complete path when the data-preserving window is closed.",
        steps: [
          { text: "Say the truth to the customer FIRST: on this Android, saving the data without the code is not possible for anyone; the choice is data or access." },
          { text: "Choice A (access): boot recovery (key combos in the Black Screen lane table) → Wipe data/factory reset. After reboot FRP appears → continue in DroidKit's FRP Removal + FRP Lab views. One app, whole journey." },
          { text: "Choice B (data, Samsung only): if 'Remote unlock' was ever enabled — findmymobile.samsung.com with the owner's Samsung account → Unlock. Data preserved." },
          { text: "Choice C (data, any brand): owner remembers nothing helps — last resort is the panel data staying encrypted; be the shop that said so honestly, not the shop that wiped silently." },
        ],
      }} />
    </div>
  )
}
