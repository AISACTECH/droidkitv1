import { useState, useRef, useEffect, useCallback } from "react"
import { DeviceInfo, captureScreenFrame, sendTapViaCursor, sendSwipeViaCursor, sendTextViaAdb, sendKeyeventViaCursor, startMirrorSession, fastbootCheckAvailability, fastbootRebootToBootloader } from "@/tauri-commands"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { MonitorSmartphone, MousePointer2, Type, RefreshCw, Smartphone, Zap, Maximize2, Play, Square, Wifi, Usb, Cpu, Activity, RotateCcw, Home, ArrowLeft, Menu } from "lucide-react"
import { createLogger } from "@/lib/logger"
import { usePageVisible } from "@/hooks/usePageVisible"

const logger = createLogger("ScreenMirror")

interface ScreenControlProps {
  selectedDevice: DeviceInfo
}

export function ScreenControl({ selectedDevice }: ScreenControlProps) {
  const [mirrorActive, setMirrorActive] = useState(false)
  const [frame, setFrame] = useState<string | null>(null)
  const [frameInfo, setFrameInfo] = useState<{ w: number; h: number; ts: number } | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(800)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cursorControl, setCursorControl] = useState(true)
  const [showTouches, setShowTouches] = useState(true)
  const [log, setLog] = useState<string[]>([])
  const [inputText, setInputText] = useState("")
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [fastbootInfo, setFastbootInfo] = useState<any>(null)
  const pageVisible = usePageVisible()
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // audit fix (2026-08-12): the poll interval was cleaned up on unmount, but
  // the action-follow-up setTimeout(captureFrame, …) timers were not — they
  // could fire IPC at a disconnected device after the view closed.
  const mountedRef = useRef(true)
  const mirrorActiveRef = useRef(false)
  const captureInFlightRef = useRef(false)
  const frameCounterRef = useRef(0)
  const pendingTimers = useRef<number[]>([])
  useEffect(() => {
    mountedRef.current = true
    const pending = pendingTimers.current
    return () => {
      mountedRef.current = false
      pending.forEach(t => window.clearTimeout(t))
    }
  }, [])
  useEffect(() => {
    mirrorActiveRef.current = mirrorActive
  }, [mirrorActive])

  const pushLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100))

  // Screen mirroring loop
  const captureFrame = useCallback(async () => {
    if (!mirrorActiveRef.current || !mountedRef.current || captureInFlightRef.current) return
    captureInFlightRef.current = true
    setIsCapturing(true)
    try {
      const result = await captureScreenFrame(selectedDevice.serial_no)
      if (!mountedRef.current) return
      setFrame(`data:image/png;base64,${result.base64_png}`)
      setFrameInfo({ w: result.width, h: result.height, ts: result.timestamp })
      frameCounterRef.current += 1
      // Keep the journal useful without writing a localStorage log entry for
      // every PNG frame. Failures are still logged immediately.
      if (frameCounterRef.current === 1 || frameCounterRef.current % 10 === 0) {
        pushLog(`Frame ${frameCounterRef.current} captured ${result.width}x${result.height}`)
      }
    } catch (e: any) {
      if (mountedRef.current) pushLog(`Capture failed: ${e}`)
      logger.error("Capture failed", e)
    } finally {
      captureInFlightRef.current = false
      if (mountedRef.current) setIsCapturing(false)
    }
  }, [selectedDevice.serial_no, mirrorActive])

  useEffect(() => {
    if (!mirrorActive || !pageVisible) return
    const id = setInterval(captureFrame, refreshInterval)
    captureFrame() // immediate first frame
    return () => clearInterval(id)
  }, [mirrorActive, refreshInterval, captureFrame, pageVisible])

  // All follow-up captures go through ONE tracked scheduler so unmount
  // clears every pending timer (and none can outlive the view).
  const scheduleCapture = (ms: number) => {
    const id = window.setTimeout(() => {
      pendingTimers.current = pendingTimers.current.filter(t => t !== id)
      if (mountedRef.current) captureFrame()
    }, ms)
    pendingTimers.current.push(id)
  }

  const handleStartMirror = async () => {
    try {
      const session = await startMirrorSession(selectedDevice.serial_no, refreshInterval)
      pushLog(session.message)
      mirrorActiveRef.current = true
      frameCounterRef.current = 0
      setMirrorActive(true)
    } catch (e: any) {
      mirrorActiveRef.current = false
      pushLog(`Start mirror failed: ${e}`)
      logger.error("Mirror session start failed", e)
    }
  }

  const handleStopMirror = () => {
    mirrorActiveRef.current = false
    setMirrorActive(false)
    pendingTimers.current.forEach(timer => window.clearTimeout(timer))
    pendingTimers.current = []
    frameCounterRef.current = 0
    pushLog("Reflection window stopped")
  }

  const getDeviceCoords = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || !frameInfo) return null
    const rect = imgRef.current.getBoundingClientRect()
    const xRel = (e.clientX - rect.left) / rect.width
    const yRel = (e.clientY - rect.top) / rect.height
    const deviceX = Math.round(xRel * frameInfo.w)
    const deviceY = Math.round(yRel * frameInfo.h)
    return { deviceX, deviceY, xRel, yRel }
  }

  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!cursorControl) return
    const coords = getDeviceCoords(e)
    if (!coords) return
    try {
      const res = await sendTapViaCursor(selectedDevice.serial_no, coords.deviceX, coords.deviceY)
      pushLog(res)
      if (showTouches) {
        // visual feedback could be added
      }
      // auto refresh after action
      scheduleCapture(300)
    } catch (err: any) {
      pushLog(`Tap failed: ${err}`)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!cursorControl) return
    const coords = getDeviceCoords(e)
    if (coords) setDragStart({ x: coords.deviceX, y: coords.deviceY })
  }

  const handleMouseUp = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!cursorControl || !dragStart) return
    const coords = getDeviceCoords(e)
    if (!coords) { setDragStart(null); return }
    const dx = coords.deviceX - dragStart.x
    const dy = coords.deviceY - dragStart.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance < 10) {
      setDragStart(null)
      return // handled by click
    }
    try {
      const res = await sendSwipeViaCursor(selectedDevice.serial_no, dragStart.x, dragStart.y, coords.deviceX, coords.deviceY, 300)
      pushLog(res)
      scheduleCapture(400)
    } catch (err: any) {
      pushLog(`Swipe failed: ${err}`)
    }
    setDragStart(null)
  }

  const handleTextSend = async () => {
    if (!inputText) return
    try {
      const res = await sendTextViaAdb(selectedDevice.serial_no, inputText)
      pushLog(res)
      setInputText("")
      scheduleCapture(300)
    } catch (e: any) {
      pushLog(`Text send failed: ${e}`)
    }
  }

  const handleKeyevent = async (keycode: number, label: string) => {
    try {
      const res = await sendKeyeventViaCursor(selectedDevice.serial_no, keycode)
      pushLog(`${label} (${keycode}): ${res}`)
      scheduleCapture(300)
    } catch (e: any) {
      pushLog(`${label} failed: ${e}`)
    }
  }

  const checkFastboot = async () => {
    try {
      const info = await fastbootCheckAvailability()
      setFastbootInfo(info)
      pushLog(`Fastboot installed: ${info.fastboot_installed}, devices: ${info.devices_found}`)
    } catch (e: any) {
      pushLog(`Fastboot check failed: ${e}`)
    }
  }

  const rebootToBootloader = async () => {
    try {
      const res = await fastbootRebootToBootloader(selectedDevice.serial_no)
      pushLog(`Reboot to bootloader: ${res.output}`)
    } catch (e: any) {
      pushLog(`Reboot to bootloader failed: ${e}. For damaged charger port, use WiFi ADB then reboot.`)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" /> Screen Mirror — Reflection Window
          </h2>
          <p className="text-sm text-muted-foreground">Best preview when doing repair — phone screen reflected, control via cursor. Works when touch sensor broken.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden md:flex">{selectedDevice.model} • {frameInfo ? `${frameInfo.w}x${frameInfo.h}` : selectedDevice.serial_no.slice(0, 8)}</Badge>
          <Badge variant={mirrorActive ? "default" : "outline"} className={mirrorActive ? "bg-green-500/20 text-green-400" : ""}>{mirrorActive ? "Live" : "Idle"}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Reflection Window */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-3">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-2 px-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className={`h-4 w-4 ${mirrorActive ? "text-green-500 animate-pulse" : ""}`} />
                  Reflection Window — {frameInfo ? `${frameInfo.w}x${frameInfo.h}` : "1080x1920"} {mirrorActive ? "• Live" : ""}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={mirrorActive ? "destructive" : "default"} className="h-7 text-xs gap-1" onClick={mirrorActive ? handleStopMirror : handleStartMirror}>
                    {mirrorActive ? <><Square className="h-3 w-3" /> Stop Mirror</> : <><Play className="h-3 w-3" /> Start Mirror</>}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={captureFrame} disabled={isCapturing || !mirrorActive}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${isCapturing ? "animate-spin" : ""}`} /> Capture
                  </Button>
                </div>
              </div>
              <CardDescription className="text-[11px]">Cursor control allows repairing phones with broken touch sensor — click = tap, drag = swipe, via ADB input not physical touch</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-2 bg-black/90 flex items-center justify-center overflow-hidden min-h-[400px]" ref={containerRef}>
              {frame ? (
                <img
                  ref={imgRef}
                  src={frame}
                  alt="Phone screen reflection"
                  className="max-w-full max-h-[600px] object-contain cursor-crosshair select-none"
                  draggable={false}
                  onClick={handleImageClick}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  style={{ cursor: cursorControl ? 'crosshair' : 'default' }}
                />
              ) : (
                <div className="text-center text-white/40 space-y-3">
                  <MonitorSmartphone className="h-12 w-12 mx-auto opacity-30" />
                  <div className="text-sm">Reflection window idle</div>
                  <div className="text-xs">Click Start Mirror to reflect phone screen — works even with broken touch sensor</div>
                  <Button size="sm" className="mt-2 gap-2" onClick={handleStartMirror}><Play className="h-4 w-4" /> Start Reflection</Button>
                </div>
              )}
            </CardContent>
            <div className="p-2 border-t bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px]">Interval</Label>
                  <div className="w-[100px]"><Slider value={[refreshInterval]} min={300} max={2000} step={100} onValueChange={v => setRefreshInterval(v[0])} /></div>
                  <span className="font-mono">{refreshInterval}ms</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1">
                  <Switch checked={cursorControl} onCheckedChange={setCursorControl} id="cursor" />
                  <Label htmlFor="cursor" className="text-[11px] flex items-center gap-1"><MousePointer2 className="h-3 w-3" /> Cursor Control</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showTouches} onCheckedChange={setShowTouches} id="touches" />
                <Label htmlFor="touches" className="text-[11px]">Show Touches</Label>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Maximize2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </Card>

          {/* Cursor control help */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-2.5 text-[11px] flex gap-2">
              <MousePointer2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Repair phones with broken touch sensor:</strong> Reflection window shows live screen. Click to tap, drag to swipe — sent via <code>adb shell input tap/swipe</code>, not physical touch. Works even when digitizer broken, as long as ADB handshake OK (USB or WiFi). Also supports keyboard broken → use text input on right.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 overflow-hidden">
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Quick Controls — Works with Broken Sensor</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={() => handleKeyevent(4, "Back")}><ArrowLeft className="h-3 w-3" /> Back (4)</Button>
                <Button size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={() => handleKeyevent(3, "Home")}><Home className="h-3 w-3" /> Home (3)</Button>
                <Button size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={() => handleKeyevent(187, "Recents")}><Menu className="h-3 w-3" /> Recents (187)</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleKeyevent(26, "Power")}>Power (26)</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleKeyevent(24, "Vol+")}>Vol+ (24)</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleKeyevent(25, "Vol-")}>Vol- (25)</Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><Type className="h-3 w-3" /> Text Input via ADB (when keyboard broken)</Label>
                <div className="flex gap-2">
                  <Input placeholder="Type text to send to phone..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTextSend()} className="h-8 text-xs" />
                  <Button size="sm" className="h-8 text-xs" onClick={handleTextSend}>Send</Button>
                </div>
              </div>

              <Separator />

              {/* Connectivity — USB / WiFi / Fastboot for damaged port */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Connectivity — USB / WiFi / Fastboot (Damaged Port Support)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={checkFastboot}><Cpu className="h-3 w-3" /> Check Fastboot</Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={rebootToBootloader}><RotateCcw className="h-3 w-3" /> Reboot Bootloader</Button>
                  <Badge variant="outline" className="flex items-center justify-center gap-1 text-[10px]">
                    {selectedDevice.transport === "TCP" ? <><Wifi className="h-3 w-3" /> WiFi ADB</> : <><Usb className="h-3 w-3" /> USB ADB</>}
                  </Badge>
                </div>
                {fastbootInfo && (
                  <div className="text-[10px] p-2 bg-muted/50 rounded border">
                    <div>Fastboot installed: {fastbootInfo.fastboot_installed ? "Yes" : "No"} v{fastbootInfo.fastboot_version}</div>
                    <div>Devices found: {fastbootInfo.devices_found}</div>
                    <div className="mt-1 whitespace-pre-wrap text-[9px] text-muted-foreground">{fastbootInfo.guidance_for_damaged_port?.slice(0, 400)}...</div>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground p-2 bg-blue-500/5 border border-blue-500/20 rounded">
                  <strong>For phones with damaged charger port data system:</strong><br/>
                  • WiFi ADB is BEST: Enable Wireless Debugging in Dev Options (no USB needed if already enabled) → Pair via QR Code → Connect → Control via reflection window even with broken touch<br/>
                  • Fastboot needs USB data pins — if port data fully tampered, fastboot won't work, use WiFi ADB<br/>
                  • Reflection window works via WiFi ADB, so you can repair + control phone even with broken port + broken touch sensor simultaneously
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2"><Zap className="h-4 w-4" /> ADB Log + Reflection Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 bg-black text-green-300 font-mono text-[11px] p-2 overflow-y-auto whitespace-pre-wrap max-h-[260px]">
                {log.length === 0 ? <span className="text-white/40">$ waiting for reflection...</span> : log.map((l, i) => <div key={i}>{l}</div>)}
              </div>
              <div className="p-2 border-t flex gap-2">
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setLog([])}>Clear</Button>
                <span className="text-[10px] text-muted-foreground ml-auto">Reflection: cursor control even when sensor broken • controls phone via ADB input</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
