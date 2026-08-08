use crate::adb_commands::device::Device;
use serde::{Deserialize, Serialize};

/// FRP lock state of the device
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum FrpState {
    /// FRP is active — device is locked after factory reset
    Active,
    /// FRP is not active — device has no Google account lock
    Inactive,
    /// Could not determine FRP state
    Unknown,
}

/// Complete FRP detection result
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FrpDetectionResult {
    /// Whether FRP appears to be active
    pub frp_state: FrpState,
    /// The Google accounts found on device (from account manager)
    pub google_accounts: Vec<String>,
    /// Whether the setup wizard is currently running
    pub setup_wizard_running: bool,
    /// Whether the device is provisioned
    pub device_provisioned: bool,
    /// Whether user setup is marked complete
    pub user_setup_complete: bool,
    /// FRP PST property value
    pub frp_pst: Option<String>,
    /// Samsung-specific: OEM unlock allowed
    pub oem_unlock_allowed: Option<bool>,
    /// Samsung-specific: Knox warranty void flag
    pub knox_warranty_void: Option<bool>,
    /// Security patch level
    pub security_patch: Option<String>,
    /// Bootloader version
    pub bootloader: Option<String>,
    /// Build fingerprint
    pub fingerprint: Option<String>,
    /// Auto-detected model code
    pub model_code: Option<String>,
    /// Auto-detected marketing name (if in DB)
    pub marketing_name: Option<String>,
}

/// Check if FRP is likely active on the device
pub fn detect_frp_state(device: &mut Device) -> FrpDetectionResult {
    let mut result = FrpDetectionResult {
        frp_state: FrpState::Unknown,
        google_accounts: Vec::new(),
        setup_wizard_running: false,
        device_provisioned: false,
        user_setup_complete: false,
        frp_pst: None,
        oem_unlock_allowed: None,
        knox_warranty_void: None,
        security_patch: None,
        bootloader: None,
        fingerprint: None,
        model_code: None,
        marketing_name: None,
    };

    // Get device properties
    result.frp_pst = get_property(device, "ro.frp.pst");
    result.security_patch = get_property(device, "ro.build.version.security_patch");
    result.bootloader = get_property(device, "ro.bootloader");
    result.fingerprint = get_property(device, "ro.build.fingerprint");

    // Detect model
    if let Some(model) = get_property(device, "ro.product.model") {
        result.model_code = Some(model.clone());
        // Check if it's in our Samsung database
        let db_entry = crate::frp::database::find_model(&model);
        result.marketing_name = db_entry.map(|e| e.marketing_name);
    }

    // Check provisioning state
    if let Some(val) = get_property(device, "ro.setupwizard.mode") {
        // "REQUIRED" = fresh device / FRP locked, "DISABLED" = already set up
        result.setup_wizard_running = val == "REQUIRED";
    }

    // Check settings via shell
    if let Some(val) = shell_command(device, "settings get global device_provisioned") {
        result.device_provisioned = val.trim() == "1";
    }

    if let Some(val) = shell_command(device, "settings get secure user_setup_complete") {
        result.user_setup_complete = val.trim() == "1";
    }

    // Check if setup wizard is currently the foreground activity
    if let Some(val) = shell_command(device, "dumpsys activity activities | grep mResumedActivity") {
        result.setup_wizard_running = result.setup_wizard_running ||
            val.contains("setupwizard") ||
            val.contains("SetupWizard") ||
            val.contains("google.android.setupwizard");
    }

    // Check for Google accounts
    if let Some(val) = shell_command(device, "dumpsys account | grep -i google") {
        let accounts: Vec<String> = val.lines()
            .filter_map(|line| {
                if line.contains("gmail.com") || line.contains("googlemail.com") || line.contains("google.com") {
                    Some(line.trim().to_string())
                } else {
                    None
                }
            })
            .collect();
        result.google_accounts = accounts;
    }

    // Check OEM unlock state
    if let Some(val) = get_property(device, "ro.oem_unlock_supported") {
        result.oem_unlock_allowed = Some(val == "1");
    }

    // Check Knox warranty void
    if let Some(val) = get_property(device, "ro.boot.warranty_bit") {
        result.knox_warranty_void = Some(val != "0");
    }

    // Determine overall FRP state
    result.frp_state = determine_frp_state(&result);

    result
}

fn determine_frp_state(result: &FrpDetectionResult) -> FrpState {
    // Strong indicators of FRP being active:
    // 1. Setup wizard is running AND no Google accounts exist
    // 2. Device is NOT provisioned AND setup is NOT complete
    // 3. FRP PST property exists but no accounts

    if result.setup_wizard_running && result.google_accounts.is_empty() {
        return FrpState::Active;
    }

    if !result.device_provisioned && !result.user_setup_complete {
        return FrpState::Active;
    }

    // If there are Google accounts and device is provisioned, FRP is inactive
    if !result.google_accounts.is_empty() && result.device_provisioned {
        return FrpState::Inactive;
    }

    if result.user_setup_complete && result.device_provisioned {
        return FrpState::Inactive;
    }

    FrpState::Unknown
}

fn get_property(device: &mut Device, property: &str) -> Option<String> {
    let mut buf: Vec<u8> = Vec::new();
    match device.shell_command(&format!("getprop {}", property), &mut buf) {
        Ok(_) => {
            let val = String::from_utf8_lossy(&buf).trim().to_string();
            if val.is_empty() { None } else { Some(val) }
        }
        Err(_) => None,
    }
}

fn shell_command(device: &mut Device, command: &str) -> Option<String> {
    let mut buf: Vec<u8> = Vec::new();
    match device.shell_command(&command, &mut buf) {
        Ok(_) => {
            let val = String::from_utf8_lossy(&buf).trim().to_string();
            if val.is_empty() { None } else { Some(val) }
        }
        Err(_) => None,
    }
}
