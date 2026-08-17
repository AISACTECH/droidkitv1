import { Input } from "@/components/ui/input"

export interface OperationPreflightState {
  ownershipConfirmed: boolean
  backupConfirmed: boolean
  typedAuthorization: string
}

interface OperationSafetyGateProps extends OperationPreflightState {
  deviceSerial: string
  onOwnershipChange: (checked: boolean) => void
  onBackupChange: (checked: boolean) => void
  onTypedAuthorizationChange: (value: string) => void
  compact?: boolean
}

export function operationAuthorizationPhrase(deviceSerial: string): string {
  return `AUTHORIZE ${deviceSerial.trim()}`
}

export function isOperationPreflightReady(
  deviceSerial: string,
  state: OperationPreflightState,
): boolean {
  return deviceSerial.trim().length > 0
    && state.ownershipConfirmed
    && state.backupConfirmed
    && state.typedAuthorization.trim() === operationAuthorizationPhrase(deviceSerial)
}

/**
 * Controlled safety gate shared by every mutating FRP surface. The renderer gate
 * is usability feedback only; the Rust backend independently checks the same
 * attestations, verifies serial/model identity, and issues a one-use permit.
 */
export function OperationSafetyGate({
  deviceSerial,
  ownershipConfirmed,
  backupConfirmed,
  typedAuthorization,
  onOwnershipChange,
  onBackupChange,
  onTypedAuthorizationChange,
  compact = false,
}: OperationSafetyGateProps) {
  const phrase = operationAuthorizationPhrase(deviceSerial)
  const ready = isOperationPreflightReady(deviceSerial, {
    ownershipConfirmed,
    backupConfirmed,
    typedAuthorization,
  })

  return (
    <div className={compact ? "space-y-2" : "space-y-2 text-[11px]"} data-testid="operation-safety-gate">
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          aria-label="Confirm ownership or service authorization"
          type="checkbox"
          checked={ownershipConfirmed}
          onChange={event => onOwnershipChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-amber-500"
        />
        <span className={ownershipConfirmed ? "text-foreground" : "text-muted-foreground"}>
          I own this device or have written authorization to service it.
        </span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          aria-label="Confirm backup and recovery path"
          type="checkbox"
          checked={backupConfirmed}
          onChange={event => onBackupChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-amber-500"
        />
        <span className={backupConfirmed ? "text-foreground" : "text-muted-foreground"}>
          I captured available backups and confirmed a matching stock-firmware recovery path.
        </span>
      </label>
      <div className="space-y-1">
        <label htmlFor="operation-authorization" className="text-muted-foreground">
          Type <code className="text-amber-300">{phrase}</code> to bind authorization to this serial:
        </label>
        <Input
          id="operation-authorization"
          aria-label="Serial-bound authorization phrase"
          value={typedAuthorization}
          onChange={event => onTypedAuthorizationChange(event.target.value)}
          placeholder={phrase}
          autoComplete="off"
          spellCheck={false}
          className="h-8 font-mono text-xs"
        />
      </div>
      <div
        role="status"
        data-ready={ready ? "true" : "false"}
        className={ready ? "text-green-400" : "text-amber-300/80"}
      >
        {ready
          ? "Identity pre-flight complete; Rust will verify the connected model before issuing a one-use permit."
          : "Mutating actions remain locked. Read-only scanning stays available."}
      </div>
    </div>
  )
}
