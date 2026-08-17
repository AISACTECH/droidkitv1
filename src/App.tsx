import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { AppSidebar } from "@/components/AppSidebar"
import { MainContent } from "@/components/MainContent"
import { StatusBar } from "@/components/StatusBar"
import { ThemeProvider } from "@/components/ThemeProvider"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { usePairedDevices } from "@/hooks/usePairedDevices"
import { useConnectedDevices, useAutoReconnect } from "@/hooks/useDeviceQueries"
import { DeviceInfo } from "@/tauri-commands"
import { createLogger } from "@/lib/logger"
import { Skeleton } from "@/components/ui/skeleton"

const logger = createLogger("AppRoot")

function LoadingFallback() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function App() {
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo>()
  const [activeView, setActiveView] = useState('devices')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { devices: pairedDevices, updateLastConnected } = usePairedDevices()
  const { data: devices = [], isLoading, addDevice, refetch } = useConnectedDevices()
  const { tryAutoReconnect } = useAutoReconnect()
  const selectedDeviceRef = useRef(selectedDevice)
  selectedDeviceRef.current = selectedDevice

  const refreshDevices = useCallback(async () => {
    logger.info("Manual refresh triggered")
    await refetch()
  }, [refetch])

  const handleWirelessDeviceConnected = useCallback((device: DeviceInfo) => {
    logger.info("Wireless device connected", { serial: device.serial_no, model: device.model })
    addDevice(device)
    setSelectedDevice((current) => current ?? device)
  }, [addDevice])

  // Stable callback so memoized children (Sidebar/StatusBar) skip re-renders
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open)
  }, [])

  // Auto-select first device if none selected and devices are available
  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      logger.debug("Auto-selecting first device", { count: devices.length })
      setSelectedDevice(devices[0])
    }
  }, [devices, selectedDevice])

  useEffect(() => {
    let cancelled = false
    const initializeApp = async () => {
      try {
        logger.info("Attempting auto-reconnect", { pairedCount: pairedDevices.length })
        const reconnectedDevice = await tryAutoReconnect(pairedDevices, updateLastConnected)
        if (reconnectedDevice && !selectedDeviceRef.current && !cancelled) {
          logger.info("Auto-reconnected", { model: reconnectedDevice.model })
          setSelectedDevice(reconnectedDevice)
        }
      } catch (e) {
        logger.error("Auto-reconnect init failed", e)
      }
    }
    
    if (pairedDevices.length > 0) {
      initializeApp()
    }
    return () => { cancelled = true }
  }, [pairedDevices])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="flex flex-col h-screen [--statusbar-height:calc(--spacing(8))] antialiased">
          <div className="flex-1 overflow-hidden">
            <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <AppSidebar
                onRefreshDevices={refreshDevices}
                onWirelessDeviceConnected={handleWirelessDeviceConnected}
                isLoading={isLoading}
                activeView={activeView}
                onViewChange={setActiveView}
              />
              <SidebarInset className="mr-0! mb-0! rounded-tr-none! bg-background">
                <Suspense fallback={<LoadingFallback />}>
                  <MainContent 
                    selectedDevice={selectedDevice}
                    activeView={activeView}
                    devices={devices}
                    onDeviceSelect={setSelectedDevice}
                    onWirelessDeviceConnected={handleWirelessDeviceConnected}
                    onViewChange={setActiveView}
                  />
                </Suspense>
              </SidebarInset>
            </SidebarProvider>
          </div>
          <StatusBar 
            selectedDevice={selectedDevice} 
            isLoading={isLoading}
            onToggleSidebar={toggleSidebar}
          />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
