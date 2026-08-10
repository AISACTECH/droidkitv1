import { mockIPC } from '@tauri-apps/api/mocks';
import { SAMSUNG_MODELS } from './samsung';
import { TECNO_MODELS } from './tecno';
import { Q4_MODELS } from './q4';
import type { DeviceInfo } from '../tauri-commands';
import type { FrpDetectionResult, DeviceProfile, FrpAlgorithmInfo, FrpResetModeInfo } from '../lib/frp-commands';

const MOCK_DEVICE_SAMSUNG: DeviceInfo = {
  transport: 'USB',
  serial_no: 'RF8M10XXXXX',
  model: 'SM-A055F',
  android_version: '13',
  sdk_version: '33',
};

const MOCK_DEVICE_TECNO: DeviceInfo = {
  transport: 'USB',
  serial_no: 'TECNO0987654321',
  model: 'Pop 8',
  android_version: '13',
  sdk_version: '33',
};

const MOCK_DETECTION: FrpDetectionResult = {
  frp_state: 'Active',
  google_accounts: ['user@gmail.com'],
  setup_wizard_running: true,
  device_provisioned: false,
  user_setup_complete: false,
  frp_pst: '/dev/block/platform/bootdevice/by-name/frp',
  oem_unlock_allowed: false,
  knox_warranty_void: false,
  security_patch: '2024-03',
  bootloader: 'A055FXXU4',
  fingerprint: 'samsung/a05/a05:13',
  model_code: 'SM-A055F',
  marketing_name: 'Galaxy A05',
};

const MOCK_PROFILE: DeviceProfile = {
  brand: 'Samsung',
  model_code: 'SM-A055F',
  marketing_name: 'Galaxy A05',
  chipset_family: 'MediaTek',
  chipset_name: 'MediaTek Helio G85',
  android_version: '13',
  sdk_version: '33',
  security_patch: '2024-03',
  binary_version: 'U4',
  bootloader_version: 'A055FXXU4',
  build_fingerprint: 'samsung/a05/a05:13',
  knox_version: '3.9',
  frp_state: 'Active',
  adb_state: 'Authorized',
  device_mode: 'Normal',
  has_sim: true,
  has_wifi: true,
};

const MOCK_ALGORITHMS: FrpAlgorithmInfo[] = [
  {
    id: 'mediatek_brom',
    label: 'MediaTek Brom Erase FRP',
    description: 'Directly erase FRP partition via Brom/Preloader exploit using MediaTek Client protocol.',
    success_rate: 90,
    requires_hardware: false,
    is_adb_only: false,
    requires_boot_mode: true,
    phases: [
      { name: 'Boot Mode', description: 'Enter Brom Mode', action: { ManualModeSwitch: 'Brom Mode' }, weight: 20 },
      { name: 'Erase FRP', description: 'Erase FRP partition', action: { ErasePartition: 'frp' }, weight: 60 },
      { name: 'Verify', description: 'Verify removal', action: 'Verify', weight: 20 },
    ],
  },
];

const MOCK_RESET_MODES: FrpResetModeInfo[] = [
  {
    id: 'factory_reset_frp100',
    label: 'Factory Reset + FRP 100% Remove',
    description: 'Complete data wipe and FRP removal for supported builds.',
    frp_removal_percent: 100,
    wipes_data: true,
    erases_frp_partition: true,
  },
  {
    id: 'factory_reset_frp70',
    label: 'Factory Reset + FRP 70% Remove',
    description: 'Partial FRP bypass with factory reset for newer patches.',
    frp_removal_percent: 70,
    wipes_data: true,
    erases_frp_partition: false,
  },
  {
    id: 'remove_frp100_no_wipe',
    label: 'FRP 100% Remove (No Wipe)',
    description: '100% FRP bypass without wiping user data.',
    frp_removal_percent: 100,
    wipes_data: false,
    erases_frp_partition: true,
  },
  {
    id: 'remove_frp70_no_wipe',
    label: 'FRP 70% Remove (No Wipe)',
    description: '70% FRP bypass without wiping user data.',
    frp_removal_percent: 70,
    wipes_data: false,
    erases_frp_partition: false,
  },
];

const MOCK_SAMSUNG_METHODS = [
  { id: 'talkback_bypass', label: 'TalkBack Bypass', description: 'Enable TalkBack accessibility service to navigate to settings or browser.', risk_level: 'Medium', is_adb_method: true, requires_download_mode: false },
  { id: 'settings_access', label: 'Settings Access', description: 'Open Settings directly via ADB activity launch.', risk_level: 'Low', is_adb_method: true, requires_download_mode: false },
  { id: 'combination_firmware', label: 'Combination Firmware', description: 'Flash Samsung Combination Firmware via Download Mode (Odin).', risk_level: 'High', is_adb_method: false, requires_download_mode: true },
];

const MOCK_TECNO_METHODS = [
  { id: 'mtk_brom_erase', label: 'MediaTek Brom Erase FRP', description: 'Erase FRP partition via preloader exploit in Brom Mode.', risk_level: 'Low', is_hardware_method: true, is_adb_method: false },
  { id: 'spd_bootloader_erase', label: 'SPD Bootloader Erase FRP', description: 'Erase FRP partition via Spreadtrum bootloader protocol.', risk_level: 'Low', is_hardware_method: true, is_adb_method: false },
  { id: 'talkback_bypass', label: 'TalkBack Bypass', description: 'Accessibility gesture exploit to launch Chrome/Settings.', risk_level: 'Medium', is_hardware_method: false, is_adb_method: true },
];

export function initMocks() {
  if (typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window)) {
    console.log('[DroidKit Mocks] Initializing browser-only mock Tauri API for 138 models...');
    mockIPC((cmd: string, payload?: Record<string, any>) => {
      switch (cmd) {
        // Device Info & Basics
        case 'device_info':
          return [MOCK_DEVICE_SAMSUNG, MOCK_DEVICE_TECNO];
        case 'get_android_sdk_path':
          return '/Users/mock/Library/Android/sdk';
        case 'get_available_avds':
          return ['Pixel_7_API_33'];

        // Samsung FRP Database Commands
        case 'frp_get_device_database':
        case 'frp_list_supported_models':
          return SAMSUNG_MODELS;
        case 'frp_lookup_model': {
          const modelCode = payload?.modelCode || '';
          return SAMSUNG_MODELS.find(m => m.model_code.toLowerCase() === String(modelCode).toLowerCase()) || null;
        }
        case 'frp_search_models': {
          const q = String(payload?.query || '').toLowerCase();
          return SAMSUNG_MODELS.filter(m =>
            m.model_code.toLowerCase().includes(q) ||
            m.marketing_name.toLowerCase().includes(q) ||
            m.chipset.toLowerCase().includes(q)
          );
        }

        // Tecno FRP Database Commands
        case 'frp_get_tecno_database':
        case 'frp_list_tecno_models':
          return TECNO_MODELS;
        case 'frp_lookup_tecno_model': {
          const name = payload?.name || '';
          return TECNO_MODELS.find(m => m.marketing_name.toLowerCase() === String(name).toLowerCase()) || null;
        }
        case 'frp_search_tecno_models': {
          const q = String(payload?.query || '').toLowerCase();
          return TECNO_MODELS.filter(m =>
            m.marketing_name.toLowerCase().includes(q) ||
            m.series.toLowerCase().includes(q) ||
            m.chipset.toLowerCase().includes(q) ||
            m.chipset_family.toLowerCase().includes(q)
          );
        }
        case 'frp_get_tecno_by_series': {
          const series = payload?.series || '';
          if (series.toLowerCase() === 'all') return TECNO_MODELS;
          return TECNO_MODELS.filter(m => m.series.toLowerCase() === String(series).toLowerCase());
        }
        case 'frp_get_tecno_by_chipset': {
          const family = payload?.family || '';
          return TECNO_MODELS.filter(m => m.chipset_family.toLowerCase() === String(family).toLowerCase());
        }

        // Q4 FRP Database Commands
        case 'frp_get_q4_database':
          return Q4_MODELS;
        case 'frp_search_q4_models': {
          const q = String(payload?.query || '').toLowerCase();
          return Q4_MODELS.filter(m =>
            m.marketing_name.toLowerCase().includes(q) ||
            m.series.toLowerCase().includes(q) ||
            m.chipset.toLowerCase().includes(q) ||
            m.chipset_family.toLowerCase().includes(q)
          );
        }
        case 'frp_get_q4_by_brand': {
          const brand = payload?.brand || '';
          if (brand.toLowerCase() === 'all') return Q4_MODELS;
          return Q4_MODELS.filter(m => m.series.toLowerCase() === String(brand).toLowerCase());
        }

        // FRP Detection & Universal Algorithms
        case 'frp_detect':
          return MOCK_DETECTION;
        case 'frp_build_device_profile':
          return MOCK_PROFILE;
        case 'frp_get_recommended_algorithm':
          return MOCK_ALGORITHMS[0];
        case 'frp_get_chipset_algorithms':
          return MOCK_ALGORITHMS;
        case 'frp_get_reset_modes':
          return MOCK_RESET_MODES;
        case 'frp_get_algorithm_phases':
          return MOCK_ALGORITHMS[0].phases;
        case 'frp_get_all_methods':
          return MOCK_SAMSUNG_METHODS;
        case 'frp_get_tecno_methods':
          return MOCK_TECNO_METHODS;

        // Run method / auto bypass
        case 'frp_run_method':
        case 'frp_auto_bypass':
          return {
            method: payload?.methodId || 'auto_bypass',
            success: true,
            steps: [
              { command: 'adb devices', success: true, output: 'RF8M10XXXXX\tdevice', error: null },
              { command: 'adb shell content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1', success: true, output: 'Success', error: null }
            ],
            message: 'FRP bypass completed successfully in mock mode.',
            requires_manual_action: false,
            manual_action_instructions: null,
          };

        default:
          return null;
      }
    });
  }
}

initMocks();
