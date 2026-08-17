use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const PERMIT_TTL: Duration = Duration::from_secs(5 * 60);
const MAX_ACTIVE_PERMITS: usize = 128;

const FRP_METHODS: &[&str] = &[
    "setup_wizard_disable",
    "device_provisioning",
    "content_provider_bypass",
    "setup_wizard_uninstall",
    "browser_download_bypass",
    "account_manager_launch",
    "emergency_dialer_bypass",
    "talkback_bypass",
    "sim_pin_bypass",
    "combination_firmware",
    "alliance_shield_bypass",
    "hacktm_bypass",
    "smart_switch_bypass",
    "settings_access",
    "quick_shortcut_maker",
];

const RESET_MODES: &[&str] = &[
    "factory_reset_frp100",
    "factory_reset_frp70",
    "frp100_no_wipe",
    "frp70_no_wipe",
];

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OperationPermit {
    pub token: String,
    pub operation: String,
    pub device_serial: String,
    pub device_model: String,
    pub expires_at_epoch_ms: u128,
    pub one_time: bool,
}

#[derive(Debug, Clone)]
struct StoredPermit {
    operation: String,
    device_serial: String,
    device_model: String,
    expires_at: SystemTime,
}

static PERMITS: OnceLock<Mutex<HashMap<String, StoredPermit>>> = OnceLock::new();

fn permits() -> &'static Mutex<HashMap<String, StoredPermit>> {
    PERMITS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn now_epoch_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn normalize(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

pub fn confirmation_phrase(device_serial: &str) -> String {
    format!("AUTHORIZE {}", device_serial.trim())
}

pub fn operation_allowed(operation: &str) -> bool {
    if operation == "frp_auto_bypass"
        || operation == "knox_remove"
        || operation == "fastboot_oem_unlock"
        || operation == "fastboot_erase_frp"
    {
        return true;
    }

    if let Some(method) = operation.strip_prefix("frp_method:") {
        return FRP_METHODS.contains(&method);
    }

    if let Some(mode) = operation.strip_prefix("frp_reset:") {
        return RESET_MODES.contains(&mode);
    }

    false
}

fn prune_expired(store: &mut HashMap<String, StoredPermit>) {
    let now = SystemTime::now();
    store.retain(|_, permit| permit.expires_at > now);

    // A compromised or buggy renderer must not grow the process registry forever.
    if store.len() > MAX_ACTIVE_PERMITS {
        store.clear();
    }
}

/// Issue a short-lived, one-use permit bound to one operation and one verified device.
///
/// This does not pretend software can prove legal ownership. It enforces the strongest
/// local contract available: explicit owner + backup attestations, exact typed serial,
/// model agreement with the connected device, operation allow-listing, expiration and
/// one-time consumption in the Rust backend.
pub fn issue_permit(
    operation: &str,
    device_serial: &str,
    actual_model: &str,
    expected_model: &str,
    ownership_confirmed: bool,
    backup_confirmed: bool,
    typed_confirmation: &str,
) -> Result<OperationPermit, String> {
    let operation = operation.trim();
    let serial = device_serial.trim();
    let actual_model = actual_model.trim();
    let expected_model = expected_model.trim();

    if !operation_allowed(operation) {
        return Err("Operation is not in the destructive-operation allow-list".to_string());
    }
    if serial.is_empty() || actual_model.is_empty() || expected_model.is_empty() {
        return Err("Device serial and model must be verified before authorization".to_string());
    }
    if !ownership_confirmed {
        return Err("Owner or authorized-service confirmation is required".to_string());
    }
    if !backup_confirmed {
        return Err("Backup and recovery-path confirmation is required".to_string());
    }
    if typed_confirmation.trim() != confirmation_phrase(serial) {
        return Err(format!(
            "Typed confirmation does not match the connected device. Enter exactly: {}",
            confirmation_phrase(serial)
        ));
    }
    if normalize(actual_model) != normalize(expected_model) {
        return Err(format!(
            "Connected model mismatch: expected '{}', device reports '{}'",
            expected_model, actual_model
        ));
    }

    let expires_at = SystemTime::now() + PERMIT_TTL;
    let token = format!(
        "{:032x}{:032x}",
        rand::random::<u128>(),
        rand::random::<u128>()
    );
    let stored = StoredPermit {
        operation: operation.to_string(),
        device_serial: serial.to_string(),
        device_model: actual_model.to_string(),
        expires_at,
    };

    let mut store = permits()
        .lock()
        .map_err(|_| "Operation authorization registry is unavailable".to_string())?;
    prune_expired(&mut store);
    store.insert(token.clone(), stored);

    Ok(OperationPermit {
        token,
        operation: operation.to_string(),
        device_serial: serial.to_string(),
        device_model: actual_model.to_string(),
        expires_at_epoch_ms: expires_at
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
        one_time: true,
    })
}

/// Consume a permit. Removal happens before validation, so a failed replay or mismatch
/// cannot reuse the token with modified arguments.
pub fn consume_permit(
    token: &str,
    expected_operation: &str,
    expected_serial: &str,
) -> Result<(), String> {
    if token.trim().is_empty() {
        return Err("A backend-issued operation permit is required".to_string());
    }

    let mut store = permits()
        .lock()
        .map_err(|_| "Operation authorization registry is unavailable".to_string())?;
    prune_expired(&mut store);
    let permit = store
        .remove(token.trim())
        .ok_or_else(|| "Operation permit is invalid, expired, or already used".to_string())?;

    if permit.expires_at <= SystemTime::now() {
        return Err("Operation permit expired; repeat the identity pre-flight".to_string());
    }
    if permit.operation != expected_operation.trim() {
        return Err("Operation permit is bound to a different action".to_string());
    }
    if permit.device_serial != expected_serial.trim() {
        return Err("Operation permit is bound to a different device".to_string());
    }
    if permit.device_model.trim().is_empty() {
        return Err("Operation permit has no verified model identity".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn permit(operation: &str) -> OperationPermit {
        issue_permit(
            operation,
            "SERIAL-123",
            "SM-A155F",
            "sm-a155f",
            true,
            true,
            "AUTHORIZE SERIAL-123",
        )
        .expect("valid fixture should issue")
    }

    #[test]
    fn allow_list_rejects_unknown_operations() {
        assert!(operation_allowed("frp_method:device_provisioning"));
        assert!(operation_allowed("frp_reset:factory_reset_frp100"));
        assert!(!operation_allowed("shell:rm-everything"));
        assert!(!operation_allowed("frp_method:not_real"));
    }

    #[test]
    fn issue_requires_all_preflight_gates() {
        assert!(issue_permit(
            "knox_remove",
            "SERIAL-123",
            "SM-A155F",
            "SM-A155F",
            false,
            true,
            "AUTHORIZE SERIAL-123",
        )
        .is_err());
        assert!(issue_permit(
            "knox_remove",
            "SERIAL-123",
            "SM-A155F",
            "SM-A155F",
            true,
            false,
            "AUTHORIZE SERIAL-123",
        )
        .is_err());
        assert!(issue_permit(
            "knox_remove",
            "SERIAL-123",
            "SM-A155F",
            "SM-A155F",
            true,
            true,
            "AUTHORIZE ANOTHER",
        )
        .is_err());
    }

    #[test]
    fn issue_rejects_model_mismatch() {
        assert!(issue_permit(
            "knox_remove",
            "SERIAL-123",
            "SM-A155F",
            "SM-S931B",
            true,
            true,
            "AUTHORIZE SERIAL-123",
        )
        .is_err());
    }

    #[test]
    fn permit_is_bound_and_one_time() {
        let p = permit("frp_method:device_provisioning");
        assert!(consume_permit(&p.token, "frp_method:device_provisioning", "SERIAL-123").is_ok());
        assert!(consume_permit(&p.token, "frp_method:device_provisioning", "SERIAL-123").is_err());
    }

    #[test]
    fn mismatch_consumes_permit() {
        let p = permit("knox_remove");
        assert!(consume_permit(&p.token, "fastboot_erase_frp", "SERIAL-123").is_err());
        assert!(consume_permit(&p.token, "knox_remove", "SERIAL-123").is_err());
    }
}
