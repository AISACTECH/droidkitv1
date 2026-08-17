use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HostToolStatus {
    pub name: String,
    pub available: bool,
    pub version: Option<String>,
    pub detail: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DriverStatus {
    pub state: String,
    pub detail: String,
    pub detected_markers: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ServiceEnvironment {
    pub operating_system: String,
    pub architecture: String,
    pub adb: HostToolStatus,
    pub fastboot: HostToolStatus,
    pub usb_driver: DriverStatus,
    pub write_operations_ready: bool,
    pub recovery_requirements: Vec<String>,
}

fn command_output(program: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|e| format!("{} is unavailable: {}", program, e))?;
    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
    .trim()
    .to_string();
    if output.status.success() {
        Ok(combined)
    } else {
        Err(if combined.is_empty() {
            format!("{} exited with {}", program, output.status)
        } else {
            combined
        })
    }
}

fn tool_status(name: &str, args: &[&str]) -> HostToolStatus {
    match command_output(name, args) {
        Ok(output) => HostToolStatus {
            name: name.to_string(),
            available: true,
            version: output.lines().next().map(|line| line.trim().to_string()),
            detail: "Executable responded successfully".to_string(),
        },
        Err(error) => HostToolStatus {
            name: name.to_string(),
            available: false,
            version: None,
            detail: error,
        },
    }
}

#[cfg(target_os = "windows")]
fn driver_status() -> DriverStatus {
    let output = command_output("pnputil", &["/enum-devices", "/connected"]).unwrap_or_default();
    let candidates = [
        "android", "samsung", "mediatek", "qualcomm hs-usb", "winusb", "fastboot",
    ];
    let lower = output.to_ascii_lowercase();
    let detected_markers: Vec<String> = candidates
        .iter()
        .filter(|marker| lower.contains(**marker))
        .map(|marker| (*marker).to_string())
        .collect();
    let state = if detected_markers.is_empty() { "not-detected" } else { "detected" };
    DriverStatus {
        state: state.to_string(),
        detail: if detected_markers.is_empty() {
            "No connected Android/WinUSB service marker was found. Install the OEM or Google USB driver, reconnect, and verify in Device Manager; do not disable driver-signature enforcement.".to_string()
        } else {
            "Connected Windows PnP service markers were found. This is discovery evidence only; verify the exact device and mode before writes.".to_string()
        },
        detected_markers,
    }
}

#[cfg(target_os = "linux")]
fn driver_status() -> DriverStatus {
    let rules = [
        "/etc/udev/rules.d/51-android.rules",
        "/lib/udev/rules.d/51-android.rules",
        "/usr/lib/udev/rules.d/51-android.rules",
    ];
    let rule = rules.iter().find(|path| Path::new(path).exists());
    let usb_visible = command_output("lsusb", &[]).is_ok();
    let mut markers = Vec::new();
    if let Some(path) = rule { markers.push(path.to_string()); }
    if usb_visible { markers.push("lsusb".to_string()); }
    DriverStatus {
        state: if rule.is_some() && usb_visible { "configured" } else { "needs-review" }.to_string(),
        detail: if rule.is_some() && usb_visible {
            "udev Android rules and USB enumeration are available. Confirm group permissions and reconnect after any rule change.".to_string()
        } else {
            "Install Android udev rules and libusb tooling, add the service user to the appropriate device-access group, reload udev, then reconnect. Never run the whole desktop app as root.".to_string()
        },
        detected_markers: markers,
    }
}

#[cfg(target_os = "macos")]
fn driver_status() -> DriverStatus {
    let visible = command_output("system_profiler", &["SPUSBDataType"]).is_ok();
    DriverStatus {
        state: if visible { "usb-enumeration-available" } else { "needs-review" }.to_string(),
        detail: "macOS normally uses built-in USB support for ADB/Fastboot. Approve accessory access when prompted and verify the exact serial in the tool output.".to_string(),
        detected_markers: if visible { vec!["system_profiler".to_string()] } else { vec![] },
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
fn driver_status() -> DriverStatus {
    DriverStatus {
        state: "unsupported-host".to_string(),
        detail: "This host platform has no validated driver preflight.".to_string(),
        detected_markers: vec![],
    }
}

/// Read-only host tool/driver preflight. It never installs drivers, modifies the
/// host, starts a flashing protocol, or sends a command to a phone.
#[tauri::command]
pub async fn service_environment_preflight() -> Result<ServiceEnvironment, String> {
    let adb = tool_status("adb", &["version"]);
    let fastboot = tool_status("fastboot", &["--version"]);
    let usb_driver = driver_status();
    let write_operations_ready = adb.available
        && fastboot.available
        && matches!(usb_driver.state.as_str(), "detected" | "configured" | "usb-enumeration-available");

    Ok(ServiceEnvironment {
        operating_system: std::env::consts::OS.to_string(),
        architecture: std::env::consts::ARCH.to_string(),
        adb,
        fastboot,
        usb_driver,
        write_operations_ready,
        recovery_requirements: vec![
            "Record the exact serial, model, bootloader/binary revision and security patch before a write.".to_string(),
            "Capture all readable backups and hashes; keep matching stock firmware offline.".to_string(),
            "Confirm a stable cable, powered USB port and uninterrupted host power.".to_string(),
            "Use signed OEM/Google drivers and tools; never require disabled driver-signature enforcement.".to_string(),
            "After any reboot or mode switch, rediscover the serial instead of assuming the same target remains selected.".to_string(),
        ],
    })
}

#[cfg(test)]
mod tests {
    use super::tool_status;

    #[test]
    fn unavailable_tool_is_a_clean_status_not_a_panic() {
        let status = tool_status("paralock-tool-that-does-not-exist", &["--version"]);
        assert!(!status.available);
        assert!(status.version.is_none());
        assert!(!status.detail.is_empty());
    }
}
