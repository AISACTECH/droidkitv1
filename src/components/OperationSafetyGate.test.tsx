// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import {
  OperationSafetyGate,
  isOperationPreflightReady,
  operationAuthorizationPhrase,
} from "./OperationSafetyGate"

describe("operation safety gate", () => {
  it("builds a serial-bound exact phrase", () => {
    expect(operationAuthorizationPhrase("  RF8M123  ")).toBe("AUTHORIZE RF8M123")
  })

  it("requires ownership, backup, serial and exact typed confirmation", () => {
    expect(isOperationPreflightReady("RF8M123", {
      ownershipConfirmed: true,
      backupConfirmed: true,
      typedAuthorization: "AUTHORIZE RF8M123",
    })).toBe(true)

    expect(isOperationPreflightReady("RF8M123", {
      ownershipConfirmed: true,
      backupConfirmed: false,
      typedAuthorization: "AUTHORIZE RF8M123",
    })).toBe(false)

    expect(isOperationPreflightReady("RF8M123", {
      ownershipConfirmed: true,
      backupConfirmed: true,
      typedAuthorization: "AUTHORIZE OTHER",
    })).toBe(false)
  })

  it("stays locked until all three controls are completed", () => {
    function Harness() {
      const [ownership, setOwnership] = useState(false)
      const [backup, setBackup] = useState(false)
      const [typed, setTyped] = useState("")
      return (
        <OperationSafetyGate
          deviceSerial="RF8M123"
          ownershipConfirmed={ownership}
          backupConfirmed={backup}
          typedAuthorization={typed}
          onOwnershipChange={setOwnership}
          onBackupChange={setBackup}
          onTypedAuthorizationChange={setTyped}
        />
      )
    }

    render(<Harness />)
    const status = screen.getByRole("status")
    expect(status).toHaveAttribute("data-ready", "false")

    fireEvent.click(screen.getByLabelText("Confirm ownership or service authorization"))
    fireEvent.click(screen.getByLabelText("Confirm backup and recovery path"))
    fireEvent.change(screen.getByLabelText("Serial-bound authorization phrase"), {
      target: { value: "AUTHORIZE RF8M123" },
    })

    expect(status).toHaveAttribute("data-ready", "true")
    expect(status).toHaveTextContent("Rust will verify the connected model")
  })
})
