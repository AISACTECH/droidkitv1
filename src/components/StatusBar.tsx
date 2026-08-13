import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { DeviceInfo } from "@/tauri-commands"
import { useDeviceBatteryInfo } from "@/hooks/useSystemInfo"
import { 
  Wifi, 
  Usb, 
  Download, 
  Upload, 
  Activity,
  CheckCircle,
  AlertCircle,
  PanelLeft,
  Battery,
  Heart,
  Cpu,
  Layers
} from "lucide-react"
import { useEffect, useState } from "react"

interface StatusBarProps {
  selectedDevice?: DeviceInfo
  isLoading?: boolean
  onToggleSidebar?: () => void
}

interface Operation {
  id: string
  type: 'download' | 'upload' | 'install'
  description: string
  progress: number
  status: 'running' | 'completed' | 'error'
}

export function StatusBar({ selectedDevice, isLoading, onToggleSidebar }: StatusBarProps) {
  const { data: batteryInfo } = useDeviceBatteryInfo(selectedDevice)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const activeOperations: Operation[] = []

  const getConnectionQuality = () => {
    if (!selectedDevice) return null
    if (selectedDevice.transport === 'USB') {
      return { level: 'excellent', strength: 100, icon: Usb, color: 'text-green-500' }
    } else {
      const strength = Math.floor(Math.random() * 40) + 60
      const level = strength > 80 ? 'excellent' : strength > 60 ? 'good' : 'fair'
      const color = strength > 80 ? 'text-green-500' : strength > 60 ? 'text-yellow-500' : 'text-orange-500'
      return { level, strength, icon: Wifi, color }
    }
  }

  const connectionQuality = getConnectionQuality()

  return (
    <div className="border-t bg-background/95 backdrop-blur-sm px-3 py-1.5 flex items-center justify-between text-xs h-(--statusbar-height) shrink-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="h-6 w-6 p-0">
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* TFT-inspired Init Models count */}
        <div className="hidden lg:flex items-center gap-2 text-[11px]">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <Layers className="h-3 w-3" /> Init: 268 Models
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <Cpu className="h-3 w-3" /> B450M PRO-VDH MAX
          </Badge>
        </div>

        {selectedDevice && connectionQuality && (
          <div className="flex items-center gap-1.5 min-w-0">
            <connectionQuality.icon className={`h-3.5 w-3.5 ${connectionQuality.color} flex-shrink-0`} />
            <span className="text-muted-foreground truncate max-w-[120px]">{selectedDevice.model}</span>
            {selectedDevice.transport === 'TCP' && (
              <Badge variant="outline" className="text-xs px-1 py-0">{connectionQuality.strength}%</Badge>
            )}
          </div>
        )}

        {activeOperations.map((operation) => (
          <div key={operation.id} className="flex items-center gap-1.5 min-w-0">
            {operation.type === 'download' && <Download className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />}
            {operation.type === 'upload' && <Upload className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
            {operation.type === 'install' && <Activity className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />}
            {operation.status === 'running' && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Progress value={operation.progress} className="w-16 h-1.5" />
                <span className="text-xs text-muted-foreground">{operation.progress}%</span>
              </div>
            )}
            {operation.status === 'completed' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
            {operation.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 animate-spin text-blue-500" />
            <span className="text-muted-foreground">Loading</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
        {selectedDevice && (
          <>
            {batteryInfo && batteryInfo.level !== undefined && (
              <div className="flex items-center gap-1">
                <Battery className={`h-3.5 w-3.5 ${batteryInfo.level <= 20 ? 'text-red-500' : batteryInfo.level <= 50 ? 'text-yellow-500' : 'text-green-500'}`} />
                <span className="text-xs">{batteryInfo.level}%</span>
              </div>
            )}
            <span className="hidden sm:inline">Android {selectedDevice.android_version}</span>
            <span className="sm:hidden">API {selectedDevice.sdk_version}</span>
            <span className="hidden md:inline">API {selectedDevice.sdk_version}</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0">{selectedDevice.transport}</Badge>
          </>
        )}

        {/* TFT-inspired footer right side — original design not copy */}
        <div className="hidden xl:flex items-center gap-2 ml-2 pl-2 border-l">
          <span className="flex items-center gap-1 text-[11px]">
            <Heart className="h-3 w-3 text-red-400" /> Donate
          </span>
          <span className="text-[10px]">Paralock v1.1.0 • {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Isaac Real</span>
          <Badge variant="outline" className="text-[10px]">Microsoft Windows 11 Home</Badge>
        </div>
        <div className="flex xl:hidden items-center gap-1 text-[10px]">
          <span>v1.0.0</span>
          <span>•</span>
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  )
}
