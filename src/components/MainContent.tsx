import { memo } from "react"
import { FileExplorer } from "@/components/views/FileExplorer"
import { AppManager } from "@/components/views/AppManager"
import { LogcatViewer } from "@/components/views/LogcatViewer"
import { DeviceList } from "@/components/DeviceList"
import { SystemInfo } from "@/components/views/system-info"
import { ScreenControl } from "@/components/views/ScreenControl"
import { PerformanceMonitor } from "@/components/views/PerformanceMonitor"
import { ShellTerminal } from "@/components/views/ShellTerminal"
import { FrpRemoval } from "@/components/views/FrpRemoval"
import { DeveloperLab } from "@/components/views/DeveloperLab"
import { AdaptiveEngine } from "@/components/views/AdaptiveEngine"
import { RescueLab } from "@/components/views/RescueLab"
import { HelpCenter } from "@/components/views/HelpCenter"
import { DeviceInfo } from "@/tauri-commands"
import { Button } from "@/components/ui/button"
import { HelpCircle, LifeBuoy, Monitor, Smartphone } from "lucide-react"

interface MainContentProps {
  selectedDevice?: DeviceInfo
  activeView: string
  devices: DeviceInfo[]
  onDeviceSelect: (device: DeviceInfo) => void
  onWirelessDeviceConnected: (device: DeviceInfo) => void
  onViewChange: (view: string) => void
}

export const MainContent = memo(function MainContent({
  selectedDevice,
  activeView,
  devices,
  onDeviceSelect,
  onWirelessDeviceConnected,
  onViewChange
}: MainContentProps) {

  // Help is always available — it exists precisely for the moment
  // when no device connects and the user needs instructions.
  if (activeView === 'help') {
    return (
      <main className="flex-1 p-4 border-t border-l rounded-tl-xl">
        <HelpCenter />
      </main>
    )
  }

  // Rescue Lab is always available — PC / MiFi / button-phone lanes
  // do not need a connected Android phone.
  if (activeView === 'rescue-lab') {
    return (
      <main className="flex-1 p-4 border-t border-l rounded-tl-xl">
        <RescueLab selectedDevice={selectedDevice} />
      </main>
    )
  }

  // Devices view is always available
  if (activeView === 'devices') {
    return (
      <main className="flex-1 p-4 border-t border-l rounded-tl-xl">
        <DeviceList
          connectedDevices={devices}
          selectedDevice={selectedDevice}
          onDeviceSelect={onDeviceSelect}
          onWirelessDeviceConnected={onWirelessDeviceConnected}
          onOpenView={onViewChange}
        />
      </main>
    )
  }

  // Other views require a selected device
  if (!selectedDevice) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground max-w-md">
          <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2 text-foreground">No device selected</h3>
          <p className="text-sm mb-5">
            Connect a phone from Devices to use {activeView} tools. Rescue Lab and Help still work without Android.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => onViewChange('devices')}>
              <Smartphone className="h-4 w-4 mr-1.5" /> Open Devices
            </Button>
            <Button size="sm" variant="outline" onClick={() => onViewChange('rescue-lab')}>
              <LifeBuoy className="h-4 w-4 mr-1.5" /> Rescue Lab
            </Button>
            <Button size="sm" variant="outline" onClick={() => onViewChange('help')}>
              <HelpCircle className="h-4 w-4 mr-1.5" /> Help & Guide
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Render the appropriate view based on activeView
  const renderView = () => {
    switch (activeView) {
      case 'system-info':
        return <SystemInfo selectedDevice={selectedDevice} />
      case 'frp':
        return <FrpRemoval selectedDevice={selectedDevice} />
      case 'frp-lab':
        return <DeveloperLab selectedDevice={selectedDevice} />
      case 'adaptive-engine':
        return <AdaptiveEngine selectedDevice={selectedDevice} />
      case 'files':
        return <FileExplorer selectedDevice={selectedDevice} />
      case 'logcat':
        return <LogcatViewer selectedDevice={selectedDevice} />
      case 'apps':
        return <AppManager selectedDevice={selectedDevice} />
      case 'screen':
        return <ScreenControl selectedDevice={selectedDevice} />
      case 'performance':
        return <PerformanceMonitor selectedDevice={selectedDevice} />
      case 'shell':
        return <ShellTerminal selectedDevice={selectedDevice} />
      default:
        return <SystemInfo selectedDevice={selectedDevice} />
    }
  }

  return (
    <main className="flex-1 p-4 border-t border-l rounded-tl-xl">
      {renderView()}
    </main>
  )
})
