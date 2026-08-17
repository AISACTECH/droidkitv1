import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  serviceEnvironmentPreflight,
  type ServiceEnvironment,
} from "@/tauri-commands"
import { AlertTriangle, CheckCircle2, HardDrive, RefreshCw, Shield, Usb, Wrench } from "lucide-react"

function ToolRow({ name, available, detail, version }: {
  name: string
  available: boolean
  detail: string
  version?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded border p-2">
      <div>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground">{version || detail}</div>
      </div>
      <Badge variant="outline" className={available ? "text-green-400 border-green-500/30" : "text-amber-400 border-amber-500/30"}>
        {available ? "Available" : "Missing"}
      </Badge>
    </div>
  )
}

export function AdvancedSettings() {
  const [environment, setEnvironment] = useState<ServiceEnvironment | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runPreflight = async () => {
    setChecking(true)
    setError(null)
    try {
      setEnvironment(await serviceEnvironmentPreflight())
    } catch (cause) {
      setError(String(cause))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Service Environment & Recovery</h3>
        <p className="text-sm text-muted-foreground">
          Read-only host checks for Android platform tools, USB driver visibility and the recovery contract required before any device write.
        </p>
      </div>

      <Card className="border-blue-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Usb className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-base">Driver and Platform-Tools Preflight</CardTitle>
            </div>
            {environment && (
              <Badge variant="outline" className={environment.write_operations_ready ? "text-green-400 border-green-500/30" : "text-amber-400 border-amber-500/30"}>
                {environment.write_operations_ready ? "Host ready" : "Needs review"}
              </Badge>
            )}
          </div>
          <CardDescription>
            This check installs nothing and sends no command to a phone. It verifies only host prerequisites.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" onClick={runPreflight} disabled={checking} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking host…" : "Run host preflight"}
          </Button>

          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {environment && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Host: {environment.operating_system} / {environment.architecture}
              </div>
              <ToolRow {...environment.adb} />
              <ToolRow {...environment.fastboot} />
              <div className="rounded border p-2 text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  {environment.usb_driver.state === "detected" || environment.usb_driver.state === "configured" || environment.usb_driver.state === "usb-enumeration-available"
                    ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                    : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  USB driver state: {environment.usb_driver.state}
                </div>
                <p className="text-muted-foreground">{environment.usb_driver.detail}</p>
                {environment.usb_driver.detected_markers.length > 0 && (
                  <div className="font-mono">Markers: {environment.usb_driver.detected_markers.join(", ")}</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-base">Recovery Contract</CardTitle>
          </div>
          <CardDescription>
            Production writes remain locked until these conditions are attested again for the selected serial in the FRP view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {(environment?.recovery_requirements ?? [
              "Record the exact serial, model, bootloader/binary revision and security patch.",
              "Capture all readable backups and hashes; archive matching stock firmware.",
              "Use a stable cable, powered USB port and uninterrupted host power.",
              "Use signed OEM/Google drivers; never disable driver-signature enforcement.",
              "Rediscover the exact serial after every reboot or mode switch.",
            ]).map(requirement => (
              <li key={requirement} className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                <span>{requirement}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <CardTitle className="text-base">Capability Boundary</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>There are no cosmetic “high-speed Brom”, “automatic SLA bypass” or raw payload logging switches.</p>
          <p>EDL, Brom, Odin and SPD cards remain operator runbooks until a separately reviewed, tested and recoverable native backend exists. A runbook progress bar is never reported as protocol execution.</p>
        </CardContent>
      </Card>
    </div>
  )
}
