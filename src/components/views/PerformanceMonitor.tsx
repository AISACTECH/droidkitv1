import { useState, useEffect } from "react"
import { DeviceInfo, executeShellCommand } from "@/tauri-commands"
import { usePageVisible } from "@/hooks/usePageVisible"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Activity, Cpu, MemoryStick, Battery, RefreshCw, Thermometer, Clock } from "lucide-react"
import { createLogger } from "@/lib/logger"

const logger = createLogger("PerformanceMonitor")

interface PerformanceMonitorProps {
  selectedDevice: DeviceInfo
}

interface PerfStats {
  cpuUsage: number | null
  memory: { total: string; available: string; usedPercent: number }
  battery: { level: number; temp: number; voltage: number; status: string } | null
  uptime: string
  topProcesses: { pid: string; cpu: string; mem: string; name: string }[]
  lastUpdated: string
}

export function PerformanceMonitor({ selectedDevice }: PerformanceMonitorProps) {
  const [stats, setStats] = useState<PerfStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const pageVisible = usePageVisible()

  const fetchStats = async () => {
    setLoading(true)
    try {
      // CPU + memory via dumpsys + cat /proc/stat approximation
      const memInfo = await executeShellCommand(selectedDevice.serial_no, "cat /proc/meminfo | head -n 5").catch(() => "")
      const cpuInfo = await executeShellCommand(selectedDevice.serial_no, "dumpsys cpuinfo | head -n 20").catch(() => "")
      const battery = await executeShellCommand(selectedDevice.serial_no, "dumpsys battery | grep -E 'level|temperature|voltage|status'").catch(() => "")
      const uptime = await executeShellCommand(selectedDevice.serial_no, "uptime").catch(() => "")
      const top = await executeShellCommand(selectedDevice.serial_no, "top -n 1 -b | head -n 15").catch(() => "")

      // Parse meminfo
      let total = "Unknown", available = "Unknown", usedPercent = 0
      const memLines = memInfo.split("\n")
      const totalKb = parseInt(memLines.find(l => l.includes("MemTotal"))?.replace(/[^0-9]/g, "") || "0", 10)
      const availKb = parseInt(memLines.find(l => l.includes("MemAvailable"))?.replace(/[^0-9]/g, "") || `${totalKb * 0.5}`, 10)
      if (totalKb) {
        total = `${(totalKb / 1024 / 1024).toFixed(2)} GB`
        available = `${(availKb / 1024 / 1024).toFixed(2)} GB`
        usedPercent = Math.round(((totalKb - availKb) / totalKb) * 100)
      }

      // Battery
      let batteryParsed: PerfStats["battery"] = null
      if (battery) {
        const lvl = battery.match(/level:\s*(\d+)/)?.[1]
        const temp = battery.match(/temperature:\s*(\d+)/)?.[1]
        const volt = battery.match(/voltage:\s*(\d+)/)?.[1]
        const stat = battery.match(/status:\s*(\d+)/)?.[1]
        batteryParsed = {
          level: lvl ? parseInt(lvl, 10) : 0,
          temp: temp ? parseInt(temp, 10) / 10 : 0,
          voltage: volt ? parseInt(volt, 10) : 0,
          status: stat === "2" ? "Charging" : stat === "5" ? "Full" : "Discharging"
        }
      }

      // CPU from dumpsys only — never invent a random load number
      let cpuUsage: number | null = null
      if (cpuInfo) {
        const loadMatch = cpuInfo.match(/(\d+)%\s*TOTAL/i)
        if (loadMatch) cpuUsage = parseInt(loadMatch[1], 10)
      }

      // Top processes
      const topProcesses = top
        .split("\n")
        .filter(l => l.trim().length > 0)
        .slice(5, 13)
        .map(line => {
          const parts = line.trim().split(/\s+/)
          return {
            pid: parts[0] || "—",
            cpu: parts[2] || "0%",
            mem: parts[5] || "0%",
            name: parts.slice(8).join(" ") || parts[parts.length - 1] || "unknown"
          }
        })
        .filter(p => p.name)

      setStats({
        cpuUsage,
        memory: { total, available, usedPercent },
        battery: batteryParsed,
        uptime: uptime.trim() || "Unknown",
        topProcesses,
        lastUpdated: new Date().toLocaleTimeString()
      })
    } catch (e) {
      logger.error("Failed to fetch performance stats", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    if (!autoRefresh || !pageVisible) return
    const id = setInterval(fetchStats, 8000)
    return () => clearInterval(id)
  }, [selectedDevice.serial_no, autoRefresh, pageVisible])

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5" /> Performance Monitor
          </h2>
          <p className="text-sm text-muted-foreground">Real-time diagnostics for {selectedDevice.model} ({selectedDevice.serial_no})</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={autoRefresh ? "default" : "outline"} className="cursor-pointer" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Clock className="h-3 w-3 mr-1" /> {autoRefresh ? "Auto" : "Manual"}
          </Badge>
          <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {!stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse h-[140px]" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><Cpu className="h-4 w-4" /> CPU Load</CardDescription>
                <CardTitle className="text-3xl">{stats.cpuUsage === null ? "—" : `${stats.cpuUsage}%`}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={stats.cpuUsage ?? 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{stats.uptime}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><MemoryStick className="h-4 w-4" /> Memory</CardDescription>
                <CardTitle className="text-3xl">{stats.memory.usedPercent}% used</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={stats.memory.usedPercent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{stats.memory.total} total</span><span>{stats.memory.available} avail</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><Battery className="h-4 w-4" /> Battery</CardDescription>
                <CardTitle className="text-3xl">{stats.battery?.level ?? "--"}%</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.battery ? (
                  <>
                    <Progress value={stats.battery.level} className="h-2" />
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]"><Thermometer className="h-3 w-3 mr-1" />{stats.battery.temp}°C</Badge>
                      <Badge variant="outline" className="text-[10px]">{stats.battery.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{stats.battery.voltage} mV</Badge>
                    </div>
                  </>
                ) : <p className="text-xs text-muted-foreground">Battery info unavailable</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Processes</CardTitle>
              <CardDescription>Live snapshot from `top` — sorted by CPU</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-4 gap-2 p-2 text-xs font-medium text-muted-foreground border-b bg-muted/40">
                  <span>PID</span><span>CPU</span><span>MEM</span><span>Process</span>
                </div>
                <div className="divide-y max-h-[240px] overflow-y-auto">
                  {stats.topProcesses.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">No process snapshot available from this device.</div>
                  ) : stats.topProcesses.map((p, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 p-2 text-xs font-mono">
                      <span>{p.pid}</span><span>{p.cpu}</span><span>{p.mem}</span><span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="my-3" />
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Transport: {selectedDevice.transport} • API {selectedDevice.sdk_version}</span>
                <span>Updated: {stats.lastUpdated}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
