# RFC — Native Modem Serial Backend (USB-handshake autofire)

**Status:** Proposal, ready to implement (needs a bench session with the Rust
toolchain — deliberately NOT merged blind, same discipline as
RFC-MTK-BROM-BACKEND). **Frontend status: DONE** — `src/lib/modem-session.ts`
+ the Modem lane Auto-Session card already contain the full workflow; they
probe for `modem_list_ports` and run in guided mode until this backend
exists. **Zero frontend edits needed after this backend lands.**

## Why native

The Auto-Session currently hands commands to a human terminal. With a serial
backend the app can itself: enumerate COM/tty ports → open the modem's port
→ run the read-only diagnosis chain → present attempts/IMEI/model → and,
only after the human confirmation checkbox, send the ONE entry command.
That is the difference between "guided" and "plug in and follow the green
lights".

## Safety contract (hard requirements, matching frontend interlocks I1–I5)

1. **Read/write allowlist.** The backend accepts ONLY: the read-only set
   (`AT`, `ATI`, `AT+CGSN`, `AT+CSQ`, `AT+CPIN?`, `AT^CARDLOCK?`,
   `AT+CLCK="PN",2`) plus exactly ONE entry form `AT^CARDLOCK="<8 digits>"`.
   Regex-enforced server-side: `^AT\^CARDLOCK="\d{8}"$`. Nothing else. Ever.
2. **One entry per port-open session.** The backend refuses a second
   `AT^CARDLOCK="..."` on the same open port unless the human re-opens and
   re-confirms. Attempt counters are one-way physics; the code must act
   like it.
3. **No IMEI writes.** `AT+CGSN` is read-only here; there is no write path
   (illegal in Kenya, and everywhere sane).
4. **Audit log.** Every line TX/RX is appended to a session journal with
   timestamps (the app's Patch Oracle bench log can import it).

## Proposed Rust shape (serialport 2.x)

`src-tauri/Cargo.toml`:
```toml
serialport = "4"
```

`src-tauri/src/modem.rs` (new, isolated — failure here cannot touch frp/adb):
```rust
// skeleton — API-verified at bench session before wiring
use serialport::SerialPort;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

pub struct ModemState(pub Mutex<Option<Box<dyn SerialPort>>>);

#[tauri::command]
pub fn modem_list_ports() -> Result<Vec<String>, String> {
    serialport::available_ports()
        .map(|ps| ps.into_iter().map(|p| p.port_name).collect())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn modem_open(state: State<ModemState>, port: String) -> Result<(), String> {
    let p = serialport::new(&port, 115_200)
        .timeout(Duration::from_millis(1200))
        .open().map_err(|e| e.to_string())?;
    *state.0.lock().map_err(|_| "state poisoned")? = Some(p);
    Ok(())
}

#[tauri::command]
pub fn modem_at(state: State<ModemState>, cmd: String) -> Result<String, String> {
    // allowlist enforcement lives HERE (see safety contract)
    const READONLY: [&str; 7] = ["AT", "ATI", "AT+CGSN", "AT+CSQ", "AT+CPIN?", "AT^CARDLOCK?", "AT+CLCK=\"PN\",2];
    let entry_ok = regex_lite_match_cardlock_digits(&cmd); // ^AT\^CARDLOCK="\d{8}"$
    if !(READONLY.contains(&cmd.as_str()) || entry_ok) { return Err("not on allowlist".into()); }
    // TODO: one-entry-per-open enforcement + TX/RX journal
    let mut guard = state.0.lock().map_err(|_| "state poisoned")?;
    let port = guard.as_mut().ok_or("no port open")?;
    port.write_all(format!("{cmd}\r").as_bytes()).map_err(|e| e.to_string())?;
    let mut buf = [0u8; 4096];
    // read-until-timeout; OK/ERROR terminated
    let mut out = Vec::new();
    loop {
        match port.read(&mut buf) {
            Ok(n) if n > 0 => { out.extend_from_slice(&buf[..n]);
                if out.windows(4).any(|w| w == b"\r\nOK" ) || out.ends_with(b"OK\r\n") { break } }
            Ok(_) => break,
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => break,
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(String::from_utf8_lossy(&out).to_string())
}
```

`src-tauri/src/lib.rs`: `pub mod modem;` + `.manage(modem::ModemState(Default::default()))`
+ register `modem::modem_list_ports, modem::modem_open, modem::modem_at` in
`invoke_handler`.

## Verification plan (bench session, in order)

1. `cargo check` — API correctness (the sandbox couldn't compile this;
   CI/bench machine can).
2. Unit: allowlist rejects `AT+CFUN`, accepts the two shapes above.
3. Hardware: any Huawei dongle in a Linux/Windows port → `AT` → `OK`;
   `AT^CARDLOCK?` parses attempts; a DONOR unit gets the full flow exactly
   once; log imported to Patch Oracle bench log.
4. Then, and only then, flip a calibration note: Auto-Session guided → native.

## Deliberately out of scope

Huawei v4/v5 (Balong V7, ~2017+) unlock computation — those codes are NOT
publicly computable from the IMEI; anyone claiming a local v4/v5 calculator
is misrepresenting. Those devices → verified IMEI service or the documented
boot-pin firmware route (E5573Cs family), both already in the lane.
