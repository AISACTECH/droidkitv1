// =====================================================================
// FRP Adaptive Engine — partition survey (T10, read-only)
// ---------------------------------------------------------------------
// The device I/O half of the partition-safety module. STRICTLY
// read-only: getprop + `ls /dev/block/by-name`. No writes, no erases,
// no fastboot/flash paths. The TS layer (adaptive-engine) applies the
// AVB honesty + rollback policy on top of this raw survey.
// =====================================================================

use crate::adb_commands::device::Device;
use serde::{Deserialize, Serialize};

/// One property sample from the survey.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PropertySample {
    pub name: String,
    pub value: Option<String>,
}

/// Raw, read-only partition/boot survey result.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PartitionSurveyRaw {
    /// Always true — the contract of this command.
    pub read_only: bool,
    pub properties: Vec<PropertySample>,
    /// Lines from `ls -l /dev/block/by-name` (capped).
    pub block_devices: Vec<String>,
}

/// Properties the survey reads (must remain read-only getprop calls).
pub const SURVEY_PROPERTIES: &[&str] = &[
    "ro.boot.verifiedbootstate",
    "ro.boot.vbmeta.device_state",
    "ro.build.tags",
    "ro.oem_unlock_supported",
    "ro.boot.flash.locked",
    "ro.build.version.security_patch",
    "ro.build.version.release",
    "ro.build.fingerprint",
];

fn get_property(device: &mut Device, property: &str) -> Option<String> {
    let mut buf: Vec<u8> = Vec::new();
    match device.shell_command(&format!("getprop {}", property), &mut buf) {
        Ok(_) => {
            let val = String::from_utf8_lossy(&buf).trim().to_string();
            if val.is_empty() {
                None
            } else {
                Some(val)
            }
        }
        Err(_) => None,
    }
}

/// Run the read-only partition survey against a connected device.
pub fn run_partition_survey(device: &mut Device) -> PartitionSurveyRaw {
    let properties = SURVEY_PROPERTIES
        .iter()
        .map(|p| PropertySample {
            name: p.to_string(),
            value: get_property(device, p),
        })
        .collect();

    let mut block_devices: Vec<String> = Vec::new();
    let mut buf: Vec<u8> = Vec::new();
    if let Ok(_) = device.shell_command("ls -l /dev/block/by-name", &mut buf) {
        block_devices = String::from_utf8_lossy(&buf)
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .take(200)
            .collect();
    }

    PartitionSurveyRaw {
        read_only: true,
        properties,
        block_devices,
    }
}
