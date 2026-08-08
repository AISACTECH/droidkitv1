use crate::adb_commands::device::Device;
use crate::frp::database::FrpMethod;
use serde::{Deserialize, Serialize};

/// Result of a single FRP bypass step
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BypassStepResult {
    pub command: String,
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

/// Result of running a full FRP bypass method
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BypassResult {
    pub method: FrpMethod,
    pub success: bool,
    pub steps: Vec<BypassStepResult>,
    pub message: String,
    pub requires_manual_action: bool,
    pub manual_action_instructions: Option<String>,
}

/// Run a specific FRP bypass method on the device
pub fn run_bypass_method(device: &mut Device, method: &FrpMethod) -> BypassResult {
    match method {
        FrpMethod::SetupWizardDisable => run_setup_wizard_disable(device),
        FrpMethod::DeviceProvisioning => run_device_provisioning(device),
        FrpMethod::ContentProviderBypass => run_content_provider_bypass(device),
        FrpMethod::SetupWizardUninstall => run_setup_wizard_uninstall(device),
        FrpMethod::BrowserDownloadBypass => run_browser_download_bypass(device),
        FrpMethod::AccountManagerLaunch => run_account_manager_launch(device),
        FrpMethod::EmergencyDialerBypass => run_emergency_dialer_bypass(device),
        FrpMethod::TalkBackBypass => run_talkback_bypass(device),
        FrpMethod::SimPinBypass => run_sim_pin_bypass(device),
        FrpMethod::CombinationFirmware => run_combination_firmware(device),
        FrpMethod::AllianceShieldBypass => run_alliance_shield_bypass(device),
        FrpMethod::HacktmBypass => run_hacktm_bypass(device),
        FrpMethod::SmartSwitchBypass => run_smart_switch_bypass(device),
        FrpMethod::SettingsAccess => run_settings_access(device),
        FrpMethod::QuickShortcutMaker => run_quick_shortcut_maker(device),
    }
}

fn exec(device: &mut Device, cmd: &str) -> BypassStepResult {
    let mut buf: Vec<u8> = Vec::new();
    match device.shell_command(&cmd, &mut buf) {
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

/// Method 1: Setup Wizard Disable
/// Disables the Google and Samsung setup wizard packages
fn run_setup_wizard_disable(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Disable Google Setup Wizard
    steps.push(exec(device, "pm disable-user --user 0 com.google.android.setupwizard"));

    // Disable Samsung Setup Wizard
    steps.push(exec(device, "pm disable-user --user 0 com.samsung.android.app.setupwizard"));

    // Disable Samsung Setup Wizard (older package name)
    steps.push(exec(device, "pm disable-user --user 0 com.samsung.android.app.setupwizarddefault"));

    // Force stop the setup wizard
    steps.push(exec(device, "am force-stop com.google.android.setupwizard"));
    steps.push(exec(device, "am force-stop com.samsung.android.app.setupwizard"));

    let all_ok = steps.iter().any(|s| s.success);

    BypassResult {
        method: FrpMethod::SetupWizardDisable,
        success: all_ok,
        steps,
        message: if all_ok {
            "Setup wizard packages disabled. Device should skip Google verification screen on next boot.".into()
        } else {
            "Some commands failed. The setup wizard may not have been fully disabled. Try Device Provisioning method as fallback.".into()
        },
        requires_manual_action: false,
        manual_action_instructions: None,
    }
}

/// Method 2: Device Provisioning Flags
/// Sets device_provisioned and user_setup_complete flags
fn run_device_provisioning(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Mark device as provisioned
    steps.push(exec(device, "settings put global device_provisioned 1"));

    // Mark user setup as complete
    steps.push(exec(device, "settings put secure user_setup_complete 1"));

    // Also set for the default user
    steps.push(exec(device, "settings put --user 0 secure user_setup_complete 1"));

    // Disable setup wizard mode
    steps.push(exec(device, "settings put global setupwizard_mode DISABLED"));

    // Mark setup wizard as completed
    steps.push(exec(device, "settings put secure setup_wizard_completed 1"));

    let all_ok = steps.iter().any(|s| s.success);

    BypassResult {
        method: FrpMethod::DeviceProvisioning,
        success: all_ok,
        steps,
        message: if all_ok {
            "Device provisioning flags set. Device marked as already set up. Reboot the device to apply.".into()
        } else {
            "Some flags could not be set. Knox may be blocking settings changes. Try Content Provider method.".into()
        },
        requires_manual_action: false,
        manual_action_instructions: Some("Reboot the device after running this method for changes to take effect.".into()),
    }
}

/// Method 3: Content Provider Bypass
/// Uses content provider URI to set provisioning flags directly
fn run_content_provider_bypass(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Insert provisioning values via content provider
    steps.push(exec(device, "content insert --uri content://settings/global --bind name:s:device_provisioned --bind value:s:1"));
    steps.push(exec(device, "content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1"));
    steps.push(exec(device, "content insert --uri content://settings/global --bind name:s:setupwizard_mode --bind value:s:DISABLED"));
    steps.push(exec(device, "content insert --uri content://settings/secure --bind name:s:setup_wizard_completed --bind value:s:1"));

    // Also try delete + insert for clean state
    steps.push(exec(device, "content delete --uri content://settings/secure --where 'name=\"user_setup_complete\"'"));
    steps.push(exec(device, "content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1"));

    let all_ok = steps.iter().any(|s| s.success);

    BypassResult {
        method: FrpMethod::ContentProviderBypass,
        success: all_ok,
        steps,
        message: if all_ok {
            "Content provider bypass applied. Provisioning flags set via direct URI manipulation. Reboot to apply.".into()
        } else {
            "Content provider manipulation failed. Samsung Knox may be blocking this. Try Emergency Dialer method instead.".into()
        },
        requires_manual_action: false,
        manual_action_instructions: Some("Reboot the device after running this method.".into()),
    }
}

/// Method 4: Setup Wizard Uninstall
/// Uninstalls setup wizard packages for user 0 (preserves data with -k)
fn run_setup_wizard_uninstall(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Uninstall Google setup wizard for current user (keep data)
    steps.push(exec(device, "pm uninstall -k --user 0 com.google.android.setupwizard"));

    // Uninstall Samsung setup wizard for current user
    steps.push(exec(device, "pm uninstall -k --user 0 com.samsung.android.app.setupwizard"));
    steps.push(exec(device, "pm uninstall -k --user 0 com.samsung.android.app.setupwizarddefault"));

    // Also try Google onboarding
    steps.push(exec(device, "pm uninstall -k --user 0 com.google.android.onboarding"));

    let all_ok = steps.iter().any(|s| s.success);

    BypassResult {
        method: FrpMethod::SetupWizardUninstall,
        success: all_ok,
        steps,
        message: if all_ok {
            "Setup wizard packages uninstalled for user 0. Packages can be re-installed later with 'pm install-existing'. Reboot to apply.".into()
        } else {
            "Uninstall failed. Knox may protect these packages. Try Setup Wizard Disable or Content Provider method instead.".into()
        },
        requires_manual_action: false,
        manual_action_instructions: Some("Reboot the device. To restore setup wizard later: pm install-existing com.google.android.setupwizard".into()),
    }
}

/// Method 5: Browser Download Bypass
/// Launches Samsung Browser to download FRP bypass APK
fn run_browser_download_bypass(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Try Samsung Browser first
    steps.push(exec(device, "am start -n com.sec.android.app.sbrowser/.SBrowserMainActivity"));

    // If Samsung Browser fails, try Chrome
    steps.push(exec(device, "am start -n com.android.chrome/com.google.android.apps.chrome.Main"));

    // Try opening a direct URL to an FRP bypass APK download page
    steps.push(exec(device, "am start -a android.intent.action.VIEW -d https://frpbypass.net/android-frp-bypass-apk"));

    // Alternative: try to open Samsung Internet with URL
    steps.push(exec(device, "am start -a android.intent.action.VIEW -d https://frpbypass.net/android-frp-bypass-apk -p com.sec.android.app.sbrowser"));

    BypassResult {
        method: FrpMethod::BrowserDownloadBypass,
        success: steps.iter().any(|s| s.success),
        steps,
        message: "Browser launched. You need to manually navigate to download an FRP bypass APK (e.g. QuickShortcutMaker, FRP_Bypass.apk, or Alliance Shield).".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "1. In the browser, go to frpbypass.net or search 'FRP bypass APK'\n\
             2. Download QuickShortcutMaker.apk or FRP_Bypass.apk\n\
             3. Open the APK file (may need 'Install unknown apps' permission)\n\
             4. Install and open the APK\n\
             5. Use QuickShortcutMaker to launch Google Account Manager\n\
             6. Sign in with your Google account\n\
             7. Reboot the device".into()
        ),
    }
}

/// Method 6: Account Manager Launch
/// Directly launches Google Account Manager activity
fn run_account_manager_launch(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Try various Google Account Manager activity paths (different Android versions)
    steps.push(exec(device, "am start -n com.google.android.gsf.login/.AccountIntroActivity"));
    steps.push(exec(device, "am start -n com.google.android.gsf.login/.AccountIntroActivity -a android.intent.action.MAIN"));
    steps.push(exec(device, "am start -a android.intent.action.MAIN -n com.google.android.gsf.login/.AccountIntroActivity"));

    // Try the newer Google account setup
    steps.push(exec(device, "am start -n com.google.android.gms/.setup.ui.GmsSetupActivity"));
    steps.push(exec(device, "am start -n com.google.android.gms/.setup.ui.SetupWizardActivity"));

    // Try account settings intent
    steps.push(exec(device, "am start -a android.settings.ADD_ACCOUNT_SETTINGS"));

    // Try Google account add intent
    steps.push(exec(device, "am start -a android.intent.action.INSERT -t vnd.android.cursor.item/account"));

    let any_success = steps.iter().any(|s| s.success && !s.output.contains("Error") && !s.output.contains("Exception"));

    BypassResult {
        method: FrpMethod::AccountManagerLaunch,
        success: any_success,
        steps,
        message: if any_success {
            "Google Account Manager activity launched. You should see a sign-in screen on the device. Sign in with your Google account to remove FRP.".into()
        } else {
            "Could not launch Account Manager directly. Samsung/Knox may block this activity. Try Emergency Dialer or Browser method instead.".into()
        },
        requires_manual_action: true,
        manual_action_instructions: Some(
            "1. On the device screen, you should see a Google sign-in page\n\
             2. Enter ANY Google account credentials (your own account)\n\
             3. Complete sign-in\n\
             4. Reboot the device\n\
             5. After reboot, you may need to sign in again with the same account, then remove it from Settings > Accounts".into()
        ),
    }
}

/// Method 7: Emergency Dialer Bypass
/// Opens emergency dialer — user can use it to access notifications and settings
fn run_emergency_dialer_bypass(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Open emergency dialer
    steps.push(exec(device, "am start -a android.intent.action.DIAL -d tel:*#06#"));

    // Try opening the emergency dialer directly
    steps.push(exec(device, "am start -n com.android.phone/.EmergencyDialer"));

    // Alternative: dial a number to create call UI
    steps.push(exec(device, "am start -a android.intent.action.CALL -d tel:0000"));

    // Try Samsung emergency launcher
    steps.push(exec(device, "am start -n com.samsung.android.emergencymode/.EmergencyLauncher"));

    BypassResult {
        method: FrpMethod::EmergencyDialerBypass,
        success: steps.iter().any(|s| s.success),
        steps,
        message: "Emergency dialer opened. Follow manual steps below to navigate to settings.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "CLASSIC EMERGENCY DIALER METHOD:\n\
             1. On the emergency dialer, type *#0*# (Samsung test mode)\n\
             2. Tap 'Sensor' or any test button, then quickly tap the notification bar\n\
             3. If notification panel opens, look for a notification with a link to Settings\n\
             \n\
             ALTERNATIVE (PIN notification method):\n\
             1. Insert a SIM card with a PIN code\n\
             2. The PIN entry screen will appear\n\
             3. Enter a wrong PIN — you'll get a notification\n\
             4. Pull down notification shade from the notification\n\
             5. Access Settings from the notification panel\n\
             \n\
             FROM SETTINGS:\n\
             1. Go to Accounts > Add account > Google\n\
             2. Sign in with your Google account\n\
             3. Go back and remove the account\n\
             4. Reboot the device\n\
             5. Set up the device normally".into()
        ),
    }
}

/// Method 8: TalkBack Accessibility Bypass
/// Enables TalkBack to use gesture navigation to reach browser/settings
fn run_talkback_bypass(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Enable TalkBack
    steps.push(exec(device, "settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService"));
    steps.push(exec(device, "settings put secure accessibility_enabled 1"));

    // Also try Samsung TalkBack
    steps.push(exec(device, "settings put secure enabled_accessibility_services com.samsung.accessibility/com.samsung.accessibility.talkback.TalkBackService"));

    // Try via content provider
    steps.push(exec(device, "content insert --uri content://settings/secure --bind name:s:enabled_accessibility_services --bind value:s:com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService"));
    steps.push(exec(device, "content insert --uri content://settings/secure --bind name:s:accessibility_enabled --bind value:s:1"));

    BypassResult {
        method: FrpMethod::TalkBackBypass,
        success: steps.iter().any(|s| s.success),
        steps,
        message: "TalkBack accessibility service enabled. Follow manual steps below.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "TALKBACK GESTURE METHOD:\n\
             1. TalkBack is now active — the device will speak and use gesture navigation\n\
             2. On the setup/FRP screen, draw an 'L' gesture (swipe right then down)\n\
             3. This opens a TalkBack menu — select 'Help & Feedback'\n\
             4. In the Help page, tap any link that opens a browser\n\
             5. In the browser, download FRP_Bypass.apk or QuickShortcutMaker.apk\n\
             6. Install and open the APK\n\
             7. Use QuickShortcutMaker to find 'Google Account Manager'\n\
             8. Open it and sign in with your Google account\n\
             9. Reboot and set up normally\n\
             \n\
             IMPORTANT: After FRP is removed, disable TalkBack:\n\
             - Settings > Accessibility > TalkBack > Off\n\
             Or via ADB: settings put secure accessibility_enabled 0".into()
        ),
    }
}

/// Method 9: SIM PIN Bypass
/// Uses SIM card PIN prompt to get notification access
fn run_sim_pin_bypass(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Check SIM state
    steps.push(exec(device, "getprop gsm.sim.state"));

    // Try to trigger SIM PIN screen
    steps.push(exec(device, "am start -n com.android.phone/.SimPinDialog"));

    // Open phone app
    steps.push(exec(device, "am start -a android.intent.action.DIAL"));

    BypassResult {
        method: FrpMethod::SimPinBypass,
        success: true,
        steps,
        message: "SIM PIN bypass requires a physical SIM card. Follow manual steps below.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "SIM PIN NOTIFICATION METHOD:\n\
             PREREQUISITE: A SIM card with a PIN code set\n\
             \n\
             1. Insert a SIM card that has a PIN code into the phone\n\
             2. The device will show a PIN entry screen\n\
             3. Enter an INCORRECT PIN 3 times\n\
             4. You'll see a 'PIN blocked' or 'PUK required' notification\n\
             5. Pull down the notification shade\n\
             6. Look for a Google/Samsung notification with a clickable link\n\
             7. Tap the link — it may open a browser or settings\n\
             8. From browser: download FRP bypass APK and install it\n\
             9. From settings: go to Accounts > Add Google account\n\
             10. Sign in, reboot, set up normally".into()
        ),
    }
}

/// Method 10: Combination Firmware
/// Informational — requires Odin/Download Mode which can't be done via ADB
fn run_combination_firmware(device: &mut Device) -> BypassResult {
    let steps = vec![
        exec(device, "getprop ro.bootloader"),
        exec(device, "getprop ro.build.display.id"),
        exec(device, "getprop ro.product.model"),
    ];

    BypassResult {
        method: FrpMethod::CombinationFirmware,
        success: false,
        steps,
        message: "Combination firmware method requires Samsung Download Mode and Odin on PC. Cannot be executed via ADB. See instructions below.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "COMBINATION FIRMWARE METHOD:\n\
             This is the MOST RELIABLE method for newer Samsung devices.\n\
             \n\
             PREREQUISITES:\n\
             - Windows PC with Samsung Odin installed\n\
             - Combination firmware for your exact model & CSC\n\
             - Samsung USB drivers installed\n\
             \n\
             STEPS:\n\
             1. Power off the device\n\
             2. Hold Volume Down + Power to enter Download Mode\n\
             3. Connect to PC via USB\n\
             4. Open Odin\n\
             5. Load the combination firmware (.tar.md5) in AP slot\n\
             6. Click Start — wait for flash to complete\n\
             7. Device boots into combination firmware (no FRP)\n\
             8. Enable USB debugging in Developer Options\n\
             9. Use ADB to remove FRP state:\n\
                - adb shell content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1\n\
                - adb shell content insert --uri content://settings/global --bind name:s:device_provisioned --bind value:s:1\n\
             10. Reboot to Download Mode again\n\
             11. Flash STOCK firmware (4-file or 5-file) via Odin\n\
             12. Device boots normally without FRP\n\
             \n\
             WARNING: This will wipe all data. Find combination firmware at samfwd.com or combinationfirmware.com".into()
        ),
    }
}

/// Method 11: Alliance Shield / Knox Bypass
/// Installs Alliance Shield app via ADB to disable Knox components
fn run_alliance_shield_bypass(device: &mut Device) -> BypassResult {
    let steps = vec![
        exec(device, "getprop ro.product.model"),
        exec(device, "getprop ro.hardware.chipname"),
    ];

    BypassResult {
        method: FrpMethod::AllianceShieldBypass,
        success: false,
        steps,
        message: "Alliance Shield method requires sideloading the Alliance Shield APK. See instructions below. NOTE: Only works on Exynos Samsung devices.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "ALLIANCE SHIELD METHOD (Exynos only!):\n\
             \n\
             1. Download Alliance Shield APK from a trusted source\n\
             2. Install via ADB: adb install alliance_shield.apk\n\
             3. Open Alliance Shield on the device\n\
             4. Go to 'FRP Bypass' section\n\
             5. Follow in-app instructions to disable Knox components\n\
             6. The app will handle FRP removal automatically\n\
             \n\
             IMPORTANT:\n\
             - This only works on Exynos chipsets (NOT Snapdragon)\n\
             - You need ADB access to install the APK\n\
             - May not work on very latest security patches\n\
             - Samsung may block Alliance Shield in future updates".into()
        ),
    }
}

/// Method 12: HacKTM Bypass
fn run_hacktm_bypass(device: &mut Device) -> BypassResult {
    let steps = vec![
        exec(device, "getprop ro.product.model"),
        exec(device, "getprop ro.build.version.release"),
    ];

    BypassResult {
        method: FrpMethod::HacktmBypass,
        success: false,
        steps,
        message: "HacKTM method requires the HacKTM APK to be sideloaded. See instructions below.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "HACKTM METHOD:\n\
             1. Download HacKTM APK from a trusted source\n\
             2. Install via ADB: adb install hacktm.apk\n\
             3. Open HacKTM on the device\n\
             4. Select 'Samsung FRP Bypass'\n\
             5. Follow in-app instructions\n\
             6. HacKTM exploits Samsung test mode features\n\
             \n\
             Works best on Android 11-13. May fail on Android 14+.".into()
        ),
    }
}

/// Method 13: Smart Switch Bypass
fn run_smart_switch_bypass(device: &mut Device) -> BypassResult {
    let steps = vec![];

    BypassResult {
        method: FrpMethod::SmartSwitchBypass,
        success: false,
        steps,
        message: "Smart Switch method requires Samsung Smart Switch on a PC. See instructions below.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "SMART SWITCH METHOD:\n\
             Works on OLDER Samsung devices (pre-2022 firmware).\n\
             \n\
             1. Install Samsung Smart Switch on your Windows/Mac PC\n\
             2. Connect the FRP-locked device via USB\n\
             3. Smart Switch may detect the device\n\
             4. If detected, use Smart Switch's 'Software Update & Initialization'\n\
             5. This may allow bypassing the Google verification step\n\
             \n\
             NOTE: This method is patched on most newer firmware versions.".into()
        ),
    }
}

/// Method 14: Samsung Settings Access
/// Opens Samsung Settings directly
fn run_settings_access(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Try to open Settings directly
    steps.push(exec(device, "am start -n com.android.settings/.Settings"));

    // Try Samsung Settings
    steps.push(exec(device, "am start -n com.samsung.android.settings/.Settings"));

    // Try opening Accounts settings directly
    steps.push(exec(device, "am start -a android.settings.SETTINGS"));
    steps.push(exec(device, "am start -a android.settings.SYNC_SETTINGS"));
    steps.push(exec(device, "am start -a android.settings.ADD_ACCOUNT_SETTINGS"));

    // Try opening specific Settings fragments
    steps.push(exec(device, "am start -n com.android.settings/.Settings\\$AccountSettingsActivity"));

    BypassResult {
        method: FrpMethod::SettingsAccess,
        success: steps.iter().any(|s| s.success && !s.output.contains("Error")),
        steps,
        message: if steps.iter().any(|s| s.success) {
            "Settings app launched. Navigate to Accounts to add a Google account.".into()
        } else {
            "Could not launch Settings directly. Samsung Knox may be blocking. Try Emergency Dialer or Browser method.".into()
        },
        requires_manual_action: true,
        manual_action_instructions: Some(
            "1. Settings should now be open on the device\n\
             2. Navigate to: Accounts and backup > Manage accounts > Add account\n\
             3. Select Google\n\
             4. Sign in with your Google account\n\
             5. After signing in, go back and remove the account if needed\n\
             6. Reboot the device\n\
             7. Set up normally — FRP should be removed".into()
        ),
    }
}

/// Method 15: QuickShortcutMaker
/// Launch browser to download QSK, then use it to open Google Account Manager
fn run_quick_shortcut_maker(device: &mut Device) -> BypassResult {
    let mut steps = Vec::new();

    // Try to launch Samsung Browser with QSK download URL
    steps.push(exec(device, "am start -a android.intent.action.VIEW -d https://frpbypass.net/quickshortcutmaker -p com.sec.android.app.sbrowser"));

    // Fallback: launch Chrome
    steps.push(exec(device, "am start -a android.intent.action.VIEW -d https://frpbypass.net/quickshortcutmaker -p com.android.chrome"));

    // Try launching QSK if already installed
    steps.push(exec(device, "am start -n com.eltechs.es.qsk/com.eltechs.es.qsk.Main"));

    BypassResult {
        method: FrpMethod::QuickShortcutMaker,
        success: steps.iter().any(|s| s.success),
        steps,
        message: "Browser opened for QuickShortcutMaker download. Follow manual steps below.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "QUICKSHORTCUTMAKER METHOD:\n\
             1. Browser should be open — download QuickShortcutMaker APK\n\
             2. Install the APK (allow unknown sources if prompted)\n\
             3. Open QuickShortcutMaker\n\
             4. Search for 'Google Account Manager'\n\
             5. Tap on it, then tap 'Try'\n\
             6. You'll see the Google sign-in screen\n\
             7. Sign in with ANY Google account\n\
             8. After sign-in, go back\n\
             9. Tap the 3-dot menu > 'Sign in' to save the shortcut\n\
             10. Reboot the device\n\
             11. After reboot, you'll be asked for the same Google account\n\
             12. Enter the same account, then remove it in Settings > Accounts\n\
             13. Factory reset or continue setup normally".into()
        ),
    }
}

/// Run the recommended auto-bypass sequence for a device
/// Tries the safest methods first, escalating if they fail
pub fn run_auto_bypass(device: &mut Device) -> BypassResult {
    // Try methods in order of safety and reliability
    let methods = vec![
        FrpMethod::SetupWizardDisable,
        FrpMethod::DeviceProvisioning,
        FrpMethod::ContentProviderBypass,
    ];

    let mut all_steps = Vec::new();
    let mut last_result: Option<BypassResult> = None;

    for method in &methods {
        let result = run_bypass_method(device, method);
        let succeeded = result.success && !result.requires_manual_action;
        all_steps.extend(result.steps.clone());

        last_result = Some(BypassResult {
            method: method.clone(),
            success: succeeded,
            steps: all_steps.clone(),
            message: if succeeded {
                format!("Auto-bypass succeeded using {} method. {}", method.label(), result.message)
            } else {
                format!("{} failed, trying next method... ", method.label())
            },
            requires_manual_action: !succeeded,
            manual_action_instructions: if !succeeded {
                Some("Automatic methods failed. Try Emergency Dialer or TalkBack methods manually.".into())
            } else {
                result.manual_action_instructions
            },
        });

        if succeeded {
            return last_result.unwrap();
        }
    }

    // If all auto methods failed, suggest manual methods
    BypassResult {
        method: FrpMethod::EmergencyDialerBypass,
        success: false,
        steps: all_steps,
        message: "Automatic ADB bypass methods were blocked. This device likely has strong Samsung Knox protection. Try manual methods: Emergency Dialer, TalkBack, or Combination Firmware.".into(),
        requires_manual_action: true,
        manual_action_instructions: Some(
            "RECOMMENDED MANUAL APPROACH (in order):\n\
             \n\
             1. EMERGENCY DIALER — Dial *#06# or *#0*#, use test menu to access notifications\n\
             2. TALKBACK — Enable TalkBack via ADB, use 'L' gesture to reach browser\n\
             3. BROWSER — Launch browser, download QuickShortcutMaker or FRP_Bypass.apk\n\
             4. COMBINATION FIRMWARE — Flash via Odin (most reliable, requires PC)\n\
             \n\
             Select any method above to see step-by-step instructions.".into()
        ),
    }
}
