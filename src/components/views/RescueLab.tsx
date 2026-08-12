import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type DeviceInfo } from "@/tauri-commands"
import { RESCUE_CONSENT } from "@/lib/rescue-data"
import { PcRescueLane } from "./RescueLab/PcRescueLane"
import { CarrierUnlockLane } from "./RescueLab/CarrierUnlockLane"
import { ModemLane } from "./RescueLab/ModemLane"
import { ScreenLockLane } from "./RescueLab/ScreenLockLane"
import { BlackScreenLane } from "./RescueLab/BlackScreenLane"
import { LifeBuoy, ShieldAlert, Scale, Laptop, RadioTower, Router, KeyRound, MonitorOff } from "lucide-react"

// =====================================================================
// Rescue Lab 🛠️ — EXPERIMENTAL multi-device repair bench.
// One home for the honest versions of the most-demanded repair jobs:
// laptop passwords, carrier unlock, modem firmware, phone screen locks,
// black screens. Bands, not promises — the same honesty law as FRP Lab.
// Additive: reuses existing UI kit; sends zero device commands itself;
// cross-links to the existing Screen/Files/FRP-Lab views for actions.
// =====================================================================

interface RescueLabProps {
  selectedDevice: DeviceInfo
}

type LaneId = "pc" | "carrier" | "modem" | "screenlock" | "blackscreen"

const LANES: { id: LaneId; label: string; icon: typeof Laptop }[] = [
  { id: "pc", label: "PC Password 💻", icon: Laptop },
  { id: "carrier", label: "Carrier Unlock 📶", icon: RadioTower },
  { id: "modem", label: "Modem 📡", icon: Router },
  { id: "screenlock", label: "Screen Lock 🔓", icon: KeyRound },
  { id: "blackscreen", label: "Black Screen 🖥️", icon: MonitorOff },
]

export function RescueLab({ selectedDevice }: RescueLabProps) {
  const [lane, setLane] = useState<LaneId>("pc")

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2 flex-wrap">
          <LifeBuoy className="h-5 w-5 text-teal-400" />
          Rescue Lab — multi-device repair bench
          <Badge variant="outline" className="text-[9px] border-teal-500/40 text-teal-300">EXPERIMENTAL</Badge>
          <Badge variant="outline" className="text-[9px]">bench target: {selectedDevice.model}</Badge>
        </h2>
        <p className="text-xs text-muted-foreground">
          Five lanes, one honesty law: DOABLE / CONDITIONAL / NOT-BY-SOFTWARE — never fake 100%.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-3">
          {/* law + consent banners */}
          <Card>
            <CardContent className="p-2.5 space-y-1.5">
              <div className="flex items-start gap-2 text-[11px]">
                <ShieldAlert className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  Anything decided on someone else's server (carrier database, Google, Apple, a lender's MDM) cannot be computed around — by us or anyone. Our lanes take you as far as physics allows and hand you the honest route for the rest.
                </p>
              </div>
              <div className="flex items-start gap-2 text-[11px]">
                <Scale className="h-4 w-4 text-teal-300 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">{RESCUE_CONSENT}</p>
              </div>
            </CardContent>
          </Card>

          {/* lane picker */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs">Pick the job</CardTitle>
              <CardDescription className="text-[11px]">Each lane starts with detection — never start paid work before the truth test.</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex gap-1 flex-wrap">
                {LANES.map(l => (
                  <Button
                    key={l.id}
                    size="sm"
                    variant={lane === l.id ? "default" : "outline"}
                    className="h-7 text-[11px]"
                    onClick={() => setLane(l.id)}
                  >
                    <l.icon className="h-3.5 w-3.5 mr-1" /> {l.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* active lane */}
          <Card>
            <CardContent className="p-3">
              {lane === "pc" && <PcRescueLane />}
              {lane === "carrier" && <CarrierUnlockLane />}
              {lane === "modem" && <ModemLane />}
              {lane === "screenlock" && <ScreenLockLane />}
              {lane === "blackscreen" && <BlackScreenLane />}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
