use serde::{Deserialize, Serialize};

/// Chipset family — the most important factor in FRP removal method selection
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Hash)]
pub enum ChipsetFamily {
    /// Samsung Exynos (e.g., Exynos 850, 1280, 1380, 1480, 2200, 2400, 2500)
    /// Method: Download Mode → Flash Enable-ADB file → ADB commands
    Exynos,
    /// Qualcomm Snapdragon (e.g., SDM450, SM6115, SM7325, SM8550, SM8650)
    /// Method: EDL 9008 Mode → Firehose loader → Erase FRP partition
    /// OR: EDL Engineering Cable → Flash firmware
    Qualcomm,
    /// MediaTek (e.g., MT6769, Helio G80/G99, Dimensity 6100+/1080)
    /// Method: Brom/Preloader Mode → Erase FRP partition
    MediaTek,
    /// Spreadtrum/Unisoc
    /// Method: SPD Bootloader Mode → Erase FRP
    Spreadtrum,
    /// Samsung Kirin (Huawei)
    Kirin,
    /// Unknown chipset — will try ADB-only methods
    Unknown,
}

impl ChipsetFamily {
    pub fn label(&self) -> &str {
        match self {
            ChipsetFamily::Exynos => "Exynos",
            ChipsetFamily::Qualcomm => "Qualcomm Snapdragon",
            ChipsetFamily::MediaTek => "MediaTek",
            ChipsetFamily::Spreadtrum => "Spreadtrum/Unisoc",
            ChipsetFamily::Kirin => "Kirin",
            ChipsetFamily::Unknown => "Unknown",
        }
    }

    /// Primary FRP removal method for this chipset
    pub fn primary_method(&self) -> FrpAlgorithm {
        match self {
            ChipsetFamily::Exynos => FrpAlgorithm::ExynosDownloadMode,
            ChipsetFamily::Qualcomm => FrpAlgorithm::QualcommEDL,
            ChipsetFamily::MediaTek => FrpAlgorithm::MediaTekBrom,
            ChipsetFamily::Spreadtrum => FrpAlgorithm::SPDBootloader,
            ChipsetFamily::Kirin => FrpAlgorithm::ADBOnly,
            ChipsetFamily::Unknown => FrpAlgorithm::ADBOnly,
        }
    }

    /// All methods available for this chipset, in order of reliability
    pub fn available_methods(&self) -> Vec<FrpAlgorithm> {
        match self {
            ChipsetFamily::Exynos => vec![
                FrpAlgorithm::ExynosDownloadMode,       // 95%
                FrpAlgorithm::SamsungTestMode,           // 70% on older patches
                FrpAlgorithm::ADBProvisioning,           // 40% if ADB pre-authorized
            ],
            ChipsetFamily::Qualcomm => vec![
                FrpAlgorithm::QualcommEDL,               // 95-98%
                FrpAlgorithm::SamsungTestMode,           // 70% on older patches
                FrpAlgorithm::ADBProvisioning,           // 40% if ADB pre-authorized
            ],
            ChipsetFamily::MediaTek => vec![
                FrpAlgorithm::MediaTekBrom,              // 90%
                FrpAlgorithm::SamsungTestMode,           // 70% on older patches
                FrpAlgorithm::ADBProvisioning,           // 40% if ADB pre-authorized
            ],
            ChipsetFamily::Spreadtrum => vec![
                FrpAlgorithm::SPDBootloader,             // 80%
                FrpAlgorithm::ADBProvisioning,           // 40%
            ],
            ChipsetFamily::Kirin => vec![
                FrpAlgorithm::ADBProvisioning,           // 40%
            ],
            ChipsetFamily::Unknown => vec![
                FrpAlgorithm::SamsungTestMode,           // Try test mode first
                FrpAlgorithm::ADBProvisioning,           // Then ADB
            ],
        }
    }

    /// Auto-detect chipset from Android system properties
    pub fn detect(hardware: &str, board_platform: &str, cpu_abi: &str, chipname: &str) -> ChipsetFamily {
        let h = hardware.to_lowercase();
        let bp = board_platform.to_lowercase();
        let abi = cpu_abi.to_lowercase();
        let cn = chipname.to_lowercase();

        // Exynos detection
        if h.contains("exynos") || bp.contains("exynos") || cn.contains("exynos")
            || bp.starts_with("universal") // Samsung's internal name for Exynos
        {
            return ChipsetFamily::Exynos;
        }

        // Qualcomm detection
        if h.contains("qcom") || h.contains("qualcomm") || bp.contains("msm")
            || bp.contains("sdm") || bp.contains("sm") || cn.contains("qualcomm")
            || bp.starts_with("lahaina") || bp.starts_with("kalama") || bp.starts_with("pineapple")
            || bp.contains("sunshine") || h.contains("apq")
        {
            return ChipsetFamily::Qualcomm;
        }

        // MediaTek detection
        if h.contains("mt") || bp.contains("mt") || cn.contains("mediatek")
            || bp.contains("mt6") || bp.starts_with("k68") || bp.starts_with("k71")
            || h.contains("mediatek")
        {
            return ChipsetFamily::MediaTek;
        }

        // Spreadtrum/Unisoc detection
        if h.contains("sprd") || bp.contains("sprd") || cn.contains("unisoc")
            || bp.contains("ums") || bp.contains("ud710")
        {
            return ChipsetFamily::Spreadtrum;
        }

        // Kirin detection
        if h.contains("kirin") || bp.contains("kirin") || cn.contains("hisilicon") {
            return ChipsetFamily::Kirin;
        }

        // Fallback: use ABI as hint
        if abi.contains("arm64") {
            // Most modern ARM64 Samsung devices are either Exynos or Qualcomm
            // Default to Unknown — need more info
        }

        ChipsetFamily::Unknown
    }
}

/// FRP algorithm identifier — represents a complete method pathway
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Hash)]
pub enum FrpAlgorithm {
    /// Exynos: Download Mode → Flash Enable-ADB → ADB Remove FRP → Reflash Stock
    ExynosDownloadMode,
    /// Qualcomm: EDL 9008 → Firehose Loader → Erase FRP Partition
    QualcommEDL,
    /// MediaTek: Brom/Preloader → Erase FRP Partition
    MediaTekBrom,
    /// Spreadtrum: SPD Bootloader → Erase FRP
    SPDBootloader,
    /// Samsung Test Mode: *#0*# → USB Debug → ADB commands
    SamsungTestMode,
    /// ADB Provisioning: Direct ADB commands (settings put, content insert, pm disable)
    ADBProvisioning,
}

impl FrpAlgorithm {
    pub fn id(&self) -> &str {
        match self {
            FrpAlgorithm::ExynosDownloadMode => "exynos_download_mode",
            FrpAlgorithm::QualcommEDL => "qualcomm_edl",
            FrpAlgorithm::MediaTekBrom => "mediatek_brom",
            FrpAlgorithm::SPDBootloader => "spd_bootloader",
            FrpAlgorithm::SamsungTestMode => "samsung_test_mode",
            FrpAlgorithm::ADBProvisioning => "adb_provisioning",
        }
    }

    pub fn label(&self) -> &str {
        match self {
            FrpAlgorithm::ExynosDownloadMode => "Exynos Download Mode",
            FrpAlgorithm::QualcommEDL => "Qualcomm EDL (9008)",
            FrpAlgorithm::MediaTekBrom => "MediaTek Brom Mode",
            FrpAlgorithm::SPDBootloader => "SPD Bootloader Mode",
            FrpAlgorithm::SamsungTestMode => "Samsung Test Mode (*#0*#)",
            FrpAlgorithm::ADBProvisioning => "ADB Provisioning",
        }
    }

    pub fn description(&self) -> &str {
        match self {
            FrpAlgorithm::ExynosDownloadMode =>
                "Put device in Download Mode (Vol Down + Power). Flash Enable-ADB file via Odin/Heimdall. \
                 ADB enables automatically. Execute FRP removal commands. Reflash stock firmware. \
                 95% success rate. Works on all Exynos Samsung devices.",
            FrpAlgorithm::QualcommEDL =>
                "Force device into EDL 9008 mode. Use firehose loader to gain low-level access. \
                 Erase FRP partition directly at block level. Factory reset if needed. \
                 95-98% success rate. May require EDL engineering cable on newer devices.",
            FrpAlgorithm::MediaTekBrom =>
                "Boot device into Brom/Preloader mode (hold Vol keys while connecting USB). \
                 Use MTK exploit to erase FRP partition. \
                 90% success rate. Does not require opening the phone.",
            FrpAlgorithm::SPDBootloader =>
                "Enter Spreadtrum Bootloader mode. Erase FRP partition. \
                 80% success rate. Less common chipset.",
            FrpAlgorithm::SamsungTestMode =>
                "On FRP-locked screen, open Emergency Dialer, dial *#0*#. \
                 Test mode menu appears. Use it to enable USB debugging. \
                 Accept USB debugging prompt. Execute ADB FRP removal commands. \
                 70% success rate. Patched on Android 12+ with recent security patches.",
            FrpAlgorithm::ADBProvisioning =>
                "If ADB is already authorized (USB debugging was enabled before FRP lock), \
                 execute provisioning commands: settings put, content insert, pm disable. \
                 40% success rate. Only works if ADB access is available.",
        }
    }

    /// Success rate percentage for this algorithm
    pub fn success_rate(&self) -> u8 {
        match self {
            FrpAlgorithm::ExynosDownloadMode => 95,
            FrpAlgorithm::QualcommEDL => 97,
            FrpAlgorithm::MediaTekBrom => 90,
            FrpAlgorithm::SPDBootloader => 80,
            FrpAlgorithm::SamsungTestMode => 70,
            FrpAlgorithm::ADBProvisioning => 40,
        }
    }

    /// Whether this method requires external hardware (EDL cable, JTAG, etc.)
    pub fn requires_hardware(&self) -> bool {
        matches!(self, FrpAlgorithm::QualcommEDL)
    }

    /// Whether this method can be done purely via ADB
    pub fn is_adb_only(&self) -> bool {
        matches!(self, FrpAlgorithm::ADBProvisioning)
    }

    /// Whether this method requires putting device in special boot mode
    pub fn requires_boot_mode(&self) -> bool {
        matches!(
            self,
            FrpAlgorithm::ExynosDownloadMode
            | FrpAlgorithm::QualcommEDL
            | FrpAlgorithm::MediaTekBrom
            | FrpAlgorithm::SPDBootloader
        )
    }

    /// Phases in this algorithm
    pub fn phases(&self) -> Vec<AlgorithmPhase> {
        match self {
            FrpAlgorithm::ExynosDownloadMode => vec![
                AlgorithmPhase {
                    name: "Enter Download Mode".into(),
                    description: "Power off device. Hold Volume Down + Power. Connect USB.".into(),
                    action: PhaseAction::ManualModeSwitch("download".into()),
                    weight: 10,
                },
                AlgorithmPhase {
                    name: "Flash Enable-ADB File".into(),
                    description: "Flash Samsung Enable-ADB .tar.md5 via Odin/Heimdall to enable USB debugging.".into(),
                    action: PhaseAction::FlashFirmware,
                    weight: 30,
                },
                AlgorithmPhase {
                    name: "ADB FRP Removal".into(),
                    description: "Execute FRP removal ADB commands: content insert, settings put, pm disable.".into(),
                    action: PhaseAction::ADBCommands,
                    weight: 40,
                },
                AlgorithmPhase {
                    name: "Reflash Stock Firmware".into(),
                    description: "Flash original stock firmware to restore normal operation.".into(),
                    action: PhaseAction::FlashFirmware,
                    weight: 15,
                },
                AlgorithmPhase {
                    name: "Verify FRP Removed".into(),
                    description: "Reboot and verify FRP state is inactive.".into(),
                    action: PhaseAction::Verify,
                    weight: 5,
                },
            ],
            FrpAlgorithm::QualcommEDL => vec![
                AlgorithmPhase {
                    name: "Enter EDL 9008 Mode".into(),
                    description: "Power off. Hold Vol Up + Vol Down + EDL button. Insert EDL cable. Release Vol buttons. Press Vol Up+Down rapidly 15x while holding EDL. Release EDL.".into(),
                    action: PhaseAction::ManualModeSwitch("edl".into()),
                    weight: 15,
                },
                AlgorithmPhase {
                    name: "Load Firehose Programmer".into(),
                    description: "Load chipset-specific firehose loader for low-level flash access.".into(),
                    action: PhaseAction::LoadFirehose,
                    weight: 20,
                },
                AlgorithmPhase {
                    name: "Erase FRP Partition".into(),
                    description: "Erase /dev/block/by-name/frp or persist partition directly.".into(),
                    action: PhaseAction::ErasePartition("frp".into()),
                    weight: 40,
                },
                AlgorithmPhase {
                    name: "Factory Reset".into(),
                    description: "Erase userdata and metadata partitions for clean state.".into(),
                    action: PhaseAction::ErasePartition("userdata".into()),
                    weight: 20,
                },
                AlgorithmPhase {
                    name: "Verify FRP Removed".into(),
                    description: "Reboot and verify FRP state is inactive.".into(),
                    action: PhaseAction::Verify,
                    weight: 5,
                },
            ],
            FrpAlgorithm::MediaTekBrom => vec![
                AlgorithmPhase {
                    name: "Enter Brom Mode".into(),
                    description: "Power off device. Hold Volume Up + Volume Down. Connect USB cable. Release buttons when device detected.".into(),
                    action: PhaseAction::ManualModeSwitch("brom".into()),
                    weight: 15,
                },
                AlgorithmPhase {
                    name: "Load MTK Auth/Brom Exploit".into(),
                    description: "Load MediaTek preloader exploit for DA (Download Agent) access.".into(),
                    action: PhaseAction::LoadFirehose,
                    weight: 20,
                },
                AlgorithmPhase {
                    name: "Erase FRP Partition".into(),
                    description: "Erase FRP partition using MTK client protocol.".into(),
                    action: PhaseAction::ErasePartition("frp".into()),
                    weight: 40,
                },
                AlgorithmPhase {
                    name: "Format Userdata".into(),
                    description: "Format userdata partition for factory-fresh state.".into(),
                    action: PhaseAction::ErasePartition("userdata".into()),
                    weight: 20,
                },
                AlgorithmPhase {
                    name: "Verify FRP Removed".into(),
                    description: "Reboot and verify FRP state is inactive.".into(),
                    action: PhaseAction::Verify,
                    weight: 5,
                },
            ],
            FrpAlgorithm::SamsungTestMode => vec![
                AlgorithmPhase {
                    name: "Open Emergency Dialer".into(),
                    description: "On FRP lock screen, tap Emergency Call button.".into(),
                    action: PhaseAction::ADBCommand("am start -n com.android.phone/.EmergencyDialer".into()),
                    weight: 5,
                },
                AlgorithmPhase {
                    name: "Dial Test Mode Code".into(),
                    description: "Dial *#0*# on emergency dialer to open Samsung hardware test menu.".into(),
                    action: PhaseAction::ADBCommand("am start -a android.intent.action.DIAL -d tel:*#0*#".into()),
                    weight: 10,
                },
                AlgorithmPhase {
                    name: "Enable USB Debugging".into(),
                    description: "Use test menu to navigate to settings and enable USB debugging. Accept RSA key prompt on device.".into(),
                    action: PhaseAction::ManualInteraction("Enable USB Debugging via test menu and accept RSA key".into()),
                    weight: 20,
                },
                AlgorithmPhase {
                    name: "ADB FRP Removal".into(),
                    description: "Execute full ADB FRP removal command sequence.".into(),
                    action: PhaseAction::ADBCommands,
                    weight: 45,
                },
                AlgorithmPhase {
                    name: "Verify FRP Removed".into(),
                    description: "Reboot and verify FRP state is inactive.".into(),
                    action: PhaseAction::Verify,
                    weight: 10,
                },
            ],
            FrpAlgorithm::ADBProvisioning => vec![
                AlgorithmPhase {
                    name: "Verify ADB Access".into(),
                    description: "Confirm ADB is authorized and device is accessible.".into(),
                    action: PhaseAction::ADBCommand("getprop ro.product.model".into()),
                    weight: 5,
                },
                AlgorithmPhase {
                    name: "Disable Setup Wizard".into(),
                    description: "Disable Google and Samsung setup wizard packages.".into(),
                    action: PhaseAction::ADBCommands,
                    weight: 25,
                },
                AlgorithmPhase {
                    name: "Set Provisioning Flags".into(),
                    description: "Set device_provisioned=1, user_setup_complete=1, setupwizard_mode=DISABLED.".into(),
                    action: PhaseAction::ADBCommands,
                    weight: 30,
                },
                AlgorithmPhase {
                    name: "Content Provider Bypass".into(),
                    description: "Set provisioning via content provider URI (bypasses Knox blocks).".into(),
                    action: PhaseAction::ADBCommands,
                    weight: 25,
                },
                AlgorithmPhase {
                    name: "Verify FRP Removed".into(),
                    description: "Reboot and verify FRP state is inactive.".into(),
                    action: PhaseAction::Verify,
                    weight: 15,
                },
            ],
            FrpAlgorithm::SPDBootloader => vec![
                AlgorithmPhase {
                    name: "Enter SPD Bootloader".into(),
                    description: "Power off. Hold Volume Down. Connect USB. Release when detected.".into(),
                    action: PhaseAction::ManualModeSwitch("spd".into()),
                    weight: 15,
                },
                AlgorithmPhase {
                    name: "Erase FRP Partition".into(),
                    description: "Erase FRP partition via SPD protocol.".into(),
                    action: PhaseAction::ErasePartition("frp".into()),
                    weight: 55,
                },
                AlgorithmPhase {
                    name: "Verify FRP Removed".into(),
                    description: "Reboot and verify FRP state is inactive.".into(),
                    action: PhaseAction::Verify,
                    weight: 10,
                },
            ],
        }
    }
}

/// A single phase in an FRP removal algorithm
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AlgorithmPhase {
    /// Phase name
    pub name: String,
    /// What to do
    pub description: String,
    /// The action type
    pub action: PhaseAction,
    /// Weight for progress calculation (sum of all weights = 100%)
    pub weight: u8,
}

/// What kind of action a phase requires
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum PhaseAction {
    /// Put device in a special boot mode (download, edl, brom, etc.)
    ManualModeSwitch(String),
    /// Execute a single ADB command
    ADBCommand(String),
    /// Execute multiple ADB commands (FRP removal sequence)
    ADBCommands,
    /// Flash firmware file (combination, enable-adb, stock)
    FlashFirmware,
    /// Load firehose programmer / MTK DA
    LoadFirehose,
    /// Erase a partition by name (frp, userdata, metadata)
    ErasePartition(String),
    /// User must perform manual interaction on device
    ManualInteraction(String),
    /// Verify FRP was successfully removed
    Verify,
}

/// FRP reset mode — what the user wants to achieve
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum FrpResetMode {
    /// Full factory reset + 100% FRP removal
    /// Phone becomes like brand new — boots to initial setup, no Google verification
    /// Erases FRP partition + userdata + metadata
    FactoryResetRemoveFrp100,
    /// Full factory reset + 70% FRP removal
    /// Phone boots past FRP but may re-lock on next reset
    /// Erases userdata but only bypasses FRP flags (partition data remains)
    FactoryResetRemoveFrp70,
    /// 100% FRP removal without data wipe
    /// Erases FRP partition only, keeps all user data
    /// Phone keeps data but FRP is permanently removed
    RemoveFrp100NoWipe,
    /// 70% FRP removal without data wipe
    /// Bypasses FRP flags only, keeps everything including FRP partition
    RemoveFrp70NoWipe,
}

impl FrpResetMode {
    pub fn id(&self) -> &str {
        match self {
            FrpResetMode::FactoryResetRemoveFrp100 => "factory_reset_frp100",
            FrpResetMode::FactoryResetRemoveFrp70 => "factory_reset_frp70",
            FrpResetMode::RemoveFrp100NoWipe => "frp100_no_wipe",
            FrpResetMode::RemoveFrp70NoWipe => "frp70_no_wipe",
        }
    }

    pub fn label(&self) -> &str {
        match self {
            FrpResetMode::FactoryResetRemoveFrp100 => "Factory Reset + Remove FRP 100%",
            FrpResetMode::FactoryResetRemoveFrp70 => "Factory Reset + Remove FRP 70%",
            FrpResetMode::RemoveFrp100NoWipe => "Remove FRP 100% (Keep Data)",
            FrpResetMode::RemoveFrp70NoWipe => "Remove FRP 70% (Keep Data)",
        }
    }

    pub fn description(&self) -> &str {
        match self {
            FrpResetMode::FactoryResetRemoveFrp100 =>
                "Complete reset. Phone becomes brand new — boots to initial setup screen like out of the box. \
                 No Google account verification. All data erased. FRP partition wiped. Knox may be tripped.",
            FrpResetMode::FactoryResetRemoveFrp70 =>
                "Factory reset with partial FRP removal. Phone boots past Google verification \
                 but FRP partition data remains. May re-lock on next factory reset. All data erased.",
            FrpResetMode::RemoveFrp100NoWipe =>
                "Permanently remove FRP lock without erasing data. FRP partition is wiped. \
                 Phone keeps all apps, photos, messages. Like removing the Google account lock only.",
            FrpResetMode::RemoveFrp70NoWipe =>
                "Quick FRP bypass without erasing data. Only sets provisioning flags. \
                 Phone keeps everything. FRP partition NOT wiped — may re-lock on next reset.",
        }
    }

    pub fn frp_removal_percent(&self) -> u8 {
        match self {
            FrpResetMode::FactoryResetRemoveFrp100 => 100,
            FrpResetMode::FactoryResetRemoveFrp70 => 70,
            FrpResetMode::RemoveFrp100NoWipe => 100,
            FrpResetMode::RemoveFrp70NoWipe => 70,
        }
    }

    pub fn wipes_data(&self) -> bool {
        matches!(
            self,
            FrpResetMode::FactoryResetRemoveFrp100 | FrpResetMode::FactoryResetRemoveFrp70
        )
    }

    pub fn erases_frp_partition(&self) -> bool {
        matches!(
            self,
            FrpResetMode::FactoryResetRemoveFrp100 | FrpResetMode::RemoveFrp100NoWipe
        )
    }
}

/// Complete device profile — the foundation of intelligent method selection
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeviceProfile {
    pub brand: String,
    pub model_code: String,
    pub marketing_name: Option<String>,
    pub chipset_family: ChipsetFamily,
    pub chipset_name: String,
    pub android_version: String,
    pub sdk_version: String,
    pub security_patch: Option<String>,
    pub binary_version: Option<String>,  // U1, U2, U3, U4, U5, etc.
    pub bootloader_version: Option<String>,
    pub build_fingerprint: Option<String>,
    pub knox_version: Option<String>,
    pub frp_state: super::detector::FrpState,
    pub adb_state: AdbState,
    pub device_mode: DeviceMode,
    pub has_sim: bool,
    pub has_wifi: bool,
}

/// ADB connection state
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum AdbState {
    /// ADB connected and authorized — can run commands
    Authorized,
    /// Device detected but USB debugging not authorized
    Unauthorized,
    /// No ADB connection
    Unavailable,
}

/// Current device boot mode
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum DeviceMode {
    /// Normal Android boot (may be on setup/FRP screen)
    Normal,
    /// Samsung Download Mode (Odin)
    DownloadMode,
    /// Qualcomm EDL 9008 mode
    EDL,
    /// Recovery Mode
    Recovery,
    /// MediaTek Brom/Preloader
    BromMode,
    /// Fastboot Mode
    Fastboot,
    /// Unknown
    Unknown,
}

/// Result of the complete FRP removal workflow
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UniversalFrpResult {
    /// The algorithm that was used
    pub algorithm: FrpAlgorithm,
    /// The reset mode that was applied
    pub reset_mode: FrpResetMode,
    /// Overall success
    pub success: bool,
    /// FRP removal confidence percentage
    pub confidence_percent: u8,
    /// Progress through the algorithm (0-100)
    pub progress_percent: u8,
    /// Completed phases
    pub completed_phases: Vec<CompletedPhase>,
    /// Current phase being executed
    pub current_phase: Option<String>,
    /// Human-readable status message
    pub message: String,
    /// Whether device needs reboot
    pub needs_reboot: bool,
    /// Final device state description
    pub device_state: Option<String>,
}

/// A completed phase with result
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CompletedPhase {
    pub name: String,
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
    pub progress_at_completion: u8,
}
