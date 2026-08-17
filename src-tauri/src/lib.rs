use crate::adb_commands::device::{
    DeviceInfo, DiscoveredDevice, connect_tcp_device, connect_to_discovered_device,
    get_connected_device, list_discovered_devices, pair_device_with_code, reconnect_device,
};
use crate::adb_commands::discovery::{
    DiscoveredWirelessDevice, discover_wireless_devices, discover_wireless_devices_detailed,
    get_connection_port_for_device,
};
use crate::adb_commands::files::{FileInfo, list_files, pull_file};
use crate::adb_commands::logcat::{
    execute_shell_command, get_device_info, get_device_model, get_logcat_output,
};
use crate::adb_commands::packages::get_installed_packages;
use crate::adb_commands::pairing::{
    PairingData, PairingResult, generate_pairing_data, start_pairing_listener,
};
use crate::emulator::{get_android_home, launch_avd, list_avds};
use crate::system_info::{
    BatteryInfo, BuildInfo, DisplayInfo, HardwareInfo, NetworkInfo, get_battery_info,
    get_build_info, get_display_info, get_hardware_info, get_network_info,
};
use std::net::IpAddr;

mod adb_commands;
mod emulator;
mod fastboot;
mod frp;
mod operation_safety;
mod screen_mirror;
mod service_preflight;
mod system_info;
mod utils;

#[tauri::command]
async fn device_info() -> Result<DeviceInfo, ()> {
    get_connected_device()
        .and_then(|mut device| get_device_info(&mut device).ok())
        .ok_or(())
}

#[tauri::command]
async fn get_android_sdk_path() -> Option<String> {
    get_android_home().map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_available_avds() -> Vec<String> {
    list_avds()
}

#[tauri::command]
async fn start_avd(avd_name: String) -> Result<(), String> {
    launch_avd(&avd_name)
}

#[tauri::command]
async fn browse_files(path: String) -> Result<Vec<FileInfo>, String> {
    get_connected_device()
        .ok_or_else(|| "No device connected".to_string())
        .and_then(|mut device| list_files(&mut device, &path))
}

#[tauri::command]
async fn browse_files_for_device(device_serial: String, path: String) -> Result<Vec<FileInfo>, String> {
    reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())
        .and_then(|mut device| list_files(&mut device, &path))
}

#[tauri::command]
async fn download_file(remote_path: String, local_path: String) -> Result<(), String> {
    get_connected_device()
        .ok_or_else(|| "No device connected".to_string())
        .and_then(|mut device| pull_file(&mut device, &remote_path, &local_path))
}

#[tauri::command]
async fn get_apps() -> Result<Vec<String>, String> {
    get_connected_device()
        .ok_or_else(|| "No device connected".to_string())
        .and_then(|mut device| get_installed_packages(&mut device))
}

#[tauri::command]
async fn get_apps_for_device(device_serial: String) -> Result<Vec<String>, String> {
    reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())
        .and_then(|mut device| get_installed_packages(&mut device))
}

#[tauri::command]
async fn get_logcat(lines: u32, on_event: tauri::ipc::Channel<Result<String, String>>) {
    match get_connected_device() {
        Some(mut device) => {
            // Run logcat in a separate thread to avoid blocking
            std::thread::spawn(move || {
                let result = get_logcat_output(&mut device, lines, None);
                let _ = on_event.send(result);
            });
        }
        None => {
            let _ = on_event.send(Err("No device connected".to_string()));
        }
    }
}

#[tauri::command]
async fn get_logcat_for_device(
    device_serial: String,
    lines: u32,
    log_level: Option<String>,
    on_event: tauri::ipc::Channel<Result<String, String>>,
) {
    match reconnect_device(&device_serial) {
        Some(mut device) => {
            // Run logcat in a separate thread to avoid blocking
            std::thread::spawn(move || {
                let result = get_logcat_output(&mut device, lines, log_level);
                let _ = on_event.send(result);
            });
        }
        None => {
            let _ = on_event.send(Err("Failed to connect to device".to_string()));
        }
    }
}

#[tauri::command]
async fn connect_wireless_device(ip: String, port: u16) -> Result<DeviceInfo, String> {
    let ip_addr: IpAddr = ip
        .parse()
        .map_err(|_| "Invalid IP address format".to_string())?;

    connect_tcp_device(ip_addr, port)
        .ok_or_else(|| "Failed to connect to device".to_string())
        .and_then(|mut device| {
            let mut device_info = get_device_info(&mut device)
                .map_err(|_| "Failed to get device info".to_string())?;
            // Override the serial number with IP:port format for easy reconnection
            device_info.serial_no = format!("{}:{}", ip, port);
            Ok(device_info)
        })
}

#[tauri::command]
async fn pair_wireless_device(ip: String, port: u16, pairing_code: String) -> Result<DeviceInfo, String> {
    let ip_addr: IpAddr = ip
        .parse()
        .map_err(|_| "Invalid IP address format".to_string())?;

    // First, pair the device using the pairing port
    pair_device_with_code(ip_addr, port, &pairing_code)?;

    // After successful pairing, find the actual connection port for this device
    let connection_port = get_connection_port_for_device(&ip);

    println!(
        "Attempting to connect to paired device on port {}",
        connection_port
    );

    connect_tcp_device(ip_addr, connection_port)
        .ok_or_else(|| format!("Failed to connect to paired device on port {}. The device may not be advertising a connection service or wireless debugging may have been disabled.", connection_port))
        .and_then(|mut device| {
            let mut device_info = get_device_info(&mut device).map_err(|_| "Failed to get device info".to_string())?;
            // Override the serial number with IP:connection_port format for easy reconnection
            device_info.serial_no = format!("{}:{}", ip, connection_port);
            Ok(device_info)
        })
}

#[tauri::command]
async fn get_pairing_qr_data() -> Result<PairingData, String> {
    generate_pairing_data()
}

#[tauri::command]
async fn start_qr_pairing(pairing_code: String) -> Result<PairingResult, String> {
    let result = start_pairing_listener(pairing_code, 60)?;
    Ok(PairingResult {
        success: result.success,
        message: result.message,
        device_ip: result.device_ip,
        device_port: result.device_port,
    })
}

#[tauri::command]
async fn discover_devices() -> Result<Vec<String>, String> {
    discover_wireless_devices().map(|devices| {
        devices
            .into_iter()
            .map(|device| format!("{} - {:?}", device.fullname, device.addresses))
            .collect()
    })
}

#[tauri::command]
async fn list_discovered_devices_cmd() -> Result<Vec<DiscoveredDevice>, String> {
    list_discovered_devices()
}

#[tauri::command]
async fn discover_wireless_devices_detailed_cmd() -> Result<Vec<DiscoveredWirelessDevice>, String> {
    discover_wireless_devices_detailed()
}

#[tauri::command]
async fn connect_to_discovered_device_cmd(device: DiscoveredDevice) -> Result<DeviceInfo, String> {
    connect_to_discovered_device(&device).and_then(|mut device| {
        get_device_info(&mut device).map_err(|_| "Failed to get device info".to_string())
    })
}

#[tauri::command]
async fn execute_shell_command_cmd(device_serial: String, command: String) -> Result<String, String> {
    reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())
        .and_then(|mut device| execute_shell_command(&mut device, &command))
}

/// Prepare a destructive operation in the Rust trust boundary.
///
/// The permit is short-lived, one-use, and bound to the exact operation,
/// connected serial and model. Read-only commands never need a permit.
#[tauri::command]
async fn prepare_destructive_operation(
    device_serial: String,
    expected_model: String,
    operation: String,
    ownership_confirmed: bool,
    backup_confirmed: bool,
    typed_confirmation: String,
) -> Result<operation_safety::OperationPermit, String> {
    let actual_model = if operation.starts_with("fastboot_") {
        if !fastboot::fastboot_serial_present(&device_serial)? {
            return Err("The selected fastboot serial is not connected".to_string());
        }
        fastboot::fastboot_product(&device_serial)?
    } else {
        let mut device = reconnect_device(&device_serial)
            .ok_or_else(|| "Failed to connect to the selected authorized device".to_string())?;
        get_device_model(&mut device)
            .ok_or_else(|| "Connected device did not report a model identity".to_string())?
    };

    operation_safety::issue_permit(
        &operation,
        &device_serial,
        &actual_model,
        &expected_model,
        ownership_confirmed,
        backup_confirmed,
        &typed_confirmation,
    )
}

#[tauri::command]
async fn get_device_hardware_info_cmd(device_serial: String) -> Result<HardwareInfo, String> {
    let device_serial_clone = device_serial.clone();
    tokio::task::spawn_blocking(move || {
        reconnect_device(&device_serial_clone)
            .ok_or_else(|| "Failed to connect to device".to_string())
            .map(|mut device| get_hardware_info(&mut device))
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

#[tauri::command]
async fn get_device_display_info_cmd(device_serial: String) -> Result<DisplayInfo, String> {
    let device_serial_clone = device_serial.clone();
    tokio::task::spawn_blocking(move || {
        reconnect_device(&device_serial_clone)
            .ok_or_else(|| "Failed to connect to device".to_string())
            .map(|mut device| get_display_info(&mut device))
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

#[tauri::command]
async fn get_device_battery_info_cmd(device_serial: String) -> Result<Option<BatteryInfo>, String> {
    let device_serial_clone = device_serial.clone();
    tokio::task::spawn_blocking(move || {
        reconnect_device(&device_serial_clone)
            .ok_or_else(|| "Failed to connect to device".to_string())
            .map(|mut device| get_battery_info(&mut device))
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

#[tauri::command]
async fn get_device_build_info_cmd(device_serial: String) -> Result<BuildInfo, String> {
    let device_serial_clone = device_serial.clone();
    tokio::task::spawn_blocking(move || {
        reconnect_device(&device_serial_clone)
            .ok_or_else(|| "Failed to connect to device".to_string())
            .map(|mut device| get_build_info(&mut device))
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

#[tauri::command]
async fn get_device_network_info_cmd(device_serial: String) -> Result<NetworkInfo, String> {
    let device_serial_clone = device_serial.clone();
    tokio::task::spawn_blocking(move || {
        reconnect_device(&device_serial_clone)
            .ok_or_else(|| "Failed to connect to device".to_string())
            .map(|mut device| get_network_info(&mut device))
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            device_info,
            get_android_sdk_path,
            get_available_avds,
            start_avd,
            browse_files,
            browse_files_for_device,
            download_file,
            get_apps,
            get_apps_for_device,
            get_logcat,
            get_logcat_for_device,
            connect_wireless_device,
            pair_wireless_device,
            get_pairing_qr_data,
            start_qr_pairing,
            discover_devices,
            list_discovered_devices_cmd,
            discover_wireless_devices_detailed_cmd,
            connect_to_discovered_device_cmd,
            execute_shell_command_cmd,
            prepare_destructive_operation,
            service_preflight::service_environment_preflight,
            get_device_hardware_info_cmd,
            get_device_display_info_cmd,
            get_device_battery_info_cmd,
            get_device_build_info_cmd,
            get_device_network_info_cmd,
            // FRP Removal commands
            frp::commands::frp_detect,
            frp::commands::frp_run_method,
            frp::commands::frp_auto_bypass,
            frp::commands::frp_get_device_database,
            frp::commands::frp_lookup_model,
            frp::commands::frp_search_models,
            frp::commands::frp_list_supported_models,
            frp::commands::frp_get_all_methods,
            // Universal FRP Algorithm commands
            frp::commands::frp_detect_chipset,
            frp::commands::frp_build_device_profile,
            frp::commands::frp_get_recommended_algorithm,
            frp::commands::frp_get_chipset_algorithms,
            frp::commands::frp_get_reset_modes,
            frp::commands::frp_get_algorithm_phases,
            // Tecno FRP commands
            frp::commands::frp_get_tecno_database,
            frp::commands::frp_lookup_tecno_model,
            frp::commands::frp_search_tecno_models,
            frp::commands::frp_list_tecno_models,
            frp::commands::frp_get_tecno_by_series,
            frp::commands::frp_get_tecno_by_chipset,
            frp::commands::frp_get_tecno_methods,
            // Q4 FRP commands
            frp::commands::frp_get_q4_database,
            frp::commands::frp_search_q4_models,
            frp::commands::frp_get_q4_by_brand,
            // Q2 Transsion (Infinix, Itel) commands
            frp::commands::frp_get_infinix_database,
            frp::commands::frp_search_infinix_models,
            frp::commands::frp_get_infinix_by_series,
            frp::commands::frp_get_itel_database,
            frp::commands::frp_search_itel_models,
            frp::commands::frp_get_itel_by_series,
            // Q3 FRP commands
            frp::commands::frp_get_q3_database,
            frp::commands::frp_search_q3_models,
            frp::commands::frp_get_q3_by_brand,
            // Advanced Reset & Knox Removal (confirmed features)
            frp::commands::frp_execute_reset_mode,
            frp::commands::frp_remove_knox,
            frp::commands::frp_verify_handshake,
            // Adaptive Engine — read-only partition survey
            frp::commands::frp_partition_survey,
            // Fastboot support — for damaged charger port data system, supports phone via fastboot mode
            fastboot::fastboot_list_devices,
            fastboot::fastboot_reboot_to_bootloader,
            fastboot::fastboot_reboot_to_system,
            fastboot::fastboot_oem_unlock,
            fastboot::fastboot_getvar_all,
            fastboot::fastboot_erase_frp,
            fastboot::fastboot_check_availability,
            // Screen Mirror — reflection window where phone screen reflected, control via cursor for broken touch sensor
            screen_mirror::capture_screen_frame,
            screen_mirror::capture_screen_via_file,
            screen_mirror::send_tap_via_cursor,
            screen_mirror::send_swipe_via_cursor,
            screen_mirror::send_text_via_adb,
            screen_mirror::send_keyevent_via_cursor,
            screen_mirror::start_mirror_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
