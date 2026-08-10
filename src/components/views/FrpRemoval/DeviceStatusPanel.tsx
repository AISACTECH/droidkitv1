import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DeviceInfo } from "@/tauri-commands"
import { DeviceProfile, FrpAlgorithmInfo, BypassResult } from "@/lib/frp-commands"
import { Cpu, Smartphone, Square, AlertTriangle, CheckCircle2, Zap, ShieldAlert, Terminal, Clock } from "lucide-react"

interface Props {
  selectedDevice?: DeviceInfo
  deviceProfile: DeviceProfile | null
  algorithms: FrpAlgorithmInfo[]
  isRunning: boolean
  onStop: () => void
  bypassResult: BypassResult | null
  progress?: number
}

export function DeviceStatusPanel({ selectedDevice, deviceProfile, algorithms, isRunning, onStop, bypassResult, progress = 0 }: Props) {
  const hasDevice = !!selectedDevice

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Connection Status - inspired by TFT right pane Waiting for devices but modern */}
      <Card className={`border ${hasDevice ? "border-green-500/30 bg-green-500/5" : "border-border"}`}>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${hasDevice ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
            {hasDevice ? "Device Connected" : "Waiting for devices..."}
          </CardTitle>
          {!hasDevice && <CardDescription className="text-[11px]">USB/Wireless — Enable USB debugging & authorize</CardDescription>}
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {hasDevice && selectedDevice ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                <Smartphone className="h-3 w-3" />
                <span className="font-medium truncate">{selectedDevice.model}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{selectedDevice.serial_no.slice(-6)}</Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Android {selectedDevice.android_version}</span>
                <span>•</span>
                <span>API {selectedDevice.sdk_version}</span>
                <span>•</span>
                <Badge variant="outline" className="text-[10px]">{selectedDevice.transport}</Badge>
              </div>
              {deviceProfile && (
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                    <Cpu className="h-3 w-3 mr-1" />{deviceProfile.chipset_family}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{deviceProfile.chipset_name || "Unknown Chip"}</Badge>
                  <Badge variant={deviceProfile.frp_state === "Active" ? "destructive" : "outline"} className="text-[10px]">
                    {deviceProfile.frp_state === "Active" ? "🔒 FRP LOCKED" : "🔓 FREE"}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <div className="h-3 w-3 border border-dashed rounded-sm" />
                Waiting for COM Port...
              </div>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-[10px]">USB</Badge>
                <Badge variant="outline" className="text-[10px]">COM</Badge>
                <Badge variant="outline" className="text-[10px] opacity-50">FASTConnect</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress + STOP - inspired by TFT bottom progress + STOP button but original */}
      <Card className="border">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Progress</span>
            <span className="font-mono text-[11px]">{progress}%</span>
          </div>
          <Progress value={isRunning ? progress : bypassResult?.success ? 100 : 0} className="h-1.5" />
          <div className="flex gap-2">
            <Button size="sm" variant={isRunning ? "destructive" : "outline"} className="h-7 text-xs flex-1 gap-1" onClick={onStop} disabled={!isRunning}>
              <Square className="h-3 w-3" /> {isRunning ? "STOP" : "Idle"}
            </Button>
            {bypassResult && (
              <Badge variant={bypassResult.success ? "default" : "outline"} className={`text-[10px] ${bypassResult.success ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}`}>
                {bypassResult.success ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                {bypassResult.success ? "Success" : "Needs Check"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categorized Operations List - inspired by TFT right pane color-coded sections but original left-border accent */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs">TFT Unlock Tools 2024-6.2.1.1 (Reference) → DroidKit v1.0.0</CardTitle>
          <CardDescription className="text-[11px]">Categorized operations — same functions, enhanced UX</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-3">
              {/* EDL/BROM */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" /> Samsung — EDL / BROM
                </div>
                <div className="pl-3 space-y-0.5">
                  <div className="text-[11px] text-muted-foreground">[EDL] Samsung Galaxy A20S(All Bit)</div>
                  <div className="text-[11px] font-mono text-blue-400">[EDL] ERASE FRP</div>
                  <div className="text-[11px] font-mono">[BROM] ERASE FRP • UNLOCK BL • RELOCK BL • ERASE MDM</div>
                </div>
              </div>

              <Separator />

              {/* FUNCTION */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold flex items-center gap-2 uppercase tracking-wide">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" /> Function
                </div>
                <div className="pl-3 space-y-0.5">
                  <div className="text-[11px]"><span className="text-orange-400">[ADB]</span> SAMSUNG MDM BYPASS 1</div>
                  <div className="text-[11px]"><span className="text-orange-400">[ADB]</span> SAMSUNG MDM BYPASS 2</div>
                  <div className="text-[11px]"><span className="text-orange-400">[ADB]</span> Disabling Knox</div>
                  <div className="text-[11px]"><span className="text-orange-400">[ADB]</span> Disabling KG</div>
                </div>
              </div>

              <Separator />

              {/* ADB */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold flex items-center gap-2 uppercase tracking-wide">
                  <div className="w-1 h-4 bg-green-500 rounded-full" /> ADB
                </div>
                <div className="pl-3">
                  <div className="text-[11px] text-muted-foreground">Read Screen Pattern (Adb/Root)</div>
                  <div className="text-[10px] text-muted-foreground mt-1">via ScreenControl + Shell</div>
                </div>
              </div>

              <Separator />

              {/* Qualcomm New */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold flex items-center gap-2 uppercase tracking-wide">
                  <div className="w-1 h-4 bg-red-500 rounded-full" /> Qualcomm New — Samsung & OPPO
                </div>
                <div className="pl-3 space-y-0.5 text-[11px] leading-4">
                  <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-red-400" /> Samsung A20e [SM-A202F] • A52 5G [SM-A526U]</div>
                  <div className="pl-4 text-muted-foreground">Note10 5G [SM-N971U] • S21 Ultra [SM-G998U] etc</div>
                  <div className="mt-2 flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-orange-400" /> OPPO A3s, Reno 5G, Realme X50 5G [RMX2144], Q3s [RMX3461]</div>
                </div>
              </div>

              <Separator />

              {/* DroidKit algorithms live */}
              {algorithms.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold flex items-center gap-2 uppercase">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" /> Detected Algorithms — {deviceProfile?.chipset_family}
                  </div>
                  <div className="pl-3 space-y-1">
                    {algorithms.slice(0, 4).map(algo => (
                      <div key={algo.id} className="flex items-center justify-between text-[11px]">
                        <span className="truncate">{algo.label}</span>
                        <Badge variant="outline" className="text-[10px] ml-2">{algo.success_rate}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
                <div className="font-medium text-foreground flex items-center gap-1"><Terminal className="h-3 w-3" /> Advancement Plan</div>
                <div className="mt-1 space-y-0.5">
                  <div>• T.POINT → add Test Point image viewer per model</div>
                  <div>• COM scanner → enumerate serial ports for SPD/Qualcomm</div>
                  <div>• FASTConnect → mDNS + last IP cache one-click</div>
                  <div>• STOP cancellable → AbortController per method</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tool footer info similar to TFT bottom */}
      <div className="text-[10px] text-muted-foreground flex justify-between px-1">
        <span>TFT Ref: v2024-6.2.1.1</span>
        <span>DroidKit v1.0.0</span>
      </div>
    </div>
  )
}
