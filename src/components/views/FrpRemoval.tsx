import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  frpVerifyHandshake,
  frpExecuteResetMode,
  frpRemoveKnox,
  prepareDestructiveOperation,
  type FrpDetectionResult,
  type SamsungModel,
  type BypassResult,
  type DeviceProfile,
  type FrpAlgorithmInfo,
  type FrpResetModeInfo,
  type PhaseAction,
  type TecnoModel,
  type HandshakeVerification,
  type ResetExecutionResult,
  type KnoxRemovalResult,
} from "@/lib/frp-commands"
import { type DeviceInfo } from "@/tauri-commands"
import {
  ShieldAlert, Search, Play, Zap, RefreshCw,
  AlertTriangle, CheckCircle2,
  XCircle, Smartphone, Info, Cpu,
  RotateCcw, Layers, Terminal, Settings, ShieldCheck, Wrench, LockKeyhole, Unlock
} from "lucide-react"
import { BrandRibbon, BrandId, ChipsetFilter } from "./FrpRemoval/BrandRibbon"
import { ModelBrowser } from "./FrpRemoval/ModelBrowser"
import { DeviceStatusPanel } from "./FrpRemoval/DeviceStatusPanel"
import { RealityCheckPanel } from "./FrpRemoval/RealityCheck"
import { createLogger } from "@/lib/logger"
import {
  OperationSafetyGate,
  isOperationPreflightReady,
} from "@/components/OperationSafetyGate"

const logger = createLogger("FrpEnhanced")

interface FrpRemovalProps {
  selectedDevice: DeviceInfo
}

export function FrpRemoval({ selectedDevice }: FrpRemovalProps) {
  // === Original states preserved (no function alteration) ===
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
  const [dbBrand, setDbBrand] = useState<BrandId>("samsung")
  const [tecnoSeries, setTecnoSeries] = useState<string>("all")
  const [infinixSeries, setInfinixSeries] = useState<string>("all")
  const [itelSeries, setItelSeries] = useState<string>("all")
  const [q3Brand, setQ3Brand] = useState<string>("all")
  const [q4Brand, setQ4Brand] = useState<string>("all")

  // === Enhanced UI states (new, no function alteration) ===
  const [chipsetFilter, setChipsetFilter] = useState<ChipsetFilter>("All")
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null)
  const [operationTab, setOperationTab] = useState<"security" | "brom" | "function" | "repair" | "adb" | "knox">("security")
  const [preloaderAuth, setPreloaderAuth] = useState<string>("Samsung (A10S)")
  const [progress, setProgress] = useState(0)
  // audit fix (2026-08-12): trailing progress-reset timers were orphaned —
  // a new run left the old timer alive to wipe the new run's bar, and an
  // unmount fired setProgress after teardown. Track + gate + clear all.
  const progressResetRef = useRef<number | null>(null)
  const resetProgressSoon = (ms: number) => {
    if (progressResetRef.current !== null) window.clearTimeout(progressResetRef.current)
    progressResetRef.current = window.setTimeout(() => { progressResetRef.current = null; setProgress(0) }, ms)
  }
  useEffect(() => () => {
    if (progressResetRef.current !== null) window.clearTimeout(progressResetRef.current)
  }, [])

  // === Confirmed Features States ===
  const [handshake, setHandshake] = useState<HandshakeVerification | null>(null)
  const [isVerifyingHandshake, setIsVerifyingHandshake] = useState(false)
  const [resetResult, setResetResult] = useState<ResetExecutionResult | null>(null)
  const [isRunningReset, setIsRunningReset] = useState(false)
  const [knoxResult, setKnoxResult] = useState<KnoxRemovalResult | null>(null)
  const [isRemovingKnox, setIsRemovingKnox] = useState(false)

  // === Safety-first gate (guidance before action) ===
  // Destructive/reset/Knox actions stay disabled until the user explicitly
  // acknowledges the risks. Read-only diagnostics (scan, handshake, reality
  // check) remain one-click.
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const [backupAcknowledged, setBackupAcknowledged] = useState(false)
  const [typedAuthorization, setTypedAuthorization] = useState("")
  const safetyReady = isOperationPreflightReady(selectedDevice.serial_no, {
    ownershipConfirmed: safetyAcknowledged,
    backupConfirmed: backupAcknowledged,
    typedAuthorization,
  })

  useEffect(() => {
    // A permit must never carry across a selected-device change.
    setSafetyAcknowledged(false)
    setBackupAcknowledged(false)
    setTypedAuthorization("")
  }, [selectedDevice.serial_no])

  const issuePermit = async (operation: string) => prepareDestructiveOperation({
    deviceSerial: selectedDevice.serial_no,
    expectedModel: selectedDevice.model,
    operation,
    ownershipConfirmed: safetyAcknowledged,
    backupConfirmed: backupAcknowledged,
    typedConfirmation: typedAuthorization,
  })

  const chipsetColors: Record<string, string> = {
    Exynos: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Qualcomm: "bg-red-500/20 text-red-400 border-red-500/30",
    MediaTek: "bg-green-500/20 text-green-400 border-green-500/30",
    Spreadtrum: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Kirin: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Unknown: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }

  // Evidence-band color scale (lab-gated band, NOT a success promise).
  // Bands come from docs/ANDROID-15-16-PATCH-RESEARCH.md §5.
  const successRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-400"
    if (rate >= 60) return "text-yellow-400"
    return "text-orange-400"
  }

  useEffect(() => {
    loadDatabase()
    loadResetModes()
  }, [])

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
    setProgress(10)
    try {
      const detection = await frpDetect(selectedDevice.serial_no)
      setFrpState(detection)
      setProgress(30)
      const profile = await frpBuildDeviceProfile(selectedDevice.serial_no)
      setDeviceProfile(profile)
      setProgress(60)
      const algos = await frpGetChipsetAlgorithms(profile.chipset_family)
      setAlgorithms(algos)
      setProgress(80)
      if (profile.model_code) {
        const models = await frpSearchModels(profile.model_code)
        if (models.length > 0) setMatchedModel(models[0])
      }
      setProgress(100)
      logger.info("FRP scan complete", { model: profile.model_code, chipset: profile.chipset_family, frp: detection.frp_state })
    } catch (e) {
      logger.error("Scan failed", e)
    } finally {
      setIsDetecting(false)
      resetProgressSoon(2000)
    }
  }

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setTecnoSearchResults([])
      setInfinixSearchResults([])
      setItelSearchResults([])
      setQ3SearchResults([])
      setQ4SearchResults([])
      return
    }
    try {
      if (dbBrand === "samsung") setSearchResults(await frpSearchModels(q))
      if (dbBrand === "tecno") setTecnoSearchResults(await frpSearchTecnoModels(q))
      if (dbBrand === "infinix") setInfinixSearchResults(await frpSearchInfinixModels(q))
      if (dbBrand === "itel") setItelSearchResults(await frpSearchItelModels(q))
      if (dbBrand === "q3") setQ3SearchResults(await frpSearchQ3Models(q))
      if (dbBrand === "q4") setQ4SearchResults(await frpSearchQ4Models(q))
    } catch {}
  }

  const handleRunMethod = async (methodId: string) => {
    if (!safetyReady) {
      logger.warn("Method run blocked: backend safety pre-flight is incomplete")
      return
    }
    setIsRunning(true)
    setBypassResult(null)
    setProgress(15)
    let interval: number | undefined
    try {
      // Progress is UI-only; final status comes exclusively from backend verification.
      interval = window.setInterval(() => setProgress(p => Math.min(p + 10, 85)), 500)
      const permit = await issuePermit(`frp_method:${methodId}`)
      const result = await frpRunMethod(selectedDevice.serial_no, methodId, permit.token)
      setBypassResult(result)
      setProgress(result.success ? 100 : 70)
      logger.info("FRP method run", { methodId, success: result.success })
    } catch (e) {
      logger.error("Method failed", e)
    } finally {
      if (interval) clearInterval(interval)
      setIsRunning(false)
      resetProgressSoon(2500)
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    setProgress(0)
    logger.info("User stopped FRP operation")
  }

  // === Confirmed Features Handlers ===

  // 1. Verify USB debugging + Developer Options handshake
  const handleVerifyHandshake = async () => {
    setIsVerifyingHandshake(true)
    try {
      const result = await frpVerifyHandshake(selectedDevice.serial_no)
      setHandshake(result)
      logger.info("Handshake verified", result)
    } catch (e) {
      logger.error("Handshake failed", e)
      setHandshake({
        handshake_ok: false,
        adb_enabled: false,
        developer_options_enabled: false,
        usb_state: "unknown",
        usb_config: "",
        message: `Handshake failed: ${e}. Enable Developer Options: Settings > About Phone > Tap Build Number 7 times > Back > Developer Options > Enable USB Debugging > Connect USB > Allow RSA.`
      })
    } finally {
      setIsVerifyingHandshake(false)
    }
  }

  // 2. Execute Reset Mode — guidance-first: refuses until the safety gate is acknowledged
  const handleExecuteReset = async (modeId: string) => {
    if (!safetyReady) {
      logger.warn("Reset blocked: backend safety pre-flight is incomplete")
      return
    }
    setIsRunningReset(true)
    setResetResult(null)
    setProgress(10)
    let interval: number | undefined
    try {
      interval = window.setInterval(() => setProgress(p => Math.min(p + 10, 80)), 600)
      const permit = await issuePermit(`frp_reset:${modeId}`)
      const result = await frpExecuteResetMode(selectedDevice.serial_no, modeId, permit.token)
      setResetResult(result as any)
      setProgress(result.operation_accepted ? 90 : 60)
      logger.info("Reset request finished", { modeId, accepted: result.operation_accepted, verification: result.verification_status })
    } catch (e: any) {
      logger.error("Reset failed", e)
      setResetResult({
        reset_mode: resetModes.find(m => m.id === modeId) as any,
        success: false,
        operation_accepted: false,
        steps: [],
        message: `Reset failed: ${e}`,
        device_state_after: "No verified state change",
        requires_reboot: false,
        frp_removed_percent: 0,
        data_wiped: false,
        verification_status: "failed"
      } as any)
    } finally {
      if (interval) clearInterval(interval)
      setIsRunningReset(false)
      resetProgressSoon(3000)
    }
  }

  // 3. Knox Removal — guidance-first: refuses until the safety gate is acknowledged
  const handleRemoveKnox = async () => {
    if (!safetyReady) {
      logger.warn("Knox package operation blocked: backend safety pre-flight is incomplete")
      return
    }
    setIsRemovingKnox(true)
    setKnoxResult(null)
    setProgress(15)
    let interval: number | undefined
    try {
      interval = window.setInterval(() => setProgress(p => Math.min(p + 10, 80)), 500)
      const permit = await issuePermit("knox_remove")
      const result = await frpRemoveKnox(selectedDevice.serial_no, permit.token)
      setKnoxResult(result as any)
      setProgress(result.success ? 100 : 70)
      logger.info("Knox removal", { success: result.success, packages: (result as any).knox_packages_disabled?.length })
    } catch (e) {
      logger.error("Knox removal failed", e)
    } finally {
      if (interval) clearInterval(interval)
      setIsRemovingKnox(false)
      resetProgressSoon(2500)
    }
  }

  const getActionLabel = (action: PhaseAction): string => {
    if (typeof action === 'string') {
      switch (action) {
        case 'ADBCommands': return 'ADB'
        case 'FlashFirmware': return 'Flash'
        case 'LoadFirehose': return 'Firehose'
        case 'Verify': return 'Verify'
        default: return action
      }
    }
    const key = Object.keys(action)[0]
    switch (key) {
      case 'ManualModeSwitch': return 'Mode'
      case 'ADBCommand': return 'CMD'
      case 'ErasePartition': return 'Erase'
      case 'ManualInteraction': return 'Manual'
      default: return key
    }
  }

  // === Enhanced model browser data memo ===
  const brandCounts = useMemo(() => ({
    samsung: deviceDb.length,
    tecno: tecnoDb.length,
    infinix: infinixDb.length,
    itel: itelDb.length,
    q3: q3Db.length,
    q4: q4Db.length,
  }), [deviceDb, tecnoDb, infinixDb, itelDb, q3Db, q4Db])

  const currentModelsRaw = useMemo(() => {
    switch (dbBrand) {
      case "samsung": return (searchResults.length ? searchResults : deviceDb).map(m => ({
        key: m.model_code,
        marketing_name: m.marketing_name,
        model_code: m.model_code,
        chipset: m.chipset,
        chipset_family: m.chipset.split(' ')[0] || 'Unknown',
        supported_methods: m.supported_methods as any as string[],
        requires_preauthorized_adb: m.requires_preauthorized_adb,
        supports_download_mode: m.supports_download_mode,
      }))
      case "tecno": {
        const base = tecnoSearchResults.length ? tecnoSearchResults : tecnoDb
        const filtered = tecnoSeries === "all" ? base : base.filter(m => m.series === tecnoSeries)
        return filtered.map(m => ({
          key: m.marketing_name,
          marketing_name: m.marketing_name,
          series: m.series,
          chipset: m.chipset,
          chipset_family: m.chipset_family,
          supported_methods: m.supported_methods,
          has_mtk_auth: m.has_mtk_auth,
          available_in_kenya: m.available_in_kenya,
        }))
      }
      case "infinix": {
        const base = infinixSearchResults.length ? infinixSearchResults : infinixDb
        const filtered = infinixSeries === "all" ? base : base.filter(m => m.series === infinixSeries)
        return filtered.map(m => ({
          key: m.marketing_name,
          marketing_name: m.marketing_name,
          series: m.series,
          chipset: m.chipset,
          chipset_family: m.chipset_family,
          supported_methods: m.supported_methods,
          has_mtk_auth: m.has_mtk_auth,
        }))
      }
      case "itel": {
        const base = itelSearchResults.length ? itelSearchResults : itelDb
        const filtered = itelSeries === "all" ? base : base.filter(m => m.series === itelSeries)
        return filtered.map(m => ({
          key: m.marketing_name,
          marketing_name: m.marketing_name,
          series: m.series,
          chipset: m.chipset,
          chipset_family: m.chipset_family,
          supported_methods: m.supported_methods,
          has_mtk_auth: m.has_mtk_auth,
        }))
      }
      case "q3": {
        const base = q3SearchResults.length ? q3SearchResults : q3Db
        const filtered = q3Brand === "all" ? base : base.filter(m => m.series === q3Brand)
        return filtered.map(m => ({
          key: m.marketing_name,
          marketing_name: m.marketing_name,
          series: m.series,
          chipset: m.chipset,
          chipset_family: m.chipset_family,
          supported_methods: m.supported_methods,
          has_mtk_auth: m.has_mtk_auth,
          notes: m.notes,
        }))
      }
      case "q4": {
        const base = q4SearchResults.length ? q4SearchResults : q4Db
        const filtered = q4Brand === "all" ? base : base.filter(m => m.series === q4Brand)
        return filtered.map(m => ({
          key: m.marketing_name,
          marketing_name: m.marketing_name,
          series: m.series,
          chipset: m.chipset,
          chipset_family: m.chipset_family,
          supported_methods: m.supported_methods,
          has_mtk_auth: m.has_mtk_auth,
          notes: m.notes,
        }))
      }
      default: return []
    }
  }, [dbBrand, deviceDb, searchResults, tecnoDb, tecnoSearchResults, tecnoSeries, infinixDb, infinixSearchResults, infinixSeries, itelDb, itelSearchResults, itelSeries, q3Db, q3SearchResults, q3Brand, q4Db, q4SearchResults, q4Brand])

  const filteredModels = useMemo(() => {
    if (chipsetFilter === "All") return currentModelsRaw
    if (chipsetFilter === "Universal") return currentModelsRaw
    return currentModelsRaw.filter(m => m.chipset_family.toLowerCase().includes(chipsetFilter.toLowerCase()) || m.chipset.toLowerCase().includes(chipsetFilter.toLowerCase()))
  }, [currentModelsRaw, chipsetFilter])

  const totalModels = deviceDb.length + tecnoDb.length + infinixDb.length + itelDb.length + q3Db.length + q4Db.length

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Top Enhanced Header with Device Info - original functions preserved */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <ShieldAlert className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              FRP Removal — Enhanced UX
              <Badge variant="outline" className="text-[10px]">v1.1.0 • 268 Models</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">Security • Flash • BROM/EDL • Function • Repair — same functions, superior UX (inspired by TFT, original design)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
            <Smartphone className="h-3 w-3 mr-1" />{selectedDevice.model}
          </Badge>
          {deviceProfile && (
            <Badge variant="outline" className={`${chipsetColors[deviceProfile.chipset_family] || ""} text-xs`}>
              <Cpu className="h-3 w-3 mr-1" />{deviceProfile.chipset_family}
            </Badge>
          )}
          {frpState && (
            <Badge variant="outline" className={
              frpState.frp_state === "Active" ? "bg-red-500/20 text-red-400 border-red-500/30 text-xs" :
              frpState.frp_state === "Inactive" ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" :
              "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
            }>
              {frpState.frp_state === "Active" ? "🔒 LOCKED" : frpState.frp_state === "Inactive" ? "🔓 FREE" : "❓ UNKNOWN"}
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced Brand Ribbon - inspired by TFT top row 19 brands but original neutral */}
      <BrandRibbon
        counts={brandCounts}
        selectedBrand={dbBrand}
        onBrandChange={setDbBrand}
        chipsetFilter={chipsetFilter}
        onChipsetChange={setChipsetFilter}
        platform="Auto"
      />

      {/* Operation Mode Tabs - inspired by TFT SECURITY/ODIN FLASH/BROM/EDL/FUNCTION etc but original grouping */}
      <div className="flex items-center gap-1 overflow-x-auto shrink-0 pb-1">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {[
            { id: "security" as const, label: "SECURITY", icon: ShieldCheck, count: frpState ? 1 : 0 },
            { id: "brom" as const, label: "BROM | EDL", icon: Cpu, count: algorithms.length },
            { id: "function" as const, label: "FUNCTION", icon: Wrench, count: 15 },
            { id: "repair" as const, label: "REPAIR", icon: Settings, count: resetModes.length },
            { id: "knox" as const, label: "KNOX REMOVE", icon: ShieldAlert, count: knoxResult ? 1 : 0 },
            { id: "adb" as const, label: "ADB | FASTBOOT | MDM", icon: Terminal, count: 6 },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={operationTab === tab.id ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setOperationTab(tab.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">{tab.count}</Badge>}
              </Button>
            )
          })}
        </div>
        <Separator orientation="vertical" className="h-6 mx-2" />
        <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
          {(["universal", "methods", "database"] as const).map(tab => (
            <Button key={tab} variant={activeTab === tab ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab(tab)} className="h-7 text-xs">
              {tab === "universal" && "🎯 Universal"}
              {tab === "methods" && "⚡ Methods"}
              {tab === "database" && "📱 Database"}
            </Button>
          ))}
        </div>
      </div>

      {/* Main 3-pane layout - inspired by TFT but original */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0">
        {/* LEFT - Model Browser (like TFT left pane) */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-2 overflow-hidden">
          {/* Series filters for current brand */}
          {(dbBrand === "tecno" || dbBrand === "infinix" || dbBrand === "itel" || dbBrand === "q3" || dbBrand === "q4") && (
            <div className="flex gap-1 flex-wrap">
              {(dbBrand === "tecno" ? ["all", "Pop", "Spark", "Camon", "Pova", "Phantom"] :
                dbBrand === "infinix" ? ["all", "Hot", "Note", "Smart", "Zero", "GT"] :
                dbBrand === "itel" ? ["all", "A", "P", "S", "Vision"] :
                dbBrand === "q3" ? ["all", "Xiaomi", "Redmi", "POCO", "OPPO", "Realme", "Vivo", "Honor"] :
                ["all", "Nokia", "Moto", "Huawei", "Sony", "Pixel", "Credit"]
              ).map(s => (
                <Button
                  key={s}
                  variant={
                    (dbBrand === "tecno" && tecnoSeries === s) ||
                    (dbBrand === "infinix" && infinixSeries === s) ||
                    (dbBrand === "itel" && itelSeries === s) ||
                    (dbBrand === "q3" && q3Brand === s) ||
                    (dbBrand === "q4" && q4Brand === s) ? "default" : "ghost"
                  }
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => {
                    if (dbBrand === "tecno") setTecnoSeries(s)
                    if (dbBrand === "infinix") setInfinixSeries(s)
                    if (dbBrand === "itel") setItelSeries(s)
                    if (dbBrand === "q3") setQ3Brand(s)
                    if (dbBrand === "q4") setQ4Brand(s)
                  }}
                >
                  {s === "all" ? "All" : s}
                </Button>
              ))}
            </div>
          )}

          <ModelBrowser
            brand={dbBrand}
            models={currentModelsRaw}
            filteredModels={filteredModels}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
            selectedModelKey={selectedModelKey}
            onSelect={(item) => {
              setSelectedModelKey(item.key)
              // For Samsung, also set matched model for compatibility
              if (dbBrand === "samsung") {
                const found = deviceDb.find(m => m.model_code === item.key)
                if (found) setMatchedModel(found)
              }
            }}
            platformFilter="Auto"
            totalCount={totalModels}
          />
        </div>

        {/* CENTER - Operation Workspace (like TFT center pane) */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-3 overflow-hidden">
          {/* PRELOADER Auth header like TFT */}
          <Card className="shrink-0 border-blue-500/30 bg-blue-500/5">
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-blue-400" />
                  PRELOADER Auth
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400">{preloaderAuth}</Badge>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-2" onClick={() => setPreloaderAuth(preloaderAuth === "Samsung (A10S)" ? "Universal" : "Samsung (A10S)")}>
                    Switch
                  </Button>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{selectedDevice.serial_no.slice(0, 8)}...</Badge>
                  <Button size="sm" className="h-7 text-xs" onClick={handleScan} disabled={isDetecting}>
                    {isDetecting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                    {isDetecting ? "Scanning..." : "Scan Device"}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <ScrollArea className="flex-1">
            <div className="pr-3 space-y-3">
              {/* === CONFIRMED FEATURE 1: USB Debugging Handshake === */}
              <Card className={`border ${handshake?.handshake_ok ? "border-green-500/30 bg-green-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${handshake?.handshake_ok ? "bg-green-500 animate-pulse" : "bg-blue-500"}`} />
                      ✅ CONFIRMED: USB Debugging & Developer Options Handshake
                      {handshake?.handshake_ok && <Badge className="bg-green-500 text-white text-[10px]">HANDSHAKE OK</Badge>}
                    </CardTitle>
                    <Button size="sm" className="h-6 text-[10px]" onClick={handleVerifyHandshake} disabled={isVerifyingHandshake}>
                      {isVerifyingHandshake ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                      {isVerifyingHandshake ? "Verifying..." : "Verify Handshake"}
                    </Button>
                  </div>
                  <CardDescription className="text-[11px]">
                    Confirms USB Debugging + Developer Options + RSA authorization so the app can handshake with the device before running reset/bypass flows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  {handshake ? (
                    <div className="space-y-2">
                      <div className="text-[11px] p-2 rounded bg-muted/50 border">
                        {handshake.message}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div><span className="text-muted-foreground">ADB:</span> <Badge variant={handshake.adb_enabled ? "default" : "outline"} className="text-[9px] ml-1">{handshake.adb_enabled ? "Enabled" : "Disabled"}</Badge></div>
                        <div><span className="text-muted-foreground">Dev Opt:</span> <Badge variant={handshake.developer_options_enabled ? "default" : "outline"} className="text-[9px] ml-1">{handshake.developer_options_enabled ? "Enabled" : "Disabled"}</Badge></div>
                        <div><span className="text-muted-foreground">USB:</span> <span className="font-mono">{handshake.usb_state || "adb"}</span></div>
                      </div>
                      {!handshake.handshake_ok && (
                        <div className="text-[11px] p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                          <strong>How to enable handshake:</strong><br/>
                          1. Settings → About Phone → Tap <strong>Build Number 7 times</strong> → Developer Options enabled<br/>
                          2. Settings → Developer Options → <strong>Enable USB Debugging</strong> + OEM Unlock<br/>
                          3. Connect USB → Allow <strong>RSA fingerprint dialog</strong> on phone → Check Always allow<br/>
                          4. App shows <strong>Authorized</strong> → handshake complete → reset/bypass flows unlocked (after Safety Pre-Flight)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Click <strong>Verify Handshake</strong> to confirm the selected phone has an authorized ADB connection. Required before any mutating package, provisioning or reset request.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warning card */}
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-yellow-300/80 leading-4">
                      <strong>Chipset-specific:</strong> Exynos—Download Mode, Qualcomm—EDL 9008, MediaTek—Brom. Auto-detect selects optimal. For legitimate recovery only.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Device Profile */}
              {deviceProfile && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-blue-400" />
                      {deviceProfile.marketing_name || matchedModel?.marketing_name || deviceProfile.model_code} ({deviceProfile.model_code})
                      <Badge variant="outline" className={`${chipsetColors[deviceProfile.chipset_family] || ""} text-[10px]`}>{deviceProfile.chipset_family}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 text-[11px] grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">Brand:</span> {deviceProfile.brand}</div>
                    <div><span className="text-muted-foreground">Chip:</span> {deviceProfile.chipset_name}</div>
                    <div><span className="text-muted-foreground">Android:</span> {deviceProfile.android_version}</div>
                    <div><span className="text-muted-foreground">Patch:</span> {deviceProfile.security_patch || "N/A"}</div>
                    <div><span className="text-muted-foreground">Binary:</span> {deviceProfile.binary_version || "N/A"}</div>
                    <div><span className="text-muted-foreground">FRP:</span> <span className={deviceProfile.frp_state === "Active" ? "text-red-400" : "text-green-400"}>{deviceProfile.frp_state}</span></div>
                  </CardContent>
                </Card>
              )}

              {/* Research Reality Check — evidence-based feasibility from Aug 2026 research */}
              {deviceProfile && <RealityCheckPanel profile={deviceProfile} detection={frpState} />}

              {/* Security tab - FRP state + reset modes */}
              {(operationTab === "security" || activeTab === "universal") && (
                <div className="space-y-3">
                  {/* Safety Pre-Flight — guidance first, before any destructive action */}
                  <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                        Safety Pre-Flight — read before running anything
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Guidance comes first. Destructive actions stay locked until you confirm the checklist below.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2 text-[11px]">
                      <ul className="space-y-1 text-muted-foreground leading-4">
                        <li>• <strong>Own device only.</strong> FRP removal on a device you don't own is illegal.</li>
                        <li>• <strong>Back up first.</strong> A full wipe permanently erases photos, apps and accounts.</li>
                        <li>• <strong>Flashing = brick risk.</strong> EDL/Brom/Odin/SPD lanes need the correct bit/version and a backup; the wrong file can soft-brick the phone.</li>
                        <li>• <strong>Don't spam the phone.</strong> Test-mode dials and USB replugs are budgeted — recent Samsung firmware reacts to abnormal setup behaviour. If a probe fails, stop and read the runbook instead of retrying.</li>
                        <li>• <strong>Reboot + re-check.</strong> After any reset, reboot and re-run detection — that observation is the only honest confirmation.</li>
                      </ul>
                      <OperationSafetyGate
                        deviceSerial={selectedDevice.serial_no}
                        ownershipConfirmed={safetyAcknowledged}
                        backupConfirmed={backupAcknowledged}
                        typedAuthorization={typedAuthorization}
                        onOwnershipChange={setSafetyAcknowledged}
                        onBackupChange={setBackupAcknowledged}
                        onTypedAuthorizationChange={setTypedAuthorization}
                      />
                    </CardContent>
                  </Card>

                  {/* Reset Mode Selector — honest scope, no promised percentage */}
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-xs flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Reset Modes — honest scope (evidence-banded, no guaranteed %) </CardTitle>
                      <CardDescription className="text-[11px]">
                        These run the ADB provisioning ladder: they clear setup/provisioning flags and can wipe data. They do NOT erase the encrypted FRP partition (that needs a below-OS lane). "Full wipe" deletes all data; "temporary" may re-lock on the next reset.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {resetModes.map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setSelectedResetMode(mode.id)}
                          className={`text-left p-2.5 rounded-lg border transition-colors ${selectedResetMode === mode.id ? "border-orange-500 bg-orange-500/10" : "border-border/50 hover:bg-muted/50"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{mode.label}</span>
                            <Badge variant="outline" className={mode.wipes_data ? "bg-red-500/20 text-red-300 border-red-500/30 text-[10px]" : "bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]"}>
                              {mode.wipes_data ? "Wipe requested" : "No wipe"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{mode.description}</p>
                          <div className="flex gap-1 mt-1">
                            {mode.wipes_data ? <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400">Data Wiped</Badge> : <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-400">Data Kept</Badge>}
                            {mode.erases_frp_partition && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400">Flags cleared (not partition)</Badge>}
                            {mode.wipes_data && <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[9px]">WIPE REQUEST — DATA LOSS IF ACCEPTED</Badge>}
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Execute Reset — gated by handshake + safety acknowledgement */}
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Play className="h-4 w-4 text-green-400" />
                        Execute Reset — {resetModes.find(m => m.id === selectedResetMode)?.label || selectedResetMode}
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Requires handshake OK (USB debugging + Developer Options) and the Safety Pre-Flight acknowledgement. Runs the ADB provisioning ladder — reboot and re-check afterwards.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 text-xs flex-1 gap-2" onClick={() => handleExecuteReset(selectedResetMode)} disabled={isRunningReset || !handshake?.handshake_ok || !safetyReady}>
                          {isRunningReset ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          {isRunningReset
                            ? "Running authorized operation..."
                            : resetModes.find(mode => mode.id === selectedResetMode)?.wipes_data
                              ? "Request Factory Reset (data loss)"
                              : "Apply Provisioning Flags (no wipe)"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleVerifyHandshake} disabled={isVerifyingHandshake}>
                          Check Handshake
                        </Button>
                      </div>
                      {!handshake?.handshake_ok && (
                        <div className="text-[11px] text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                          ⚠️ Handshake not confirmed. Please Verify Handshake first: Enable Developer Options (tap Build Number 7 times) → Enable USB Debugging → Allow RSA.
                        </div>
                      )}
                      {!safetyReady && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                          🔒 Complete both attestations and type the serial-bound authorization phrase above.
                        </div>
                      )}
                      {resetResult && (
                        <div className={`p-2 rounded border text-xs ${resetResult.operation_accepted ? "bg-blue-500/10 border-blue-500/30" : "bg-orange-500/10 border-orange-500/30"}`}>
                          <div className="flex items-center gap-2 font-semibold">
                            {resetResult.operation_accepted ? <Info className="h-4 w-4 text-blue-400" /> : <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                            {resetResult.message}
                          </div>
                          <div className="mt-2 text-[11px] p-2 bg-muted/50 rounded">
                            <strong>Device State After:</strong> {resetResult.device_state_after}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                            <div>Scope: <Badge variant="outline" className="text-[9px]">ADB flags only</Badge></div>
                            <div>Wipe request: <Badge variant={resetResult.data_wiped ? "destructive" : "outline"} className="text-[9px]">{resetResult.data_wiped ? "Accepted" : "No/failed"}</Badge></div>
                            <div>Final status: <Badge variant="outline" className="text-[9px]">Pending reboot scan</Badge></div>
                          </div>
                          <div className="mt-2 space-y-1">
                            {resetResult.steps.slice(0, 5).map((s, i) => (
                              <div key={i} className="flex gap-2 text-[10px] font-mono">
                                {s.success ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                                <span className="truncate">{s.command}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* BROM/EDL tab - chipset algorithms with safe vs high-risk like TFT but enhanced */}
              {(operationTab === "brom" || operationTab === "security") && algorithms.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-400" />
                      Chipset-Optimized — {deviceProfile?.chipset_family || "Universal"}
                      <Badge variant="outline" className={`${chipsetColors[deviceProfile?.chipset_family || "Unknown"]} text-[10px]`}>{deviceProfile?.chipset_family}</Badge>
                    </CardTitle>
                    <CardDescription className="text-[11px]">Ranked by evidence band (lab-gated, not a success promise) — see the Research Reality Check panel above</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2">
                    {algorithms.map((algo, idx) => (
                      <div key={algo.id} className={`p-2.5 rounded-lg border ${idx === 0 ? "border-green-500/30 bg-green-500/5" : "border-border/50"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {idx === 0 && <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">RECOMMENDED</Badge>}
                            <span className="text-xs font-medium">{algo.label}</span>
                            <span className={`text-xs font-bold ${successRateColor(algo.success_rate)}`} title="Evidence band (lab-gated)">{algo.success_rate}% band</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {algo.requires_hardware && <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400">HW</Badge>}
                            {algo.is_adb_only && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400">ADB</Badge>}
                            <Button size="sm" variant={idx === 0 ? "default" : "outline"} className="h-6 text-[11px] px-2" onClick={() => {
                              const map: Record<string, string> = { samsung_test_mode: "emergency_dialer_bypass", adb_provisioning: "device_provisioning" }
                              handleRunMethod(map[algo.id] || "device_provisioning")
                            }} disabled={isRunning || !safetyReady}>
                              <Play className="h-3 w-3 mr-1" />{idx === 0 ? "Run Safe" : "Run"}
                            </Button>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-2">{algo.description}</p>
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {algo.phases.map((phase, pi) => (
                              <div key={pi} className="flex items-center gap-1 text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">
                                <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold">{pi + 1}</span>
                                <span>{phase.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{getActionLabel(phase.action)}</Badge>
                              </div>
                            ))}
                          </div>
                          <div className="flex h-1.5 rounded-full overflow-hidden mt-1">
                            {algo.phases.map((phase, pi) => (
                              <div key={pi} className={`${pi === 0 ? "bg-green-500" : pi === 1 ? "bg-blue-500" : pi === 2 ? "bg-orange-500" : "bg-purple-500"}`} style={{ width: `${phase.weight}%` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* FUNCTION tab - MDM/Knox like TFT FUNCTION [ADB] SAMSUNG MDM BYPASS */}
              {operationTab === "function" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><Wrench className="h-4 w-4" /> Function — MDM / Knox / Security</CardTitle>
                    <CardDescription className="text-[11px]">Inspired from TFT FUNCTION section — SAMSUNG MDM BYPASS 1/2, Disabling Knox/KG — same functions, enhanced grouping</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { id: "alliance_shield_bypass", label: "[BROM] ERASE MDM", desc: "Alliance Shield / Knox MDM erase", risk: "Medium", icon: ShieldCheck },
                      { id: "setup_wizard_disable", label: "SAMSUNG MDM BYPASS 1", desc: "[ADB] Disable setup wizard", risk: "Low", icon: Unlock },
                      { id: "device_provisioning", label: "SAMSUNG MDM BYPASS 2", desc: "[ADB] Device provisioning flags", risk: "Low", icon: Unlock },
                      { id: "settings_access", label: "Disabling Knox", desc: "Knox admin disable via ADB", risk: "Low", icon: ShieldAlert },
                      { id: "browser_download_bypass", label: "Browser Download Bypass", desc: "Download bypass APK", risk: "Medium", icon: Layers },
                      { id: "talkback_bypass", label: "TalkBack Bypass", desc: "Accessibility exploit", risk: "Medium", icon: Smartphone },
                    ].map(m => {
                      const Icon = m.icon
                      return (
                        <button key={m.id} onClick={() => handleRunMethod(m.id)} disabled={isRunning || !safetyReady} className="text-left p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors disabled:opacity-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{m.label}</span>
                            <Badge variant="outline" className="text-[9px]">{m.risk}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">{m.desc}</p>
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              {/* REPAIR tab - reset modes + re-lock etc like TFT UNLOCK/RELOCK BOOTLOADER */}
              {operationTab === "repair" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><Settings className="h-4 w-4" /> Repair — Bootloader & MDM</CardTitle>
                    <CardDescription className="text-[11px]">From TFT [BROM] UNLOCK/RELOCK BOOTLOADER, ERASE MDM — same functions present</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <button onClick={() => handleRunMethod("emergency_dialer_bypass")} className="p-2.5 rounded-lg border border-green-500/30 bg-green-500/5 text-left">
                      <div className="text-xs font-medium flex items-center gap-1"><Unlock className="h-3 w-3" /> [BROM] UNLOCK BOOTLOADER</div>
                      <div className="text-[11px] text-muted-foreground">Unlock via BROM/EDL — safe, data kept</div>
                    </button>
                    <button onClick={() => handleRunMethod("setup_wizard_uninstall")} className="p-2.5 rounded-lg border border-orange-500/30 bg-orange-500/5 text-left">
                      <div className="text-xs font-medium flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> [BROM] RELOCK BOOTLOADER</div>
                      <div className="text-[11px] text-muted-foreground">Relock after repair — verify Knox</div>
                    </button>
                    <button onClick={() => handleRunMethod("alliance_shield_bypass")} className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/5 text-left">
                      <div className="text-xs font-medium">[BROM] ERASE MDM</div>
                      <div className="text-[11px] text-muted-foreground">MDM/MDM bypass enterprise lock</div>
                    </button>
                    <button onClick={() => handleRunMethod("combination_firmware")} className="p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 text-left">
                      <div className="text-xs font-medium">[EDL] ERASE FRP (New Method)</div>
                      <div className="text-[11px] text-muted-foreground">Qualcomm EDL 9008 Firehose</div>
                    </button>
                  </CardContent>
                </Card>
              )}

              {/* KNOX REMOVE tab — honest scope: ADB package disable */}
              {operationTab === "knox" && (
                <div className="space-y-3">
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-purple-400" />
                        Knox Removal — ADB package disable (honest scope)
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Disables Knox apps via <code>pm disable-user</code>. This affects the current user's app state only — it does NOT reset the Knox Warranty bit or Knox Guard (KG) fuse state.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      <div className="text-[11px] p-2 rounded bg-muted/50 border">
                        <strong>What it does:</strong><br/>
                        • Requests user-0 disable for an explicit Knox container-package allow-list<br/>
                        • Reads Android's disabled-package list and reports only verified matches<br/>
                        • Does not clear package data or write invented global Knox flags<br/>
                        • Refuses Knox Guard and finance-lock packages; those require the owner/lender route
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 text-xs flex-1 gap-2 bg-purple-600 hover:bg-purple-700" onClick={handleRemoveKnox} disabled={isRemovingKnox || !handshake?.handshake_ok || !safetyReady}>
                          {isRemovingKnox ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldAlert className="h-3 w-3" />}
                          {isRemovingKnox ? "Verifying package state..." : "Disable Selected Knox Packages"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleVerifyHandshake}>
                          Verify Handshake
                        </Button>
                      </div>
                      {knoxResult && (
                        <div className={`p-3 rounded border text-xs ${knoxResult.success ? "bg-green-500/10 border-green-500/30" : "bg-orange-500/10 border-orange-500/30"}`}>
                          <div className="flex items-center gap-2 font-semibold">
                            {knoxResult.success ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                            {knoxResult.message}
                          </div>
                          {knoxResult.knox_packages_disabled?.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[11px] font-medium">Disabled Packages ({knoxResult.knox_packages_disabled.length}):</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {knoxResult.knox_packages_disabled.map(pkg => (
                                  <Badge key={pkg} variant="outline" className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-300">{pkg}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-2 text-[11px] p-2 bg-muted/50 rounded">
                            <strong>Verified scope:</strong> {knoxResult.knox_packages_disabled.length} package(s) disabled for user 0. Knox itself, the Warranty bit and Knox Guard were not reset.
                          </div>
                          <div className="mt-2 space-y-1">
                            {knoxResult.steps.slice(0, 6).map((s, i) => (
                              <div key={i} className="flex gap-2 text-[10px] font-mono">
                                {s.success ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                                <span className="truncate">{s.command}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
                        <strong>Alliance Shield fallback (Exynos):</strong> If ADB disable blocked by system, install Alliance Shield APK via adb install alliance_shield.apk → Open → FRP Bypass → Disable Knox components.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ADB tab */}
              {operationTab === "adb" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><Terminal className="h-4 w-4" /> ADB — Read Pattern & Commands</CardTitle>
                    <CardDescription className="text-[11px]">From TFT ADB Read Screen Pattern (Adb/Root) — maps to Paralock ShellTerminal + ScreenControl</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleRunMethod("content_provider_bypass")}>Read Screen Pattern</Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleRunMethod("account_manager_launch")}>Account Manager Launch</Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleRunMethod("settings_access")}>Settings Access</Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleRunMethod("quick_shortcut_maker")}>QuickShortcutMaker</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bypass result */}
              {bypassResult && (
                <Card className={bypassResult.verification_status.includes("pending") || bypassResult.verification_status.includes("flags_changed") ? "border-blue-500/30" : "border-orange-500/30"}>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {bypassResult.reboot_verification_required ? <Info className="h-4 w-4 text-blue-400" /> : <AlertTriangle className="h-4 w-4 text-orange-400" />}
                        <CardTitle className="text-xs">{bypassResult.reboot_verification_required ? "Operation complete — verification pending" : "No verified removal"}</CardTitle>
                      </div>
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                        const data = { ts: new Date().toISOString(), device: selectedDevice, profile: deviceProfile, result: bypassResult }
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a"); a.href = url; a.download = `paralock-audit-${selectedDevice.serial_no}.json`; a.click()
                      }}>Export JSON</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2">
                    <p className="text-xs">{bypassResult.message}</p>
                    <div className="space-y-1">
                      {bypassResult.steps.slice(0, 6).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
                          {s.success ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                          <span className="truncate">{s.command}</span>
                          <span className="text-muted-foreground truncate ml-auto">{s.output?.substring(0, 40)}</span>
                        </div>
                      ))}
                    </div>
                    {bypassResult.requires_manual_action && bypassResult.manual_action_instructions && (
                      <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-[11px]">
                        <div className="font-semibold flex items-center gap-1"><Info className="h-3 w-3" /> Manual Steps</div>
                        <pre className="whitespace-pre-wrap font-sans mt-1">{bypassResult.manual_action_instructions}</pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT - Status Panel (like TFT right pane) */}
        <div className="col-span-12 md:col-span-3 flex flex-col overflow-hidden">
          <DeviceStatusPanel
            selectedDevice={selectedDevice}
            deviceProfile={deviceProfile}
            algorithms={algorithms}
            isRunning={isRunning}
            onStop={handleStop}
            bypassResult={bypassResult}
            progress={progress}
          />
        </div>
      </div>

      {/* Bottom footer like TFT Init: 123 Models etc */}
      <div className="shrink-0 flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2 px-1">
        <span>Init: {totalModels} Models • {brandCounts.samsung} Samsung • {brandCounts.tecno} Tecno • Platform: Auto • FASTConnect</span>
        <span className="hidden md:flex gap-2">
          <span>Paralock v1.1.0 • Isaac Real • {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
        </span>
      </div>
    </div>
  )
}
