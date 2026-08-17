use crate::adb_commands::device::Device;
use crate::frp::algorithm::FrpResetMode;
use crate::frp::bypass::BypassStepResult;
use serde::{Deserialize, Serialize};

/// Result of executing a full reset mode (factory reset + FRP removal)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResetExecutionResult {
    pub reset_mode: FrpResetMode,
    /// Reserved for a separately observed post-reboot inactive state.
    pub success: bool,
    /// Whether required writes were accepted and read back before reboot.
    pub operation_accepted: bool,
    pub steps: Vec<BypassStepResult>,
    pub message: String,
    pub device_state_after: String,
    pub requires_reboot: bool,
    pub frp_removed_percent: u8,
    pub data_wiped: bool,
    pub verification_status: String,
}

fn output_indicates_failure(output: &str) -> bool {
    let lower = output.to_ascii_lowercase();
    [
        "permission denial",
        "permission denied",
        "security exception",
        "java.lang.securityexception",
        "unknown command",
        "unknown package",
        "not allowed",
        "error:",
        "failure [",
        "exception occurred",
    ]
    .iter()
    .any(|marker| lower.contains(marker))
}

fn exec(device: &mut Device, cmd: &str) -> BypassStepResult {
    let mut buf: Vec<u8> = Vec::new();
    match device.shell_command(cmd, &mut buf) {
        Ok(_) => {
            let output = String::from_utf8_lossy(&buf).trim().to_string();
            if output_indicates_failure(&output) {
                BypassStepResult {
                    command: cmd.to_string(),
                    success: false,
                    error: Some(format!("Device rejected command: {}", output)),
                    output,
                }
            } else {
                BypassStepResult {
                    command: cmd.to_string(),
                    success: true,
                    output,
                    error: None,
                }
            }
        }
        Err(e) => BypassStepResult {
            command: cmd.to_string(),
            success: false,
            output: String::new(),
            error: Some(format!("{:?}", e)),
        },
    }
}

/// Execute Factory Reset + FRP removal based on selected reset mode.
/// Honest scope: this runs the ADB provisioning ladder (setup-wizard disable,
/// provisioning flags, content-provider inserts). It does NOT erase the
/// encrypted FRP partition — that requires a below-OS lane (EDL/Brom/Odin/SPD)
/// which is not part of this ADB path. Success must be confirmed by a reboot
/// re-check, never assumed from the command output alone.
pub fn execute_reset_mode(device: &mut Device, mode: &FrpResetMode) -> ResetExecutionResult {
    let mut steps = Vec::new();

    // === Phase 1: Handshake verification — ensure USB debugging & dev options enabled ===
    // This confirms the phone has completed the USB debugging handshake with app software
    steps.push(exec(device, "getprop ro.build.version.release")); // handshake check
    steps.push(exec(device, "getprop sys.usb.state"));
    steps.push(exec(device, "settings get global adb_enabled")); // should be 1 if dev options + usb debugging allowed

    // === Phase 2: FRP removal — based on percentage ===
    let frp_percent = mode.frp_removal_percent();
    let wipes_data = mode.wipes_data();
    // Compatibility names still contain historical 100/70 labels. Neither path
    // erases a block partition; the 100-class path only attempts extra settings-
    // level credential/cache cleanup.
    let full_flag_scope = frp_percent == 100;

    if frp_percent >= 70 {
        // Core provisioning bypass — disables setup wizard + sets flags
        steps.push(exec(device, "pm disable-user --user 0 com.google.android.setupwizard"));
        steps.push(exec(device, "pm disable-user --user 0 com.samsung.android.app.setupwizard"));
        steps.push(exec(device, "pm disable-user --user 0 com.samsung.android.app.setupwizarddefault"));
        steps.push(exec(device, "am force-stop com.google.android.setupwizard"));
        steps.push(exec(device, "am force-stop com.samsung.android.app.setupwizard"));
        steps.push(exec(device, "settings put global device_provisioned 1"));
        steps.push(exec(device, "settings put secure user_setup_complete 1"));
        steps.push(exec(device, "settings put --user 0 secure user_setup_complete 1"));
        steps.push(exec(device, "settings put global setupwizard_mode DISABLED"));
        steps.push(exec(device, "settings put secure setup_wizard_completed 1"));
        // Content provider bypass — bypasses Knox blocks
        steps.push(exec(device, "content insert --uri content://settings/global --bind name:s:device_provisioned --bind value:s:1"));
        steps.push(exec(device, "content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1"));
    }

    if full_flag_scope {
        // Full flag scope — clears provisioning/credential settings visible over ADB.
        // Honest note: these are settings-level commands, NOT a block-level FRP
        // partition erase (that requires a below-OS lane: EDL/Brom/Odin/SPD).
        steps.push(exec(device, "content delete --uri content://settings/secure --where 'name=\"frp_credential_enabled\"'"));
        steps.push(exec(device, "content delete --uri content://settings/global --where 'name=\"frp_credential_enabled\"'"));
        steps.push(exec(device, "settings put global frp_credential_enabled 0"));
        steps.push(exec(device, "settings delete global frp_credential_enabled"));
        // Deliberately do not guess a lock credential or clear GMS/Knox data.
        // Those actions are unrelated destructive side effects, not FRP proof.
    } else {
        // temporary mode — only bypasses flags, does NOT touch the FRP partition
        // (may re-lock on next reset)
        steps.push(exec(device, "settings put global frp_credential_enabled 0"));
    }

    // Semantic read-back before any reset request. A transport-level success is
    // not enough; both required settings must read back as 1.
    let readback_start = steps.len();
    steps.push(exec(device, "settings get global device_provisioned"));
    steps.push(exec(device, "settings get secure user_setup_complete"));
    let flags_confirmed = steps
        .get(readback_start)
        .is_some_and(|s| s.success && s.output.trim() == "1")
        && steps
            .get(readback_start + 1)
            .is_some_and(|s| s.success && s.output.trim() == "1");

    // === Phase 3: optional factory-reset request ===
    // Send one documented broadcast only. Chaining multiple wipe commands after
    // the first reboot request caused ambiguous partial results and could target
    // a reconnecting device.
    let reset_requested = if wipes_data {
        let result = exec(
            device,
            "am broadcast -a android.intent.action.FACTORY_RESET --receiver-foreground",
        );
        let accepted = result.success;
        steps.push(result);
        accepted
    } else {
        true
    };

    let operation_accepted = flags_confirmed && reset_requested;
    let verification_status = if operation_accepted {
        "pending_post_reboot_verification"
    } else if flags_confirmed {
        "flags_confirmed_reset_not_accepted"
    } else {
        "required_readback_failed"
    }
    .to_string();

    let device_state = if operation_accepted && wipes_data {
        "Provisioning flags were read back and one factory-reset request was accepted. The encrypted FRP partition was not erased. Final state is unknown until the device reboots, reconnects and a fresh scan reports Inactive.".to_string()
    } else if operation_accepted {
        "Provisioning flags were read back. The encrypted FRP partition was not erased; reboot and run a fresh scan before treating the device as resolved.".to_string()
    } else {
        "Required writes or reset acknowledgement failed. No FRP removal is claimed.".to_string()
    };

    let message = if operation_accepted {
        format!(
            "{} accepted at command/read-back level. Final success is pending a separate post-reboot scan.",
            mode.label()
        )
    } else {
        format!(
            "{} was not fully accepted. Review the failed steps; do not report success.",
            mode.label()
        )
    };

    ResetExecutionResult {
        reset_mode: mode.clone(),
        success: false,
        operation_accepted,
        steps,
        message,
        device_state_after: device_state,
        requires_reboot: true,
        frp_removed_percent: frp_percent,
        data_wiped: wipes_data && reset_requested,
        verification_status,
    }
}

/// Knox removal — disables Knox and related security packages via ADB.
/// Honest scope: `pm disable-user` affects the current user's app state only;
/// it does NOT reset the Knox Warranty bit or KG (Knox Guard) state, which are
/// hardware/fuse-level. Guarded by the same handshake + consent flow as reset.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnoxRemovalResult {
    /// True only when at least one requested package is confirmed in Android's
    /// disabled-package list. This never means Knox/KG hardware state was reset.
    pub success: bool,
    pub steps: Vec<BypassStepResult>,
    pub message: String,
    pub knox_disabled: bool,
    pub knox_packages_disabled: Vec<String>,
    pub verification_status: String,
}

pub fn execute_knox_removal(device: &mut Device) -> KnoxRemovalResult {
    let mut steps = Vec::new();
    let mut disabled_packages = Vec::new();

    // Phase 1: Check Knox version before removal (confirms Knox detection)
    steps.push(exec(device, "getprop ro.build.version.knox"));
    steps.push(exec(device, "getprop ro.knox.enhance.ztd"));
    steps.push(exec(device, "dumpsys knox --help || echo Knox service check"));

    // Phase 2: Disable Knox core packages — this is the real Knox removal
    let knox_packages = vec![
        "com.samsung.knox.knoxsetupwizardclient",
        "com.sec.knox.knoxsetupwizardclient",
        "com.samsung.knox.rcp.components",
        "com.sec.knox.switchknoxI",
        "com.sec.knox.switchknoxII",
        "com.samsung.android.knox.attestation",
        "com.samsung.android.knox.containercore",
        "com.samsung.android.knox.containerdesktop",
        "com.samsung.android.knox.containermode",
        "com.sec.knox.foldercontainer",
        "com.samsung.knox.securefolder",
        "com.samsung.android.knox.kpecore",
        "com.samsung.android.knox.kpu",
        "com.samsung.android.bbc.bbcagent",
        "com.samsung.android.knox.analytics.uploader",
    ];

    for pkg in &knox_packages {
        let cmd = format!("pm disable-user --user 0 {}", pkg);
        let result = exec(device, &cmd);
        if result.success {
            disabled_packages.push(pkg.to_string());
        }
        steps.push(result);
    }

    // Knox Guard / finance-lock packages are intentionally excluded. They are a
    // separate owner/lender-controlled system, not a fallback extension of Knox
    // container maintenance.

    // Semantic verification: trust Android's disabled-package list, not command
    // transport status. Do not clear package data or write invented global flags.
    let verification = exec(device, "pm list packages -d");
    let disabled_output = if verification.success {
        verification.output.clone()
    } else {
        String::new()
    };
    steps.push(verification);
    disabled_packages = knox_packages
        .iter()
        .filter(|pkg| {
            let package_name = **pkg;
            disabled_output
                .lines()
                .any(|line| line.trim() == format!("package:{}", package_name))
        })
        .map(|pkg| (*pkg).to_string())
        .collect();

    let success = !disabled_packages.is_empty();
    let message = if success {
        format!(
            "Verified {} Knox-related package(s) disabled for Android user 0. Knox Warranty and Knox Guard states were not changed; reboot and confirm required enterprise functions still work.",
            disabled_packages.len()
        )
    } else {
        "No requested Knox package could be verified as disabled. No Knox/KG state change is claimed."
            .to_string()
    };

    KnoxRemovalResult {
        success,
        steps,
        message,
        knox_disabled: false,
        knox_packages_disabled: disabled_packages,
        verification_status: if success {
            "packages_verified_disabled_user0"
        } else {
            "no_verified_package_change"
        }
        .to_string(),
    }
}
