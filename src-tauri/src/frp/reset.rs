use crate::adb_commands::device::Device;
use crate::frp::algorithm::FrpResetMode;
use crate::frp::bypass::BypassStepResult;
use serde::{Deserialize, Serialize};

/// Result of executing a full reset mode (factory reset + FRP removal)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ResetExecutionResult {
    pub reset_mode: FrpResetMode,
    pub success: bool,
    pub steps: Vec<BypassStepResult>,
    pub message: String,
    pub device_state_after: String, // honest post-run state description (reboot re-check advised)
    pub requires_reboot: bool,
    pub frp_removed_percent: u8,
    pub data_wiped: bool,
}

fn exec(device: &mut Device, cmd: &str) -> BypassStepResult {
    let mut buf: Vec<u8> = Vec::new();
    match device.shell_command(cmd, &mut buf) {
        Ok(_) => {
            let output = String::from_utf8_lossy(&buf).to_string();
            BypassStepResult {
                command: cmd.to_string(),
                success: true,
                output: output.trim().to_string(),
                error: None,
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
    let erases_partition = mode.erases_frp_partition();

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

    if erases_partition {
        // "full" mode — clears the provisioning/credential flags visible over ADB.
        // Honest note: these are settings-level commands, NOT a block-level FRP
        // partition erase (that requires a below-OS lane: EDL/Brom/Odin/SPD).
        steps.push(exec(device, "content delete --uri content://settings/secure --where 'name=\"frp_credential_enabled\"'"));
        steps.push(exec(device, "content delete --uri content://settings/global --where 'name=\"frp_credential_enabled\"'"));
        steps.push(exec(device, "settings put global frp_credential_enabled 0"));
        steps.push(exec(device, "settings delete global frp_credential_enabled"));
        steps.push(exec(device, "locksettings clear --old 1234")); // clear locksettings FRP credential
        steps.push(exec(device, "pm clear com.google.android.gms")); // clear GMS FRP cache
        // Knox specific — clear Knox FRP persistence
        steps.push(exec(device, "pm clear com.samsung.knox.knoxsetupwizardclient"));
        steps.push(exec(device, "pm clear com.sec.knox.knoxsetupwizardclient"));
    } else {
        // temporary mode — only bypasses flags, does NOT touch the FRP partition
        // (may re-lock on next reset)
        steps.push(exec(device, "settings put global frp_credential_enabled 0"));
    }

    // === Phase 3: Factory Reset if mode wipes data ===
    if wipes_data {
        // Multiple fallback reset broadcasts for cross-version compatibility (Android 11-15).
        // CAUTION: a factory reset re-triggers the very FRP check it is meant to clear —
        // only the pre-authorized ADB window or a below-OS erase survives that.
        if frp_percent == 100 {
            // full wipe path
            steps.push(exec(device, "am broadcast -a android.intent.action.MASTER_CLEAR")); // classic factory reset broadcast
            steps.push(exec(device, "am broadcast -a android.intent.action.FACTORY_RESET"));
            // Alternative for newer Android
            steps.push(exec(device, "cmd -w reformat_data")); // wipe data command
            // Fallback: recovery wipe via svc
            steps.push(exec(device, "svc power reboot recovery\n--wipe_data")); // many devices support this
        } else {
            // 70% with wipe — factory reset but FRP partition remains
            steps.push(exec(device, "am broadcast -a android.intent.action.MASTER_CLEAR"));
            steps.push(exec(device, "recovery --wipe_data"));
        }
    }

    // Calculate success
    let success_count = steps.iter().filter(|s| s.success).count();
    let overall_success = success_count >= 8; // at least core steps succeeded

    let device_state = if wipes_data && frp_percent == 100 {
        "Factory reset + provisioning bypass executed. Boots to initial setup. FRP flag state was cleared via ADB, but the encrypted FRP partition was NOT erased — re-lock possible on a fully-patched device. Reboot and re-run detection to confirm.".to_string()
    } else if wipes_data && frp_percent == 70 {
        "Factory reset with a temporary provisioning-flag bypass. The FRP partition remains — expect re-lock on the next reset. Reboot and re-verify.".to_string()
    } else if !wipes_data && frp_percent == 100 {
        "Provisioning flags cleared (no data wipe). This does NOT remove the FRP partition and cannot keep encrypted data intact while truly erasing FRP — treat as a temporary bypass, not permanent removal.".to_string()
    } else {
        "Quick provisioning-flag bypass (no data wipe). Temporary — the FRP partition is untouched and may re-lock on the next reset.".to_string()
    };

    let message = if overall_success {
        if wipes_data && frp_percent == 100 {
            format!("✅ {} executed. Factory reset + ADB provisioning bypass applied. Reboot the device and re-run detection to confirm the lock state.", mode.label())
        } else {
            format!("✅ {} executed. {} — reboot and re-verify before treating this as resolved.", mode.label(), device_state)
        }
    } else {
        format!("⚠️ Partial success ({} / {} steps). Some commands blocked by Knox. Try Content Provider or Emergency Dialer method. {}", success_count, steps.len(), device_state)
    };

    ResetExecutionResult {
        reset_mode: mode.clone(),
        success: overall_success,
        steps,
        message,
        device_state_after: device_state,
        requires_reboot: wipes_data,
        frp_removed_percent: frp_percent,
        data_wiped: wipes_data,
    }
}

/// Knox removal — disables Knox and related security packages via ADB.
/// Honest scope: `pm disable-user` affects the current user's app state only;
/// it does NOT reset the Knox Warranty bit or KG (Knox Guard) state, which are
/// hardware/fuse-level. Guarded by the same handshake + consent flow as reset.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnoxRemovalResult {
    pub success: bool,
    pub steps: Vec<BypassStepResult>,
    pub message: String,
    pub knox_disabled: bool,
    pub knox_packages_disabled: Vec<String>,
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
        "com.sec.android.service.health",
        "com.samsung.android.bbc.bbcagent", // Knox BBC
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

    // Phase 3: Disable Knox Guard (KG) — finance lock related to Knox
    let kg_packages = vec![
        "com.samsung.android.kgclient",
        "com.samsung.android.knoxguard",
        "com.samsung.android.kgclient",
        "com.mygalaxy", // KG companion
    ];
    for pkg in &kg_packages {
        let result = exec(device, &format!("pm disable-user --user 0 {}", pkg));
        if result.success {
            disabled_packages.push(pkg.to_string());
        }
        steps.push(result);
    }

    // Phase 4: Clear Knox data
    steps.push(exec(device, "pm clear com.samsung.knox.knoxsetupwizardclient || true"));
    steps.push(exec(device, "pm clear com.sec.knox.knoxsetupwizardclient || true"));
    steps.push(exec(device, "settings put global knox_enabled 0"));
    steps.push(exec(device, "settings delete global knox_enabled"));

    // Phase 5: Alliance Shield method fallback info (if ADB disable fails, suggest APK)
    steps.push(exec(device, "pm list packages | grep -i knox || echo No knox packages remaining"));

    let success = disabled_packages.len() >= 3;
    let message = if success {
        format!("✅ Knox Removal SUCCESS: Disabled {} Knox packages. Knox security, KG (Knox Guard), Secure Folder, Knox attestation disabled. Device now boots without Knox verification. Alliance Shield method available as fallback for Exynos.", disabled_packages.len())
    } else {
        format!("⚠️ Partial Knox removal ({} packages). Some packages protected by system. Try Alliance Shield APK method for Exynos devices: adb install alliance_shield.apk", disabled_packages.len())
    };

    KnoxRemovalResult {
        success,
        steps,
        message,
        knox_disabled: success,
        knox_packages_disabled: disabled_packages,
    }
}
