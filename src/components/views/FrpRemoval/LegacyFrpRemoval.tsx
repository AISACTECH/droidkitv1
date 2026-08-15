import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  frpDetect,
  frpBuildDeviceProfile,
  frpGetChipsetAlgorithms,
  frpGetResetModes,
  frpSearchModels,
  frpGetDeviceDatabase,
  frpRunMethod,
  frpGetTecnoDatabase,
  frpSearchTecnoModels,
  frpGetInfinixDatabase,
  frpSearchInfinixModels,
  frpGetItelDatabase,
  frpSearchItelModels,
  frpGetQ3Database,
  frpSearchQ3Models,
  frpGetQ4Database,
  frpSearchQ4Models,
  type FrpDetectionResult,
  type SamsungModel,
  type BypassResult,
  type DeviceProfile,
  type ChipsetFamily,
  type FrpAlgorithmInfo,
  type FrpResetModeInfo,
  type PhaseAction,
  type TecnoModel,
} from "@/lib/frp-commands"
import { type DeviceInfo } from "@/tauri-commands"
import {
  ShieldAlert, Search, Play, Zap, RefreshCw,
  AlertTriangle, CheckCircle2,
  XCircle, Smartphone, Info, Cpu,
  MonitorSmartphone, RotateCcw,
} from "lucide-react"

interface FrpRemovalProps {
  selectedDevice: DeviceInfo
}

export function FrpRemoval({ selectedDevice }: FrpRemovalProps) {
  // State
  const [frpState, setFrpState] = useState<FrpDetectionResult | null>(null)
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(null)
  const [deviceDb, setDeviceDb] = useState<SamsungModel[]>([])
  const [tecnoDb, setTecnoDb] = useState<TecnoModel[]>([])
  const [infinixDb, setInfinixDb] = useState<TecnoModel[]>([])
  const [itelDb, setItelDb] = useState<TecnoModel[]>([])
  const [q3Db, setQ3Db] = useState<TecnoModel[]>([])
  const [q4Db, setQ4Db] = useState<TecnoModel[]>([])
  const [matchedModel, setMatchedModel] = useState<SamsungModel | null>(null)
  const [algorithms, setAlgorithms] = useState<FrpAlgorithmInfo[]>([])
  const [resetModes, setResetModes] = useState<FrpResetModeInfo[]>([])
  const [selectedResetMode, setSelectedResetMode] = useState<string>("factory_reset_frp100")
  const [bypassResult, setBypassResult] = useState<BypassResult | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SamsungModel[]>([])
  const [tecnoSearchResults, setTecnoSearchResults] = useState<TecnoModel[]>([])
  const [infinixSearchResults, setInfinixSearchResults] = useState<TecnoModel[]>([])
  const [itelSearchResults, setItelSearchResults] = useState<TecnoModel[]>([])
  const [q3SearchResults, setQ3SearchResults] = useState<TecnoModel[]>([])
  const [q4SearchResults, setQ4SearchResults] = useState<TecnoModel[]>([])
  const [activeTab, setActiveTab] = useState<"universal" | "methods" | "database">("universal")
  const [dbBrand, setDbBrand] = useState<"samsung" | "tecno" | "infinix" | "itel" | "q3" | "q4">("samsung")
  const [tecnoSeries, setTecnoSeries] = useState<string>("all")
  const [infinixSeries, setInfinixSeries] = useState<string>("all")
  const [itelSeries, setItelSeries] = useState<string>("all")
  const [q3Brand, setQ3Brand] = useState<string>("all")
  const [q4Brand, setQ4Brand] = useState<string>("all")

  // Chipset display helpers
  const chipsetColors: Record<string, string> = {
    Exynos: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Qualcomm: "bg-red-500/20 text-red-400 border-red-500/30",
    MediaTek: "bg-green-500/20 text-green-400 border-green-500/30",
    Spreadtrum: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Kirin: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Unknown: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }

  // Evidence-band color scale (lab-gated band, NOT a success promise).
  const successRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-400"
    if (rate >= 60) return "text-yellow-400"
    return "text-orange-400"
  }

  // Load data on mount
  useEffect(() => {
    loadDatabase()
    loadResetModes()
  }, [])

  // Auto-match model
  useEffect(() => {
    if (selectedDevice?.model) {
      frpSearchModels(selectedDevice.model).then(results => {
        if (results.length > 0) setMatchedModel(results[0])
      }).catch(() => {})
    }
  }, [selectedDevice?.model])

  const loadDatabase = async () => {
    try { setDeviceDb(await frpGetDeviceDatabase()) } catch {}
    try { setTecnoDb(await frpGetTecnoDatabase()) } catch {}
    try { setInfinixDb(await frpGetInfinixDatabase()) } catch {}
    try { setItelDb(await frpGetItelDatabase()) } catch {}
    try { setQ3Db(await frpGetQ3Database()) } catch {}
    try { setQ4Db(await frpGetQ4Database()) } catch {}
  }

  const loadResetModes = async () => {
    try { setResetModes(await frpGetResetModes()) } catch {}
  }

  const handleScan = async () => {
    setIsDetecting(true)
    try {
      // Step 1: Detect FRP state
      const detection = await frpDetect(selectedDevice.serial_no)
      setFrpState(detection)

      // Step 2: Build full device profile (chipset, binary, etc.)
      const profile = await frpBuildDeviceProfile(selectedDevice.serial_no)
      setDeviceProfile(profile)

      // Step 3: Get algorithms for detected chipset
      const algos = await frpGetChipsetAlgorithms(profile.chipset_family)
      setAlgorithms(algos)

      // Step 4: Match model in database
      if (profile.model_code) {
        const models = await frpSearchModels(profile.model_code)
        if (models.length > 0) setMatchedModel(models[0])
      }
    } catch (e) {
      console.error("Scan failed:", e)
    } finally {
      setIsDetecting(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(deviceDb); return }
    try { setSearchResults(await frpSearchModels(searchQuery)) } catch {}
  }

  const handleRunMethod = async (methodId: string) => {
    setIsRunning(true)
    setBypassResult(null)
    try { setBypassResult(await frpRunMethod(selectedDevice.serial_no, methodId)) }
    catch (e) { console.error("Method failed:", e) }
    finally { setIsRunning(false) }
  }

  const getActionLabel = (action: PhaseAction): string => {
    if (typeof action === 'string') {
      switch (action) {
        case 'ADBCommands': return '🖥️ ADB'
        case 'FlashFirmware': return '📦 Flash'
        case 'LoadFirehose': return '🔥 Firehose'
        case 'Verify': return '✅ Verify'
        default: return action
      }
    }
    const key = Object.keys(action)[0]
    switch (key) {
      case 'ManualModeSwitch': return '🔄 Mode'
      case 'ADBCommand': return '⌨ CMD'
      case 'ErasePartition': return '🗑️ Erase'
      case 'ManualInteraction': return '👆 Manual'
      default: return key
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-orange-400" />
          <div>
            <h2 className="text-lg font-semibold">FRP Removal</h2>
            <p className="text-sm text-muted-foreground">Universal Samsung FRP bypass — chipset-optimized algorithms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            <Smartphone className="h-3 w-3 mr-1" />{selectedDevice.model}
          </Badge>
          {deviceProfile && (
            <Badge variant="outline" className={chipsetColors[deviceProfile.chipset_family] || ""}>
              <Cpu className="h-3 w-3 mr-1" />{deviceProfile.chipset_family}
            </Badge>
          )}
          {frpState && (
            <Badge variant="outline" className={
              frpState.frp_state === "Active" ? "bg-red-500/20 text-red-400 border-red-500/30" :
              frpState.frp_state === "Inactive" ? "bg-green-500/20 text-green-400 border-green-500/30" :
              "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
            }>
              {frpState.frp_state === "Active" ? "🔒 FRP LOCKED" :
               frpState.frp_state === "Inactive" ? "🔓 FRP FREE" : "❓ UNKNOWN"}
            </Badge>
          )}
        </div>
      </div>

      {/* Warning */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-3">
            <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-xs text-yellow-300/80">
              <strong>Important:</strong> FRP removal algorithms are chipset-specific. Exynos uses Download Mode, Qualcomm uses EDL 9008, MediaTek uses Brom mode. The tool auto-detects your chipset and ranks methods by evidence band (lab-gated, not a promised %). For legitimate device recovery only — back up before any wipe/flash.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {(["universal", "methods", "database"] as const).map(tab => (
          <Button key={tab} variant={activeTab === tab ? "default" : "ghost"} size="sm"
            onClick={() => setActiveTab(tab)} className="text-xs font-medium">
            {tab === "universal" && "🎯 Universal Bypass (Safe vs High Risk)"}
            {tab === "methods" && "⚡ All Methods & Reset Modes"}
            {tab === "database" && "📱 Device Database (268 Models)"}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1">

        {/* ==================== UNIVERSAL BYPASS TAB ==================== */}
        {activeTab === "universal" && (
          <div className="flex flex-col gap-4">

            {/* SCAN BUTTON - The Key Action */}
            <Card className="border-blue-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-base">Connect & Scan Device</CardTitle>
                  </div>
                  <Button size="sm" onClick={handleScan} disabled={isDetecting}>
                    {isDetecting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                    {isDetecting ? "Scanning..." : "Scan Device"}
                  </Button>
                </div>
                <CardDescription>Auto-detect chipset, FRP state, security patch, and select optimal algorithm</CardDescription>
              </CardHeader>
            </Card>

            {/* DEVICE PROFILE - After Scan */}
            {deviceProfile && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-blue-400" />
                    Device Profile: {deviceProfile.marketing_name || matchedModel?.marketing_name || deviceProfile.model_code} ({deviceProfile.model_code})
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">Brand:</span> <span className="font-medium">{deviceProfile.brand}</span></div>
                    <div><span className="text-muted-foreground">Chipset:</span> <span className={`font-medium ${chipsetColors[deviceProfile.chipset_family]?.split(' ')[1] || ''}`}>{deviceProfile.chipset_family}</span></div>
                    <div><span className="text-muted-foreground">Chip Name:</span> <span className="font-medium">{deviceProfile.chipset_name}</span></div>
                    <div><span className="text-muted-foreground">Android:</span> <span className="font-medium">{deviceProfile.android_version}</span></div>
                    <div><span className="text-muted-foreground">Security Patch:</span> <span className="font-medium">{deviceProfile.security_patch || "N/A"}</span></div>
                    <div><span className="text-muted-foreground">Binary:</span> <span className="font-medium">{deviceProfile.binary_version || "N/A"}</span></div>
                    <div><span className="text-muted-foreground">FRP State:</span> <span className={`font-medium ${deviceProfile.frp_state === "Active" ? "text-red-400" : "text-green-400"}`}>{deviceProfile.frp_state}</span></div>
                    <div><span className="text-muted-foreground">ADB:</span> <span className="font-medium">{deviceProfile.adb_state}</span></div>
                    <div><span className="text-muted-foreground">Knox:</span> <span className="font-medium">{deviceProfile.knox_version || "N/A"}</span></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* RESET MODE SELECTOR */}
            {frpState?.frp_state === "Active" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Select Reset Mode
                  </CardTitle>
                  <CardDescription>Choose what level of FRP removal you need</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {resetModes.map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedResetMode(mode.id)}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          selectedResetMode === mode.id
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-border/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{mode.label}</span>
                          <Badge variant="outline" className={
                            mode.frp_removal_percent === 100
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }>
                            {mode.frp_removal_percent === 100 ? "Full wipe" : "Temporary"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{mode.description}</p>
                        <div className="flex gap-2 mt-1">
                          {mode.wipes_data && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">Data Wiped</Badge>
                          )}
                          {!mode.wipes_data && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400">Data Kept</Badge>
                          )}
                          {mode.erases_frp_partition && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">Flags cleared (not partition)</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CHIPSET-BRANCHED ALGORITHMS */}
            {algorithms.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-400" />
                    Chipset-Optimized Algorithms
                    <Badge variant="outline" className={chipsetColors[deviceProfile?.chipset_family || "Unknown"] || ""}>
                      {deviceProfile?.chipset_family || "Unknown"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Methods ranked by evidence band (lab-gated, not a success promise)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {algorithms.map((algo, idx) => (
                    <div key={algo.id} className={`p-3 rounded-lg border ${idx === 0 ? "border-green-500/30 bg-green-500/5" : "border-border/50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Badge className="bg-green-500 text-white text-xs">RECOMMENDED</Badge>}
                          <span className="text-sm font-medium">{algo.label}</span>
                          <span className={`text-sm font-bold ${successRateColor(algo.success_rate)}`} title="Evidence band (lab-gated)">{algo.success_rate}% band</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {algo.requires_hardware && (
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400">🔧 Hardware</Badge>
                          )}
                          {algo.is_adb_only && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">🖥️ ADB Only</Badge>
                          )}
                          {algo.requires_boot_mode && !algo.requires_hardware && (
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">🔄 Boot Mode</Badge>
                          )}
                          <Button size="sm" variant={idx === 0 ? "default" : "outline"}
                            onClick={() => {
                              // Map algorithm to legacy method for execution
                              const methodMap: Record<string, string> = {
                                samsung_test_mode: "emergency_dialer_bypass",
                                adb_provisioning: "device_provisioning",
                              }
                              handleRunMethod(methodMap[algo.id] || "device_provisioning")
                            }}
                            disabled={isRunning}
                          >
                            <Play className="h-3 w-3 mr-1" />Run
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{algo.description}</p>

                      {/* Algorithm Phases with Progress */}
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">Workflow Phases</div>
                        {algo.phases.map((phase, pi) => (
                          <div key={pi} className="flex items-center gap-2 text-xs">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                              {pi + 1}
                            </div>
                            <span className="font-medium">{phase.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {getActionLabel(phase.action)}
                            </Badge>
                            <span className="text-muted-foreground ml-auto">{phase.weight}%</span>
                          </div>
                        ))}
                        {/* Progress bar visualization */}
                        <div className="flex h-1.5 rounded-full overflow-hidden mt-1">
                          {algo.phases.map((phase, pi) => (
                            <div key={pi} className={`${pi === 0 ? "bg-green-500" : pi === 1 ? "bg-blue-500" : pi === 2 ? "bg-orange-500" : pi === 3 ? "bg-purple-500" : "bg-gray-500"}`}
                              style={{ width: `${phase.weight}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Bypass Result */}
            {bypassResult && (
              <Card className={bypassResult.success ? "border-green-500/30" : "border-orange-500/30"}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {bypassResult.success ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                      <CardTitle className="text-base">{bypassResult.success ? "Bypass Successful!" : "Bypass Result"}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        onClick={() => {
                          const auditData = {
                            timestamp: new Date().toISOString(),
                            device: selectedDevice,
                            profile: deviceProfile,
                            result: bypassResult,
                            status: bypassResult.success ? "SUCCESS" : "REQUIRES_MANUAL"
                          };
                          const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `paralock-frp-audit-${selectedDevice.serial_no || "device"}.json`;
                          a.click();
                        }}
                      >
                        📄 Export Audit JSON
                      </Button>
                      {!bypassResult.success && (
                        <Button size="sm" variant="default" className="text-xs h-7 bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleRunMethod(typeof bypassResult.method === 'string' ? bypassResult.method : bypassResult.method.id)}
                        >
                          🔄 Auto-Retry Bypass
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{bypassResult.message}</p>
                  {bypassResult.steps.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Command Steps</h4>
                      {bypassResult.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {step.success ? <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />}
                          <code className="font-mono text-xs">{step.command}</code>
                          {step.output && <span className="text-muted-foreground ml-2 truncate">{step.output.substring(0, 80)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {bypassResult.requires_manual_action && bypassResult.manual_action_instructions && (
                    <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-orange-400" />
                        <h4 className="text-sm font-semibold text-orange-300">Manual Steps Required</h4>
                      </div>
                      <pre className="text-xs whitespace-pre-wrap text-orange-200/80 font-sans leading-relaxed">
                        {bypassResult.manual_action_instructions}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ==================== METHODS TAB ==================== */}
        {activeTab === "methods" && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">FRP Reset Modes</h3>
            {resetModes.map(mode => (
              <Card key={mode.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{mode.label}</span>
                        <Badge variant="outline" className={mode.frp_removal_percent === 100 ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}>
                          {mode.frp_removal_percent === 100 ? "Full wipe" : "Temporary"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Separator />

            <h3 className="text-sm font-semibold">Chipset Algorithm Paths (Safe vs. High Risk Reference)</h3>
            {(["Exynos", "Qualcomm", "MediaTek", "Spreadtrum"] as ChipsetFamily[]).map(chipset => (
              <Card key={chipset}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      {chipset} Path
                      <Badge variant="outline" className={chipsetColors[chipset]}>{chipset}</Badge>
                    </CardTitle>
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">
                      {chipset === "Exynos" ? "Evidence band 70" :
                       chipset === "Qualcomm" ? "Evidence band 65" :
                       chipset === "MediaTek" ? "Evidence band 80" : "Evidence band 75"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-semibold text-green-400">Safe Path: </span>
                    {chipset === "Exynos" && "Download Mode → Flash Enable-ADB → ADB Remove FRP → Reflash Stock"}
                    {chipset === "Qualcomm" && "EDL 9008 → Firehose Loader → Erase FRP Partition without SLA"}
                    {chipset === "MediaTek" && "Brom/Preloader → Erase FRP Partition → Keep Userdata option"}
                    {chipset === "Spreadtrum" && "SPD Bootloader → Erase FRP Partition via Flash Protocol"}
                  </div>
                  <div>
                    <span className="font-semibold text-yellow-400">High-Risk / Fallback Path: </span>
                    {chipset === "Exynos" && "Flash Samsung Combination Firmware (Requires full stock firmware re-flash)"}
                    {chipset === "Qualcomm" && "EDL Engineering Cable + Modified Firehose Auth Override"}
                    {chipset === "MediaTek" && "MTK Brom DA Erase + Full Userdata & NVRAM Format"}
                    {chipset === "Spreadtrum" && "SPD Full Factory Image Wipe"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ==================== DATABASE TAB ==================== */}
        {activeTab === "database" && (
          <div className="flex flex-col gap-3">
            {/* Brand selector */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit flex-wrap">
              <Button variant={dbBrand === "samsung" ? "default" : "ghost"} size="sm"
                onClick={() => setDbBrand("samsung")} className="text-xs">
                📱 Samsung ({deviceDb.length})
              </Button>
              <Button variant={dbBrand === "tecno" ? "default" : "ghost"} size="sm"
                onClick={() => setDbBrand("tecno")} className="text-xs">
                📱 Tecno ({tecnoDb.length})
              </Button>
              <Button variant={dbBrand === "infinix" ? "default" : "ghost"} size="sm"
                onClick={() => setDbBrand("infinix")} className="text-xs">
                📱 Infinix ({infinixDb.length})
              </Button>
              <Button variant={dbBrand === "itel" ? "default" : "ghost"} size="sm"
                onClick={() => setDbBrand("itel")} className="text-xs">
                📱 Itel ({itelDb.length})
              </Button>
              <Button variant={dbBrand === "q3" ? "default" : "ghost"} size="sm"
                onClick={() => setDbBrand("q3")} className="text-xs">
                📱 Q3 ({q3Db.length})
              </Button>
              <Button variant={dbBrand === "q4" ? "default" : "ghost"} size="sm"
                onClick={() => setDbBrand("q4")} className="text-xs">
                📱 Q4 ({q4Db.length})
              </Button>
            </div>

            {dbBrand === "samsung" && (
              <>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search Samsung models..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()} className="text-xs" />
                  <Button size="sm" onClick={handleSearch}><Search className="h-3 w-3 mr-1" />Search</Button>
                </div>
                <span className="text-xs text-muted-foreground">{(searchResults.length > 0 ? searchResults : deviceDb).length} Samsung models</span>
                <div className="flex flex-col gap-2">
                  {(searchResults.length > 0 ? searchResults : deviceDb).slice(0, 30).map(model => (
                    <Card key={model.model_code}>
                      <CardContent className="p-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">{model.marketing_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{model.model_code}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400">{model.supported_methods.length} methods</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {dbBrand === "tecno" && (
              <>
                {/* Series filter */}
                <div className="flex gap-1 flex-wrap">
                  {["all", "Pop", "Spark", "Camon", "Pova", "Phantom"].map(s => (
                    <Button key={s} variant={tecnoSeries === s ? "default" : "ghost"} size="sm"
                      onClick={() => setTecnoSeries(s)} className="text-xs">
                      {s === "all" ? "All" : s}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search Tecno models..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        frpSearchTecnoModels(searchQuery).then(setTecnoSearchResults).catch(() => {})
                      }
                    }} className="text-xs" />
                  <Button size="sm" onClick={() => {
                    if (searchQuery.trim()) frpSearchTecnoModels(searchQuery).then(setTecnoSearchResults).catch(() => {})
                    else setTecnoSearchResults([])
                  }}><Search className="h-3 w-3 mr-1" />Search</Button>
                </div>
                {(() => {
                  const filtered = tecnoSeries === "all"
                    ? (tecnoSearchResults.length > 0 ? tecnoSearchResults : tecnoDb)
                    : tecnoDb.filter(m => m.series === tecnoSeries)
                  return (
                    <>
                      <span className="text-xs text-muted-foreground">{filtered.length} Tecno models{tecnoSeries !== "all" ? ` in ${tecnoSeries} series` : ""}</span>
                      <div className="flex flex-col gap-2">
                        {filtered.slice(0, 30).map(model => (
                          <Card key={model.marketing_name}>
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium">{model.marketing_name}</span>
                                  <Badge variant="outline" className="text-xs ml-2 bg-blue-500/10 text-blue-400">{model.series}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className={model.chipset_family === "MediaTek" ? "text-xs bg-green-500/10 text-green-400" : "text-xs bg-purple-500/10 text-purple-400"}>
                                    {model.chipset_family}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">{model.supported_methods.length} methods</Badge>
                                  {model.has_mtk_auth && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">Auth</Badge>}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{model.chipset}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}

            {dbBrand === "q4" && (
              <>
                {/* Brand filter */}
                <div className="flex gap-1 flex-wrap">
                  {["all", "Nokia", "Moto", "Huawei", "Sony", "Pixel", "Credit"].map(b => (
                    <Button key={b} variant={q4Brand === b ? "default" : "ghost"} size="sm"
                      onClick={() => setQ4Brand(b)} className="text-xs">
                      {b === "all" ? "All" : b}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search Q4 models (Nokia, Moto, Huawei, Sony, Pixel, Credit)..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        frpSearchQ4Models(searchQuery).then(setQ4SearchResults).catch(() => {})
                      }
                    }} className="text-xs" />
                  <Button size="sm" onClick={() => {
                    if (searchQuery.trim()) frpSearchQ4Models(searchQuery).then(setQ4SearchResults).catch(() => {})
                    else setQ4SearchResults([])
                  }}><Search className="h-3 w-3 mr-1" />Search</Button>
                </div>
                {(() => {
                  const filtered = q4Brand === "all"
                    ? (q4SearchResults.length > 0 ? q4SearchResults : q4Db)
                    : q4Db.filter(m => m.series === q4Brand)
                  return (
                    <>
                      <span className="text-xs text-muted-foreground">{filtered.length} Q4 models{q4Brand !== "all" ? ` in ${q4Brand} brand` : ""}</span>
                      <div className="flex flex-col gap-2">
                        {filtered.slice(0, 30).map(model => (
                          <Card key={model.marketing_name}>
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium">{model.marketing_name}</span>
                                  <Badge variant="outline" className="text-xs ml-2 bg-blue-500/10 text-blue-400">{model.series}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className={
                                    model.chipset_family === "MediaTek" ? "text-xs bg-green-500/10 text-green-400" :
                                    model.chipset_family === "Qualcomm" ? "text-xs bg-red-500/10 text-red-400" :
                                    model.chipset_family === "Spreadtrum" ? "text-xs bg-purple-500/10 text-purple-400" :
                                    model.chipset_family === "Kirin" ? "text-xs bg-orange-500/10 text-orange-400" :
                                    "text-xs bg-blue-500/10 text-blue-400"
                                  }>
                                    {model.chipset_family}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">{model.supported_methods.length} methods</Badge>
                                  {model.has_mtk_auth && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">Auth</Badge>}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{model.chipset}</div>
                              {model.notes && <div className="text-xs text-muted-foreground mt-1 italic">{model.notes}</div>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}

            {dbBrand === "infinix" && (
              <>
                {/* Series filter */}
                <div className="flex gap-1 flex-wrap">
                  {["all", "Hot", "Note", "Smart", "Zero", "GT"].map(s => (
                    <Button key={s} variant={infinixSeries === s ? "default" : "ghost"} size="sm"
                      onClick={() => setInfinixSeries(s)} className="text-xs">
                      {s === "all" ? "All" : s}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search Infinix models (Hot, Note, Smart, Zero, GT)..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        frpSearchInfinixModels(searchQuery).then(setInfinixSearchResults).catch(() => {})
                      }
                    }} className="text-xs" />
                  <Button size="sm" onClick={() => {
                    if (searchQuery.trim()) frpSearchInfinixModels(searchQuery).then(setInfinixSearchResults).catch(() => {})
                    else setInfinixSearchResults([])
                  }}><Search className="h-3 w-3 mr-1" />Search</Button>
                </div>
                {(() => {
                  const filtered = infinixSeries === "all"
                    ? (infinixSearchResults.length > 0 ? infinixSearchResults : infinixDb)
                    : infinixDb.filter(m => m.series === infinixSeries)
                  return (
                    <>
                      <span className="text-xs text-muted-foreground">{filtered.length} Infinix models{infinixSeries !== "all" ? ` in ${infinixSeries} series` : ""}</span>
                      <div className="flex flex-col gap-2">
                        {filtered.slice(0, 30).map(model => (
                          <Card key={model.marketing_name}>
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium">{model.marketing_name}</span>
                                  <Badge variant="outline" className="text-xs ml-2 bg-blue-500/10 text-blue-400">{model.series}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className={model.chipset_family === "MediaTek" ? "text-xs bg-green-500/10 text-green-400" : "text-xs bg-purple-500/10 text-purple-400"}>
                                    {model.chipset_family}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">{model.supported_methods.length} methods</Badge>
                                  {model.has_mtk_auth && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">Auth</Badge>}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{model.chipset}</div>
                              {model.notes && <div className="text-xs text-muted-foreground mt-1 italic">{model.notes}</div>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}

            {dbBrand === "itel" && (
              <>
                {/* Series filter */}
                <div className="flex gap-1 flex-wrap">
                  {["all", "A", "P", "S", "Vision"].map(s => (
                    <Button key={s} variant={itelSeries === s ? "default" : "ghost"} size="sm"
                      onClick={() => setItelSeries(s)} className="text-xs">
                      {s === "all" ? "All" : s}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search Itel models (A, P, S, Vision)..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        frpSearchItelModels(searchQuery).then(setItelSearchResults).catch(() => {})
                      }
                    }} className="text-xs" />
                  <Button size="sm" onClick={() => {
                    if (searchQuery.trim()) frpSearchItelModels(searchQuery).then(setItelSearchResults).catch(() => {})
                    else setItelSearchResults([])
                  }}><Search className="h-3 w-3 mr-1" />Search</Button>
                </div>
                {(() => {
                  const filtered = itelSeries === "all"
                    ? (itelSearchResults.length > 0 ? itelSearchResults : itelDb)
                    : itelDb.filter(m => m.series === itelSeries)
                  return (
                    <>
                      <span className="text-xs text-muted-foreground">{filtered.length} Itel models{itelSeries !== "all" ? ` in ${itelSeries} series` : ""}</span>
                      <div className="flex flex-col gap-2">
                        {filtered.slice(0, 30).map(model => (
                          <Card key={model.marketing_name}>
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium">{model.marketing_name}</span>
                                  <Badge variant="outline" className="text-xs ml-2 bg-blue-500/10 text-blue-400">{model.series}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className={model.chipset_family === "MediaTek" ? "text-xs bg-green-500/10 text-green-400" : "text-xs bg-purple-500/10 text-purple-400"}>
                                    {model.chipset_family}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">{model.supported_methods.length} methods</Badge>
                                  {model.has_mtk_auth && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">Auth</Badge>}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{model.chipset}</div>
                              {model.notes && <div className="text-xs text-muted-foreground mt-1 italic">{model.notes}</div>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}

            {dbBrand === "q3" && (
              <>
                {/* Brand filter */}
                <div className="flex gap-1 flex-wrap">
                  {["all", "Xiaomi", "Redmi", "POCO", "OPPO", "Realme", "Vivo", "Honor"].map(b => (
                    <Button key={b} variant={q3Brand === b ? "default" : "ghost"} size="sm"
                      onClick={() => setQ3Brand(b)} className="text-xs">
                      {b === "all" ? "All" : b}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search Q3 models (Xiaomi, Redmi, POCO, OPPO, Realme, Vivo, Honor)..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        frpSearchQ3Models(searchQuery).then(setQ3SearchResults).catch(() => {})
                      }
                    }} className="text-xs" />
                  <Button size="sm" onClick={() => {
                    if (searchQuery.trim()) frpSearchQ3Models(searchQuery).then(setQ3SearchResults).catch(() => {})
                    else setQ3SearchResults([])
                  }}><Search className="h-3 w-3 mr-1" />Search</Button>
                </div>
                {(() => {
                  const filtered = q3Brand === "all"
                    ? (q3SearchResults.length > 0 ? q3SearchResults : q3Db)
                    : q3Db.filter(m => m.series === q3Brand)
                  return (
                    <>
                      <span className="text-xs text-muted-foreground">{filtered.length} Q3 models{q3Brand !== "all" ? ` in ${q3Brand} brand` : ""}</span>
                      <div className="flex flex-col gap-2">
                        {filtered.slice(0, 30).map(model => (
                          <Card key={model.marketing_name}>
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium">{model.marketing_name}</span>
                                  <Badge variant="outline" className="text-xs ml-2 bg-blue-500/10 text-blue-400">{model.series}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className={
                                    model.chipset_family === "MediaTek" ? "text-xs bg-green-500/10 text-green-400" :
                                    model.chipset_family === "Qualcomm" ? "text-xs bg-red-500/10 text-red-400" :
                                    model.chipset_family === "Spreadtrum" ? "text-xs bg-purple-500/10 text-purple-400" :
                                    "text-xs bg-blue-500/10 text-blue-400"
                                  }>
                                    {model.chipset_family}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">{model.supported_methods.length} methods</Badge>
                                  {model.has_mtk_auth && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">Auth</Badge>}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{model.chipset}</div>
                              {model.notes && <div className="text-xs text-muted-foreground mt-1 italic">{model.notes}</div>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
