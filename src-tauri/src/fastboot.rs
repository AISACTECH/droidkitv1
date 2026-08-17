use crate::operation_safety::consume_permit;
use serde::{Deserialize, Serialize};
use std::process::Command;

/// Fastboot device info
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FastbootDevice {
    pub serial: String,
    pub status: String,
}

/// Fastboot operation result. `success` means the fastboot process accepted the
/// requested operation; it never means FRP or another device state was verified.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FastbootResult {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
    pub device_serial: Option<String>,
    pub operation_status: String,
    pub verification_required: bool,
}

fn fastboot_available() -> bool {
    Command::new("fastboot").arg("--version").output().is_ok()
}

fn run_fastboot(args: &[&str]) -> Result<String, String> {
    let output = Command::new("fastboot")
        .args(args)
        .output()
        .map_err(|e| {
            format!(
                "fastboot not found or failed to execute: {}. Install Android SDK Platform-Tools.",
                e
            )
        })?;

    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    if output.status.success() {
        Ok(combined)
    } else if args == ["devices"] && combined.trim().is_empty() {
        Ok(String::new())
    } else {
        Err(if combined.trim().is_empty() {
            format!("fastboot exited with status {}", output.status)
        } else {
            combined
        })
    }
}

fn run_fastboot_for(device_serial: &str, args: &[&str]) -> Result<String, String> {
    if device_serial.trim().is_empty() {
        return Err("A target fastboot serial is required".to_string());
    }
    let mut scoped = vec!["-s", device_serial.trim()];
    scoped.extend_from_slice(args);
    run_fastboot(&scoped)
}

fn parse_getvar(output: &str, key: &str) -> Option<String> {
    output.lines().find_map(|line| {
        let clean = line.trim().trim_start_matches("(bootloader)").trim();
        let prefix = format!("{}:", key);
        if clean
            .get(..prefix.len())
            .is_some_and(|head| head.eq_ignore_ascii_case(&prefix))
        {
            Some(clean[prefix.len()..].trim().to_string())
        } else {
            None
        }
    })
}

/// Resolve the model/product reported by a specific fastboot device. Used by the
/// backend permit issuer to bind destructive operations to a checked identity.
pub(crate) fn fastboot_product(device_serial: &str) -> Result<String, String> {
    let output = run_fastboot_for(device_serial, &["getvar", "product"])?;
    parse_getvar(&output, "product")
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "Fastboot device did not report a product/model identity".to_string())
}

pub(crate) fn fastboot_serial_present(device_serial: &str) -> Result<bool, String> {
    Ok(fastboot_list_devices_sync()?
        .iter()
        .any(|device| device.serial == device_serial.trim()))
}

fn fastboot_list_devices_sync() -> Result<Vec<FastbootDevice>, String> {
    let output = run_fastboot(&["devices"])?;
    let devices = output
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with("List") {
                return None;
            }
            let parts: Vec<&str> = line.split_whitespace().collect();
            let serial = parts.first()?.trim();
            if serial.is_empty()
                || serial == "?"
                || serial.contains("daemon")
                || serial.contains("running")
            {
                return None;
            }
            Some(FastbootDevice {
                serial: serial.to_string(),
                status: parts.get(1).copied().unwrap_or("fastboot").to_string(),
            })
        })
        .collect();
    Ok(devices)
}

#[tauri::command]
pub async fn fastboot_list_devices() -> Result<Vec<FastbootDevice>, String> {
    if !fastboot_available() {
        return Ok(Vec::new());
    }
    fastboot_list_devices_sync().or_else(|_| Ok(Vec::new()))
}

/// Reboot a specifically selected ADB device to its bootloader.
#[tauri::command]
pub async fn fastboot_reboot_to_bootloader(
    device_serial: String,
) -> Result<FastbootResult, String> {
    use crate::adb_commands::device::reconnect_device;

    if let Some(mut device) = reconnect_device(&device_serial) {
        let mut buf: Vec<u8> = Vec::new();
        match device.shell_command("reboot bootloader", &mut buf) {
            Ok(_) => Ok(FastbootResult {
                success: true,
                output: String::from_utf8_lossy(&buf).to_string(),
                error: None,
                device_serial: Some(device_serial),
                operation_status: "reboot_requested".to_string(),
                verification_required: true,
            }),
            Err(e) => Err(format!("Failed to reboot to bootloader: {:?}", e)),
        }
    } else {
        Err("Device not connected via authorized ADB. Use a verified USB or wireless ADB connection before rebooting to bootloader.".to_string())
    }
}

#[tauri::command]
pub async fn fastboot_reboot_to_system(
    device_serial: String,
) -> Result<FastbootResult, String> {
    let output = run_fastboot_for(&device_serial, &["reboot"])
        .map_err(|e| format!("Fastboot reboot failed: {}", e))?;
    Ok(FastbootResult {
        success: true,
        output,
        error: None,
        device_serial: Some(device_serial),
        operation_status: "reboot_requested".to_string(),
        verification_required: true,
    })
}

/// Bootloader unlock is destructive and always requires a backend-issued,
/// device-bound, one-use permit.
#[tauri::command]
pub async fn fastboot_oem_unlock(
    device_serial: String,
    permit_token: String,
) -> Result<FastbootResult, String> {
    consume_permit(&permit_token, "fastboot_oem_unlock", &device_serial)?;
    if !fastboot_serial_present(&device_serial)? {
        return Err("Authorized fastboot device is no longer connected".to_string());
    }

    let output = run_fastboot_for(&device_serial, &["flashing", "unlock"])
        .or_else(|first| {
            run_fastboot_for(&device_serial, &["oem", "unlock"])
                .map_err(|_| format!("OEM unlock request failed: {}", first))
        })?;

    Ok(FastbootResult {
        success: true,
        output,
        error: None,
        device_serial: Some(device_serial),
        operation_status: "unlock_requested_unverified".to_string(),
        verification_required: true,
    })
}

#[tauri::command]
pub async fn fastboot_getvar_all(
    device_serial: String,
) -> Result<FastbootResult, String> {
    let output = run_fastboot_for(&device_serial, &["getvar", "all"])
        .map_err(|e| format!("Failed to get fastboot vars: {}", e))?;
    Ok(FastbootResult {
        success: true,
        output,
        error: None,
        device_serial: Some(device_serial),
        operation_status: "read_only_complete".to_string(),
        verification_required: false,
    })
}

/// Request erasure of an explicitly named FRP partition only.
///
/// `persistent`, `persist`, `config`, `metadata` and userdata are deliberately
/// forbidden: they are not safe aliases for FRP and may contain calibration,
/// provisioning, DRM or user state. Command acceptance is returned as
/// `completed_unverified`; the app must reboot and re-detect before reporting a
/// resolved lock state.
#[tauri::command]
pub async fn fastboot_erase_frp(
    device_serial: String,
    partition: String,
    permit_token: String,
) -> Result<FastbootResult, String> {
    consume_permit(&permit_token, "fastboot_erase_frp", &device_serial)?;
    if !fastboot_serial_present(&device_serial)? {
        return Err("Authorized fastboot device is no longer connected".to_string());
    }

    const FRP_ONLY: &[&str] = &["frp", "frp_a", "frp_b"];
    let partition = partition.trim().to_ascii_lowercase();
    if !FRP_ONLY.contains(&partition.as_str()) {
        return Err(format!(
            "Refused unsafe partition '{}'. Only explicit FRP partitions are allowed: {}",
            partition,
            FRP_ONLY.join(", ")
        ));
    }

    // Refuse blind erasure: the bootloader must first acknowledge that this exact
    // partition exists on this exact serial.
    let query = format!("partition-size:{}", partition);
    let query_output = run_fastboot_for(&device_serial, &["getvar", &query])?;
    let size = parse_getvar(&query_output, &query)
        .ok_or_else(|| format!("Bootloader did not confirm partition '{}'; erase refused", partition))?;
    if size == "0" || size.eq_ignore_ascii_case("0x0") {
        return Err(format!("Partition '{}' reports zero size; erase refused", partition));
    }

    let output = run_fastboot_for(&device_serial, &["erase", &partition])?;
    if !output.to_ascii_lowercase().contains("okay") {
        return Err(format!(
            "Fastboot did not return an OKAY acknowledgement for '{}': {}",
            partition, output
        ));
    }

    Ok(FastbootResult {
        success: true,
        output: format!(
            "Fastboot accepted erase for explicit partition '{}' (reported size {}). {}",
            partition, size, output
        ),
        error: None,
        device_serial: Some(device_serial),
        operation_status: "completed_unverified".to_string(),
        verification_required: true,
    })
}

#[tauri::command]
pub async fn fastboot_check_availability() -> Result<FastbootAvailability, String> {
    let fastboot_installed = fastboot_available();
    let devices = if fastboot_installed {
        fastboot_list_devices_sync().unwrap_or_default()
    } else {
        Vec::new()
    };

    Ok(FastbootAvailability {
        fastboot_installed,
        fastboot_version: if fastboot_installed {
            Command::new("fastboot")
                .arg("--version")
                .output()
                .ok()
                .map(|o| {
                    String::from_utf8_lossy(&o.stdout)
                        .lines()
                        .next()
                        .unwrap_or("unknown")
                        .to_string()
                })
                .unwrap_or_else(|| "unknown".to_string())
        } else {
            "not installed".to_string()
        },
        devices_found: devices.len(),
        devices,
        guidance_for_damaged_port: "Fastboot requires working USB data pins. Use authorized wireless ADB only for devices that were paired before the fault. Before any write, verify the exact serial/model, capture recoverable partitions, archive matching stock firmware and confirm the rollback path.".to_string(),
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

#[cfg(test)]
mod tests {
    use super::parse_getvar;

    #[test]
    fn parses_bootloader_getvar_output() {
        let text = "(bootloader) product: a15x\n(bootloader) partition-size:frp: 0x100000\nOKAY";
        assert_eq!(parse_getvar(text, "product").as_deref(), Some("a15x"));
        assert_eq!(
            parse_getvar(text, "partition-size:frp").as_deref(),
            Some("0x100000")
        );
    }
}
