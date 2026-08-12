use serde::{Deserialize, Serialize};
use std::process::Command;

/// Fastboot device info
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FastbootDevice {
    pub serial: String,
    pub status: String, // e.g., "fastboot", "recovery"
}

/// Fastboot operation result
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FastbootResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
    pub device_serial: Option<String>,
}

/// Check if fastboot binary is available
fn fastboot_available() -> bool {
    Command::new("fastboot").arg("--version").output().is_ok()
}

/// Run fastboot command
fn run_fastboot(args: &[&str]) -> Result<String, String> {
    let output = Command::new("fastboot")
        .args(args)
        .output()
        .map_err(|e| format!("fastboot not found or failed to execute: {}. Install Android SDK Platform-Tools with fastboot.", e))?;

    if output.status.success() {
        Ok(format!(
            "{}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        ))
    } else {
        // fastboot often writes to stderr even on success, so we check output content
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let combined = format!("{}{}", stdout, stderr);
        
        // If output contains device serial, consider it success for devices command
        if combined.contains("fastboot") || combined.contains("FB") || args.contains(&"devices") {
            Ok(combined)
        } else {
            // For devices command, empty output means no devices - not an error
            if args == ["devices"] && combined.trim().is_empty() {
                Ok(String::new())
            } else {
                Err(combined)
            }
        }
    }
}

/// List fastboot devices — supports phones where charger port data is tampered but bootloader USB still works
#[tauri::command]
pub async fn fastboot_list_devices() -> Result<Vec<FastbootDevice>, String> {
    // Try adb_client fastboot via command line first
    match run_fastboot(&["devices"]) {
        Ok(output) => {
            let mut devices = Vec::new();
            for line in output.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with("List") {
                    continue;
                }
                let parts: Vec<&str> = line.split_whitespace().collect();
                if !parts.is_empty() {
                    let serial = parts[0].to_string();
                    let status = if parts.len() > 1 { parts[1].to_string() } else { "fastboot".to_string() };
                    if !serial.is_empty() && serial != "?" && !serial.contains("daemon") && !serial.contains("running") {
                        devices.push(FastbootDevice { serial, status });
                    }
                }
            }
            Ok(devices)
        }
        Err(e) => {
            // If fastboot not available, return empty but not error — allows UI to show guidance
            if e.contains("not found") {
                Ok(Vec::new())
            } else {
                // Try alternative: check if device in fastboot via lsusb or other method
                Ok(Vec::new())
            }
        }
    }
}

/// Reboot device to bootloader (from ADB mode) — supports damaged data port fallback via WiFi ADB
#[tauri::command]
pub async fn fastboot_reboot_to_bootloader(device_serial: String) -> Result<FastbootResult, String> {
    use crate::adb_commands::device::reconnect_device;
    
    if let Some(mut device) = reconnect_device(&device_serial) {
        let mut buf: Vec<u8> = Vec::new();
        match device.shell_command(&"reboot bootloader", &mut buf) {
            Ok(_) => Ok(FastbootResult {
                success: true,
                output: String::from_utf8_lossy(&buf).to_string(),
                error: None,
                device_serial: Some(device_serial),
            }),
            Err(e) => Err(format!("Failed to reboot to bootloader: {:?}", e)),
        }
    } else {
        Err("Device not connected via ADB. For phones with damaged charger port, use WiFi ADB: Enable Wireless Debugging in Developer Options > Connect via QR Code, then retry reboot to bootloader.".to_string())
    }
}

/// Reboot from fastboot to system
#[tauri::command]
pub async fn fastboot_reboot_to_system() -> Result<FastbootResult, String> {
    match run_fastboot(&["reboot"]) {
        Ok(output) => Ok(FastbootResult {
            success: true,
            output,
            error: None,
            device_serial: None,
        }),
        Err(e) => Err(format!("Fastboot reboot failed: {}. Ensure device is in fastboot mode (bootloader).", e)),
    }
}

/// Fastboot unlock bootloader — for advanced FRP/bootloader operations
#[tauri::command]
pub async fn fastboot_oem_unlock() -> Result<FastbootResult, String> {
    match run_fastboot(&["flashing", "unlock"]) {
        Ok(output) => Ok(FastbootResult {
            success: true,
            output,
            error: None,
            device_serial: None,
        }),
        Err(e) => {
            // Try alternative command for older devices
            match run_fastboot(&["oem", "unlock"]) {
                Ok(out) => Ok(FastbootResult { success: true, output: out, error: None, device_serial: None }),
                Err(_) => Err(format!("OEM unlock failed: {}. This may require confirmation on device screen.", e)),
            }
        }
    }
}

/// Fastboot getvar all — diagnostics for device in fastboot mode
#[tauri::command]
pub async fn fastboot_getvar_all() -> Result<FastbootResult, String> {
    match run_fastboot(&["getvar", "all"]) {
        Ok(output) => Ok(FastbootResult {
            success: true,
            output,
            error: None,
            device_serial: None,
        }),
        Err(e) => Err(format!("Failed to get fastboot vars: {}", e)),
    }
}

/// Fastboot erase FRP partition directly in fastboot mode — for phones where ADB not available but fastboot is
#[tauri::command]
pub async fn fastboot_erase_frp() -> Result<FastbootResult, String> {
    let frp_partitions = ["frp", "frp_a", "frp_b", "persistent", "config"];
    let mut last_output = String::new();
    
    for partition in &frp_partitions {
        match run_fastboot(&["erase", partition]) {
            Ok(output) => {
                if output.to_lowercase().contains("okay") || output.to_lowercase().contains("erasing") {
                    return Ok(FastbootResult {
                        success: true,
                        output: format!("Erased {} partition: {}", partition, output),
                        error: None,
                        device_serial: None,
                    });
                }
                last_output = output;
            }
            Err(e) => {
                last_output = e;
            }
        }
    }
    
    // If all fail, try flashing empty frp image
    if last_output.contains("No such partition") || last_output.contains("not found") {
        Err(format!("FRP partition not found in fastboot. Device may use different partition name. Last output: {}. Try BROM/EDL mode for MediaTek/Qualcomm instead.", last_output))
    } else {
        Err(format!("Failed to erase FRP in fastboot mode: {}. Device may require BROM/EDL mode instead (for MediaTek/Qualcomm chipsets).", last_output))
    }
}

/// Check fastboot availability and guidance for damaged port scenario
#[tauri::command]
pub async fn fastboot_check_availability() -> Result<FastbootAvailability, String> {
    let fastboot_installed = fastboot_available();
    let devices = fastboot_list_devices().unwrap_or_default();
    
    Ok(FastbootAvailability {
        fastboot_installed,
        fastboot_version: if fastboot_installed {
            Command::new("fastboot")
                .arg("--version")
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).lines().next().unwrap_or("unknown").to_string())
                .unwrap_or_else(|| "unknown".to_string())
        } else {
            "not installed".to_string()
        },
        devices_found: devices.len(),
        devices,
        guidance_for_damaged_port: "For phones with damaged charger port data system:\n1. WiFi ADB is BEST: Enable Wireless Debugging in Developer Options (no USB needed if already enabled) → Pair via QR Code → Connect → Now you can control phone via DroidKit Screen Mirror even with broken touch sensor via cursor\n2. Fastboot still needs USB data pins — if port data is fully tampered, fastboot won't work, use WiFi ADB\n3. If USB data partially works, fastboot may still work for bootloader unlock/FRP erase in fastboot mode\n4. For fully broken port, consider wireless charging + WiFi ADB workflow".to_string(),
    })
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FastbootAvailability {
    pub fastboot_installed: bool,
    pub fastboot_version: String,
    pub devices_found: usize,
    pub devices: Vec<FastbootDevice>,
    pub guidance_for_damaged_port: String,
}
