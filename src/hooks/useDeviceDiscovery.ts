import { useQuery, useMutation } from '@tanstack/react-query'
import { useAppSettings } from '@/hooks/useAppSettings'
import { usePageVisible, visibleRefetch } from '@/hooks/usePageVisible'
import { 
  listDiscoveredDevices, 
  discoverWirelessDevicesDetailed, 
  connectToDiscoveredDevice,
  DiscoveredDevice,
  DiscoveredWirelessDevice
} from '@/tauri-commands'


export function useUSBDevices() {
  const { getCategory } = useAppSettings()
  const deviceSettings = getCategory('devices')
  const pageVisible = usePageVisible()

  const {
    data: devices = [],
    isLoading: isDiscovering,
    refetch: discoverDevices,
  } = useQuery({
    queryKey: ['usb-devices'],
    queryFn: async (): Promise<DiscoveredDevice[]> => {
      const discoveredDevices = await listDiscoveredDevices()
      return discoveredDevices.filter(d => 'USB' in d.connection_method)
    },
    enabled: deviceSettings.autoDiscoverUSB,
    refetchInterval: visibleRefetch(deviceSettings.autoRefresh ? deviceSettings.pollingInterval * 1000 : false, pageVisible),
    refetchOnWindowFocus: false,
    staleTime: 5 * 1000, // 5 seconds
  })

  return {
    devices,
    isDiscovering,
    discoverDevices,
  }
}

export function useWirelessDevices() {
  const { getCategory } = useAppSettings()
  const deviceSettings = getCategory('devices')
  const pageVisible = usePageVisible()

  const {
    data: devices = [],
    isLoading: isDiscovering,
    refetch: discoverDevices,
  } = useQuery({
    queryKey: ['wireless-devices'],
    queryFn: async (): Promise<DiscoveredWirelessDevice[]> => {
      return await discoverWirelessDevicesDetailed()
    },
    enabled: deviceSettings.autoDiscoverWireless,
    refetchInterval: visibleRefetch(deviceSettings.autoDiscoverWireless ? deviceSettings.wirelessDiscoveryInterval * 1000 : false, pageVisible),
    refetchOnWindowFocus: false,
    staleTime: 5 * 1000, // 5 seconds
  })

  return {
    devices,
    isDiscovering,
    discoverDevices,
  }
}

export function useDeviceConnection() {
  const {
    mutate: connectToDevice,
    isPending: isConnecting,
    data,
    error,
  } = useMutation({
    mutationFn: async (device: DiscoveredDevice) => {
      return await connectToDiscoveredDevice(device)
    },
    onError: (error) => {
      console.error('Failed to connect to device:', error)
    },
  })

  return {
    connectToDevice,
    isConnecting,
    data,
    error,
  }
}