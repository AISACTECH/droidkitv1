import { invoke } from '@tauri-apps/api/core';

// ==================== FRP Types ====================

export type FrpState = 'Active' | 'Inactive' | 'Unknown';

export interface FrpDetectionResult {
  frp_state: FrpState;
  google_accounts: string[];
  setup_wizard_running: boolean;
  device_provisioned: boolean;
  user_setup_complete: boolean;
  frp_pst: string | null;
  oem_unlock_allowed: boolean | null;
  knox_warranty_void: boolean | null;
  security_patch: string | null;
  bootloader: string | null;
  fingerprint: string | null;
  model_code: string | null;
  marketing_name: string | null;
}

export interface FrpMethod {
  id: string;
  label: string;
  description: string;
  risk_level: string;
  is_adb_method: boolean;
  requires_download_mode: boolean;
}

export interface SamsungModel {
  model_code: string;
  marketing_name: string;
  chipset: string;
  android_versions: string[];
  supported_methods: string[];
  max_security_patch: string | null;
  notes: string | null;
  requires_preauthorized_adb: boolean;
  supports_download_mode: boolean;
  combination_firmware_available: boolean;
}

export interface BypassStepResult {
  command: string;
  success: boolean;
  output: string;
  error: string | null;
}

export interface BypassResult {
  method: FrpMethod | string;
  success: boolean;
  steps: BypassStepResult[];
  message: string;
  requires_manual_action: boolean;
  manual_action_instructions: string | null;
}

// ==================== Universal Algorithm Types ====================

export type ChipsetFamily = 'Exynos' | 'Qualcomm' | 'MediaTek' | 'Spreadtrum' | 'Kirin' | 'Unknown';

export type FrpAlgorithmId = 'exynos_download_mode' | 'qualcomm_edl' | 'mediatek_brom' | 'spd_bootloader' | 'samsung_test_mode' | 'adb_provisioning';

export type AdbState = 'Authorized' | 'Unauthorized' | 'Unavailable';

export type DeviceMode = 'Normal' | 'DownloadMode' | 'EDL' | 'Recovery' | 'BromMode' | 'Fastboot' | 'Unknown';

export interface DeviceProfile {
  brand: string;
  model_code: string;
  marketing_name: string | null;
  chipset_family: ChipsetFamily;
  chipset_name: string;
  android_version: string;
  sdk_version: string;
  security_patch: string | null;
  binary_version: string | null;
  bootloader_version: string | null;
  build_fingerprint: string | null;
  knox_version: string | null;
  frp_state: FrpState;
  adb_state: AdbState;
  device_mode: DeviceMode;
  has_sim: boolean;
  has_wifi: boolean;
}

export type PhaseAction =
  | { ManualModeSwitch: string }
  | { ADBCommand: string }
  | 'ADBCommands'
  | 'FlashFirmware'
  | 'LoadFirehose'
  | { ErasePartition: string }
  | { ManualInteraction: string }
  | 'Verify';

export interface AlgorithmPhase {
  name: string;
  description: string;
  action: PhaseAction;
  weight: number;
}

export interface FrpAlgorithmInfo {
  id: string;
  label: string;
  description: string;
  success_rate: number;
  requires_hardware: boolean;
  is_adb_only: boolean;
  requires_boot_mode: boolean;
  phases: AlgorithmPhase[];
}

export interface FrpResetModeInfo {
  id: string;
  label: string;
  description: string;
  frp_removal_percent: number;
  wipes_data: boolean;
  erases_frp_partition: boolean;
}

// ==================== FRP Commands ====================

export const frpDetect = (deviceSerial: string): Promise<FrpDetectionResult> =>
  invoke('frp_detect', { deviceSerial });

export const frpRunMethod = (deviceSerial: string, methodId: string): Promise<BypassResult> =>
  invoke('frp_run_method', { deviceSerial, methodId });

export const frpAutoBypass = (deviceSerial: string): Promise<BypassResult> =>
  invoke('frp_auto_bypass', { deviceSerial });

export const frpGetDeviceDatabase = (): Promise<SamsungModel[]> =>
  invoke('frp_get_device_database');

export const frpLookupModel = (modelCode: string): Promise<SamsungModel | null> =>
  invoke('frp_lookup_model', { modelCode });

export const frpSearchModels = (query: string): Promise<SamsungModel[]> =>
  invoke('frp_search_models', { query });

export const frpListSupportedModels = (): Promise<SamsungModel[]> =>
  invoke('frp_list_supported_models');

export const frpGetAllMethods = (): Promise<FrpMethod[]> =>
  invoke('frp_get_all_methods');

// ==================== Universal Algorithm Commands ====================

export const frpDetectChipset = (deviceSerial: string): Promise<ChipsetFamily> =>
  invoke('frp_detect_chipset', { deviceSerial });

export const frpBuildDeviceProfile = (deviceSerial: string): Promise<DeviceProfile> =>
  invoke('frp_build_device_profile', { deviceSerial });

export const frpGetRecommendedAlgorithm = (chipset: ChipsetFamily): Promise<FrpAlgorithmInfo> =>
  invoke('frp_get_recommended_algorithm', { chipset });

export const frpGetChipsetAlgorithms = (chipset: ChipsetFamily): Promise<FrpAlgorithmInfo[]> =>
  invoke('frp_get_chipset_algorithms', { chipset });

export const frpGetResetModes = (): Promise<FrpResetModeInfo[]> =>
  invoke('frp_get_reset_modes');

export const frpGetAlgorithmPhases = (algorithmId: string): Promise<AlgorithmPhase[]> =>
  invoke('frp_get_algorithm_phases', { algorithmId });

// ==================== Tecno FRP Types ====================

export interface TecnoModel {
  marketing_name: string;
  series: string;
  chipset: string;
  chipset_family: string;
  android_versions: string[];
  supported_methods: string[];
  max_security_patch: string | null;
  notes: string | null;
  requires_preauthorized_adb: boolean;
  has_mtk_auth: boolean;
  available_in_kenya: boolean;
}

export interface TecnoFrpMethod {
  id: string;
  label: string;
  description: string;
  risk_level: string;
  is_hardware_method: boolean;
  is_adb_method: boolean;
}

// ==================== Tecno FRP Commands ====================

export const frpGetTecnoDatabase = (): Promise<TecnoModel[]> =>
  invoke('frp_get_tecno_database');

export const frpLookupTecnoModel = (name: string): Promise<TecnoModel | null> =>
  invoke('frp_lookup_tecno_model', { name });

export const frpSearchTecnoModels = (query: string): Promise<TecnoModel[]> =>
  invoke('frp_search_tecno_models', { query });

export const frpListTecnoModels = (): Promise<TecnoModel[]> =>
  invoke('frp_list_tecno_models');

export const frpGetTecnoBySeries = (series: string): Promise<TecnoModel[]> =>
  invoke('frp_get_tecno_by_series', { series });

export const frpGetTecnoByChipset = (family: string): Promise<TecnoModel[]> =>
  invoke('frp_get_tecno_by_chipset', { family });

export const frpGetTecnoMethods = (): Promise<TecnoFrpMethod[]> =>
  invoke('frp_get_tecno_methods');

// ==================== Q4 FRP Commands ====================

export const frpGetQ4Database = (): Promise<TecnoModel[]> =>
  invoke('frp_get_q4_database');

export const frpSearchQ4Models = (query: string): Promise<TecnoModel[]> =>
  invoke('frp_search_q4_models', { query });

export const frpGetQ4ByBrand = (brand: string): Promise<TecnoModel[]> =>
  invoke('frp_get_q4_by_brand', { brand });
