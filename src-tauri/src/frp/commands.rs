use crate::adb_commands::device::{Device, reconnect_device};
use crate::frp::algorithm::{
    ChipsetFamily, DeviceProfile, FrpAlgorithm, FrpResetMode, UniversalFrpResult,
    AdbState, DeviceMode,
};
use crate::frp::bypass::{run_auto_bypass, run_bypass_method, BypassResult};
use crate::frp::database::{
    find_model, get_samsung_database, list_all_models, search_models,
    FrpMethod, SamsungModel,
    find_tecno_model, get_tecno_database, list_all_tecno_models, search_tecno_models,
    get_tecno_by_series, get_tecno_by_chipset_family,
    TecnoModel, TecnoFrpMethod,
};
use crate::frp::infinix_database::{get_infinix_database, search_infinix_models, get_infinix_by_series};
use crate::frp::itel_database::{get_itel_database, search_itel_models, get_itel_by_series};
use crate::frp::q3_database::{get_q3_database, search_q3_models, get_q3_by_brand};
use crate::frp::q4_database::{get_q4_database, search_q4_models, get_q4_by_brand};
use crate::frp::detector::{detect_frp_state, FrpDetectionResult, FrpState};

/// Detect FRP state on a connected device
#[tauri::command]
pub fn frp_detect(device_serial: String) -> Result<FrpDetectionResult, String> {
    let mut device = reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())?;

    Ok(detect_frp_state(&mut device))
}

/// Run a specific FRP bypass method
#[tauri::command]
pub fn frp_run_method(device_serial: String, method_id: String) -> Result<BypassResult, String> {
    let mut device = reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())?;

    let method = parse_method_id(&method_id)
        .ok_or_else(|| format!("Unknown FRP method: {}", method_id))?;

    Ok(run_bypass_method(&mut device, &method))
}

/// Run the automatic FRP bypass sequence (tries safest methods first)
#[tauri::command]
pub fn frp_auto_bypass(device_serial: String) -> Result<BypassResult, String> {
    let mut device = reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())?;

    Ok(run_auto_bypass(&mut device))
}

/// Get the Samsung device compatibility database
#[tauri::command]
pub fn frp_get_device_database() -> Vec<SamsungModel> {
    get_samsung_database()
}

/// Look up a specific Samsung model
#[tauri::command]
pub fn frp_lookup_model(model_code: String) -> Option<SamsungModel> {
    find_model(&model_code)
}

/// Search the Samsung device database
#[tauri::command]
pub fn frp_search_models(query: String) -> Vec<SamsungModel> {
    search_models(&query)
}

/// List all supported Samsung models
#[tauri::command]
pub fn frp_list_supported_models() -> Vec<SamsungModel> {
    list_all_models()
}

/// Get all available FRP methods with their details
#[tauri::command]
pub fn frp_get_all_methods() -> Vec<FrpMethodInfo> {
    let methods = vec![
        FrpMethod::SetupWizardDisable,
        FrpMethod::DeviceProvisioning,
        FrpMethod::ContentProviderBypass,
        FrpMethod::SetupWizardUninstall,
        FrpMethod::BrowserDownloadBypass,
        FrpMethod::AccountManagerLaunch,
        FrpMethod::EmergencyDialerBypass,
        FrpMethod::TalkBackBypass,
        FrpMethod::SimPinBypass,
        FrpMethod::CombinationFirmware,
        FrpMethod::AllianceShieldBypass,
        FrpMethod::HacktmBypass,
        FrpMethod::SmartSwitchBypass,
        FrpMethod::SettingsAccess,
        FrpMethod::QuickShortcutMaker,
    ];

    methods.into_iter().map(|m| FrpMethodInfo {
        id: m.id().to_string(),
        label: m.label().to_string(),
        description: m.description().to_string(),
        risk_level: m.risk_level().label().to_string(),
        is_adb_method: m.is_adb_method(),
        requires_download_mode: m.requires_download_mode(),
    }).collect()
}

// ==================== Universal Algorithm Commands ====================

/// Detect chipset family from device properties
#[tauri::command]
pub fn frp_detect_chipset(device_serial: String) -> Result<ChipsetFamily, String> {
    let mut device = reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())?;

    let hardware = get_prop(&mut device, "ro.hardware");
    let board_platform = get_prop(&mut device, "ro.board.platform");
    let cpu_abi = get_prop(&mut device, "ro.product.cpu.abi");
    let chipname = get_prop(&mut device, "ro.hardware.chipname");

    Ok(ChipsetFamily::detect(
        &hardware,
        &board_platform,
        &cpu_abi,
        &chipname,
    ))
}

/// Build a complete device profile for intelligent method selection
#[tauri::command]
pub fn frp_build_device_profile(device_serial: String) -> Result<DeviceProfile, String> {
    let mut device = reconnect_device(&device_serial)
        .ok_or_else(|| "Failed to connect to device".to_string())?;

    let hardware = get_prop(&mut device, "ro.hardware");
    let board_platform = get_prop(&mut device, "ro.board.platform");
    let cpu_abi = get_prop(&mut device, "ro.product.cpu.abi");
    let chipname = get_prop(&mut device, "ro.hardware.chipname");
    let chipset_family = ChipsetFamily::detect(&hardware, &board_platform, &cpu_abi, &chipname);

    // Detect ADB state — we're connected, so check if authorized
    let adb_state = AdbState::Authorized; // If we got here, ADB is authorized

    let frp_detection = detect_frp_state(&mut device);

    let profile = DeviceProfile {
        brand: get_prop(&mut device, "ro.product.brand"),
        model_code: get_prop(&mut device, "ro.product.model"),
        marketing_name: find_model(&get_prop(&mut device, "ro.product.model"))
            .map(|m| m.marketing_name),
        chipset_family,
        chipset_name: chipname.clone(),
        android_version: get_prop(&mut device, "ro.build.version.release"),
        sdk_version: get_prop(&mut device, "ro.build.version.sdk"),
        security_patch: Some_or_none(get_prop(&mut device, "ro.build.version.security_patch")),
        binary_version: Some_or_none(extract_binary_version(&get_prop(&mut device, "ro.build.display.id"))),
        bootloader_version: Some_or_none(get_prop(&mut device, "ro.bootloader")),
        build_fingerprint: Some_or_none(get_prop(&mut device, "ro.build.fingerprint")),
        knox_version: {
            let knox = get_prop(&mut device, "ro.knox.enhance.ztd");
            if knox.is_empty() {
                Some_or_none(get_prop(&mut device, "ro.build.version.knox"))
            } else {
                Some_or_none(knox)
            }
        },
        frp_state: frp_detection.frp_state,
        adb_state,
        device_mode: DeviceMode::Normal, // We're in ADB, so normal mode
        has_sim: true, // Will be detected separately if needed
        has_wifi: true,
    };

    Ok(profile)
}

/// Get recommended algorithm for a device based on its chipset
#[tauri::command]
pub fn frp_get_recommended_algorithm(chipset: ChipsetFamily) -> FrpAlgorithm {
    chipset.primary_method()
}

/// Get all available algorithms for a chipset, ordered by success rate
#[tauri::command]
pub fn frp_get_chipset_algorithms(chipset: ChipsetFamily) -> Vec<FrpAlgorithmInfo> {
    chipset.available_methods().into_iter().map(|algo| {
        FrpAlgorithmInfo {
            id: algo.id().to_string(),
            label: algo.label().to_string(),
            description: algo.description().to_string(),
            success_rate: algo.success_rate(),
            requires_hardware: algo.requires_hardware(),
            is_adb_only: algo.is_adb_only(),
            requires_boot_mode: algo.requires_boot_mode(),
            phases: algo.phases(),
        }
    }).collect()
}

/// Get available FRP reset modes
#[tauri::command]
pub fn frp_get_reset_modes() -> Vec<FrpResetModeInfo> {
    vec![
        FrpResetMode::FactoryResetRemoveFrp100,
        FrpResetMode::FactoryResetRemoveFrp70,
        FrpResetMode::RemoveFrp100NoWipe,
        FrpResetMode::RemoveFrp70NoWipe,
    ].into_iter().map(|mode| FrpResetModeInfo {
        id: mode.id().to_string(),
        label: mode.label().to_string(),
        description: mode.description().to_string(),
        frp_removal_percent: mode.frp_removal_percent(),
        wipes_data: mode.wipes_data(),
        erases_frp_partition: mode.erases_frp_partition(),
    }).collect()
}

/// Get phases for a specific algorithm
#[tauri::command]
pub fn frp_get_algorithm_phases(algorithm_id: String) -> Vec<crate::frp::algorithm::AlgorithmPhase> {
    let algo = match algorithm_id.as_str() {
        "exynos_download_mode" => Some(FrpAlgorithm::ExynosDownloadMode),
        "qualcomm_edl" => Some(FrpAlgorithm::QualcommEDL),
        "mediatek_brom" => Some(FrpAlgorithm::MediaTekBrom),
        "spd_bootloader" => Some(FrpAlgorithm::SPDBootloader),
        "samsung_test_mode" => Some(FrpAlgorithm::SamsungTestMode),
        "adb_provisioning" => Some(FrpAlgorithm::ADBProvisioning),
        _ => None,
    };
    algo.map(|a| a.phases()).unwrap_or_default()
}

// Helper types for commands

/// Extended algorithm info for the frontend
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct FrpAlgorithmInfo {
    pub id: String,
    pub label: String,
    pub description: String,
    pub success_rate: u8,
    pub requires_hardware: bool,
    pub is_adb_only: bool,
    pub requires_boot_mode: bool,
    pub phases: Vec<crate::frp::algorithm::AlgorithmPhase>,
}

/// Reset mode info for the frontend
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct FrpResetModeInfo {
    pub id: String,
    pub label: String,
    pub description: String,
    pub frp_removal_percent: u8,
    pub wipes_data: bool,
    pub erases_frp_partition: bool,
}

// Helper functions

fn get_prop(device: &mut Device, prop: &str) -> String {
    let mut buf: Vec<u8> = Vec::new();
    match device.shell_command(&format!("getprop {}", prop), &mut buf) {
        Ok(_) => String::from_utf8_lossy(&buf).trim().to_string(),
        Err(_) => String::new(),
    }
}

fn Some_or_none(s: String) -> Option<String> {
    if s.is_empty() { None } else { Some(s) }
}

fn extract_binary_version(build_id: &str) -> String {
    // Samsung build IDs typically contain the binary version like "A055FXXU4XXX"
    // The U number (U4) is the binary version
    if let Some(u_pos) = build_id.find('U') {
        if u_pos + 1 < build_id.len() {
            let digit = build_id.chars().nth(u_pos + 1).unwrap_or('1');
            return format!("U{}", digit);
        }
    }
    "U1".to_string()
}

/// Extended method info for the frontend
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct FrpMethodInfo {
    pub id: String,
    pub label: String,
    pub description: String,
    pub risk_level: String,
    pub is_adb_method: bool,
    pub requires_download_mode: bool,
}

fn parse_method_id(id: &str) -> Option<FrpMethod> {
    match id {
        "setup_wizard_disable" => Some(FrpMethod::SetupWizardDisable),
        "device_provisioning" => Some(FrpMethod::DeviceProvisioning),
        "content_provider_bypass" => Some(FrpMethod::ContentProviderBypass),
        "setup_wizard_uninstall" => Some(FrpMethod::SetupWizardUninstall),
        "browser_download_bypass" => Some(FrpMethod::BrowserDownloadBypass),
        "account_manager_launch" => Some(FrpMethod::AccountManagerLaunch),
        "emergency_dialer_bypass" => Some(FrpMethod::EmergencyDialerBypass),
        "talkback_bypass" => Some(FrpMethod::TalkBackBypass),
        "sim_pin_bypass" => Some(FrpMethod::SimPinBypass),
        "combination_firmware" => Some(FrpMethod::CombinationFirmware),
        "alliance_shield_bypass" => Some(FrpMethod::AllianceShieldBypass),
        "hacktm_bypass" => Some(FrpMethod::HacktmBypass),
        "smart_switch_bypass" => Some(FrpMethod::SmartSwitchBypass),
        "settings_access" => Some(FrpMethod::SettingsAccess),
        "quick_shortcut_maker" => Some(FrpMethod::QuickShortcutMaker),
        _ => None,
    }
}

// ==================== Tecno FRP Commands ====================

/// Get the full Tecno device compatibility database
#[tauri::command]
pub fn frp_get_tecno_database() -> Vec<TecnoModel> {
    get_tecno_database()
}

/// Look up a specific Tecno model by marketing name
#[tauri::command]
pub fn frp_lookup_tecno_model(name: String) -> Option<TecnoModel> {
    find_tecno_model(&name)
}

/// Search the Tecno device database
#[tauri::command]
pub fn frp_search_tecno_models(query: String) -> Vec<TecnoModel> {
    search_tecno_models(&query)
}

/// List all supported Tecno models
#[tauri::command]
pub fn frp_list_tecno_models() -> Vec<TecnoModel> {
    list_all_tecno_models()
}

/// Get Tecno models filtered by series (Pop, Spark, Camon, Pova, Phantom)
#[tauri::command]
pub fn frp_get_tecno_by_series(series: String) -> Vec<TecnoModel> {
    get_tecno_by_series(&series)
}

/// Get Tecno models filtered by chipset family (MediaTek, Spreadtrum)
#[tauri::command]
pub fn frp_get_tecno_by_chipset(family: String) -> Vec<TecnoModel> {
    get_tecno_by_chipset_family(&family)
}

/// Get all available Tecno FRP methods with their details
#[tauri::command]
pub fn frp_get_tecno_methods() -> Vec<TecnoFrpMethodInfo> {
    let methods = vec![
        TecnoFrpMethod::MtkBromErase,
        TecnoFrpMethod::SpdBootloaderErase,
        TecnoFrpMethod::SetupWizardDisable,
        TecnoFrpMethod::DeviceProvisioning,
        TecnoFrpMethod::ContentProviderBypass,
        TecnoFrpMethod::SetupWizardUninstall,
        TecnoFrpMethod::BrowserDownloadBypass,
        TecnoFrpMethod::AccountManagerLaunch,
        TecnoFrpMethod::EmergencyDialerBypass,
        TecnoFrpMethod::TalkBackBypass,
        TecnoFrpMethod::SimPinBypass,
        TecnoFrpMethod::SettingsAccess,
        TecnoFrpMethod::QuickShortcutMaker,
        TecnoFrpMethod::HiosServiceMenu,
        TecnoFrpMethod::MtkAuthBypass,
    ];

    methods.into_iter().map(|m| TecnoFrpMethodInfo {
        id: m.id().to_string(),
        label: m.label().to_string(),
        description: m.description().to_string(),
        risk_level: m.risk_level().label().to_string(),
        is_hardware_method: m.is_hardware_method(),
        is_adb_method: m.is_adb_method(),
    }).collect()
}

/// Tecno FRP method info for the frontend
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct TecnoFrpMethodInfo {
    pub id: String,
    pub label: String,
    pub description: String,
    pub risk_level: String,
    pub is_hardware_method: bool,
    pub is_adb_method: bool,
}

// ==================== Q4 FRP Commands ====================

/// Get the full Q4 device compatibility database (33 models)
#[tauri::command]
pub fn frp_get_q4_database() -> Vec<TecnoModel> {
    get_q4_database()
}

/// Search the Q4 device database
#[tauri::command]
pub fn frp_search_q4_models(query: String) -> Vec<TecnoModel> {
    search_q4_models(&query)
}

/// Get Q4 models filtered by brand/series ("all", "Nokia", "Moto", "Huawei", "Sony", "Pixel", "Credit")
#[tauri::command]
pub fn frp_get_q4_by_brand(brand: String) -> Vec<TecnoModel> {
    get_q4_by_brand(&brand)
}

// ==================== Infinix FRP Commands (Q2 Transsion) ====================

/// Get the full Infinix device compatibility database (35 models)
#[tauri::command]
pub fn frp_get_infinix_database() -> Vec<TecnoModel> {
    get_infinix_database()
}

/// Search the Infinix device database
#[tauri::command]
pub fn frp_search_infinix_models(query: String) -> Vec<TecnoModel> {
    search_infinix_models(&query)
}

/// Get Infinix models filtered by series ("all", "Hot", "Note", "Smart", "Zero", "GT")
#[tauri::command]
pub fn frp_get_infinix_by_series(series: String) -> Vec<TecnoModel> {
    get_infinix_by_series(&series)
}

// ==================== Itel FRP Commands (Q2 Transsion) ====================

/// Get the full Itel device compatibility database (35 models)
#[tauri::command]
pub fn frp_get_itel_database() -> Vec<TecnoModel> {
    get_itel_database()
}

/// Search the Itel device database
#[tauri::command]
pub fn frp_search_itel_models(query: String) -> Vec<TecnoModel> {
    search_itel_models(&query)
}

/// Get Itel models filtered by series ("all", "A", "P", "S", "Vision")
#[tauri::command]
pub fn frp_get_itel_by_series(series: String) -> Vec<TecnoModel> {
    get_itel_by_series(&series)
}

// ==================== Q3 FRP Commands (Xiaomi, OPPO, Realme, Vivo, Honor) ====================

/// Get the full Q3 device compatibility database (60 models)
#[tauri::command]
pub fn frp_get_q3_database() -> Vec<TecnoModel> {
    get_q3_database()
}

/// Search the Q3 device database
#[tauri::command]
pub fn frp_search_q3_models(query: String) -> Vec<TecnoModel> {
    search_q3_models(&query)
}

/// Get Q3 models filtered by brand/series ("all", "Xiaomi", "Redmi", "POCO", "OPPO", "Realme", "Vivo", "Honor")
#[tauri::command]
pub fn frp_get_q3_by_brand(brand: String) -> Vec<TecnoModel> {
    get_q3_by_brand(&brand)
}
