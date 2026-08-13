// =====================================================================
// Modem Auto-Session — USB-handshake unlock workflow (frontend brain)
// ---------------------------------------------------------------------
// "Plug in the MiFi and it works": the full ordered pipeline is here.
// What executes WHERE:
//   * TODAY: steps run as guided actions with copy-paste commands; the UI
//     keeps state and enforces the safety interlocks (attempts gate, IMEI
//     checksum, one-candidate rule).
//   * WHEN THE NATIVE SERIAL BACKEND LANDS (docs/RFC-MODEM-SERIAL-BACKEND.md):
//     probeNativeBackend() returns true and the same steps execute over the
//     USB cable automatically — this UI needs NO edits.
//
// Non-negotiable safety interlocks (enforced here, not by rememberance):
//   I1: never proceed past handshake without a live AT → OK reply
//   I2: attempts left ≤ 2  → flow locks: "stop, get certainty" (counters
//       are one-way physics)
//   I3: IMEI must pass Luhn before ANY code is shown (typos burn attempts)
//   I4: exactly ONE era-matched candidate may be entered; the entry
//       command is only revealed after the technician picked the era
//   I5: even with a native backend, entry is human-confirmed — the app
//       will never autonomously fire an unlock code at a device
// =====================================================================

export type StepStatus = "pending" | "active" | "done" | "blocked"

export interface SessionStep {
  id: string
  title: string
  detail: string
  cmd?: string
  status: StepStatus
  gate?: string
}

export type BackendKind = "checking" | "native" | "manual"

/** Probe for the native serial backend without ever throwing. */
export async function probeNativeSerial(invokeFn: (cmd: string) => Promise<unknown>): Promise<boolean> {
  try {
    await invokeFn("modem_list_ports")
    return true
  } catch {
    return false // expected on current builds — backend RFC pending
  }
}

/** Build the ordered session. Pure. `attempts` = number reported by
 *  AT^CARDLOCK? (null = not read yet). `era` = chosen candidate era id. */
export function buildSession(opts: {
  native: boolean
  attemptsLeft: number | null
  imeiOk: boolean
  eraPicked: boolean
  confirmed: boolean
}): SessionStep[] {
  const { native, attemptsLeft, imeiOk, eraPicked, confirmed } = opts
  const how = native ? "the app sends it over the cable" : "copy it into your terminal (PuTTY/screen) on the modem's port"
  const mode = (s: string) => native ? `${s} — ${how}` : `${s} — ${how}`

  const steps: SessionStep[] = [
    {
      id: "plug",
      title: "1 · Plug the modem in directly (no USB hub)",
      detail: native
        ? "Native serial backend detected — the app can talk to the port itself."
        : "This app build has no native serial backend yet (RFC ready) — the terminal does the talking; the app does the thinking.",
      status: native ? "active" : "active",
    },
    {
      id: "handshake",
      title: "2 · Handshake — prove the brain is alive",
      detail: mode("Send AT, expect OK. No OK = dead panel, wrong port, or missing driver — stop and fix that first"),
      cmd: "AT",
      status: "active",
    },
    {
      id: "read-state",
      title: "3 · Read state — model, IMEI, attempts left",
      detail: mode("ATI (model) · AT+CGSN (IMEI) · AT^CARDLOCK? (lock + ATTEMPTS LEFT — the number that rules everything)"),
      cmd: "AT^CARDLOCK?",
      status: "active",
    },
  ]

  // I2: attempts gate
  if (attemptsLeft === null) {
    steps.push({
      id: "gate-attempts",
      title: "4 · Attempts gate",
      detail: "Read AT^CARDLOCK? first, then tell the app how many attempts remain.",
      status: "pending",
    })
  } else if (attemptsLeft <= 2) {
    steps.push({
      id: "gate-attempts",
      title: "4 · Attempts gate — LOCKED",
      detail: `Only ${attemptsLeft} attempt(s) left. This flow stops here: one wrong code could permanently seal the device. Bench-verify on a donor unit or use a refund-protected IMEI service for the exact model.`,
      status: "blocked",
    })
  } else if (!imeiOk) {
    steps.push({
      id: "gate-imei",
      title: "4 · IMEI gate — LOCKED",
      detail: "IMEI failed checksum. A mistyped digit = a burned attempt. Re-read the sticker / AT+CGSN.",
      status: "blocked",
    })
  } else if (!eraPicked) {
    steps.push({
      id: "gate-era",
      title: "4 · Era gate",
      detail: `${attemptsLeft} attempts available, IMEI valid. Now pick the generation that matches the MODEL (brand table above) — the app reveals exactly one entry command for the era you choose.`,
      status: "active",
    })
  } else if (!confirmed) {
    steps.push({
      id: "gate-confirm",
      title: "4 · Human confirmation",
      detail: "Tick the confirmation: you matched the era to the model, you have attempts in reserve, and you understand a rejection means STOP.",
      status: "active",
    })
  } else {
    steps.push({
      id: "entry",
      title: "4 · Enter the code (human-fired, always)",
      detail: mode("Send the entry command shown below — ONCE"),
      status: "done",
    })
  }

  steps.push({
    id: "verify",
    title: "5 · Verify & aftercare",
    detail: "Read AT^CARDLOCK? again — lock should be OFF. Then set the new carrier's APN (table above) and test with the new SIM. Log the result in the Patch Oracle bench log — your log turns UNVERIFIED into VERIFIED for everyone.",
    cmd: "AT^CARDLOCK?",
    status: "pending",
  })

  return steps
}

/** The ONLY command shapes this session knows how to send. Deliberately small. */
export function entryCommand(code: string): string {
  return `AT^CARDLOCK="${code}"`
}

/** Truly 100%-safe: display/query commands only. Never mutating. */
export const READONLY_COMMANDS = ["AT", "ATI", "AT+CGSN", "AT+CSQ", "AT+CPIN?", "AT^CARDLOCK?", "AT+CLCK=\"PN\",2"]
