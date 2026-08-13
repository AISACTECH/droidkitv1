import { mockIPC } from '@tauri-apps/api/mocks';
import { SAMSUNG_MODELS } from './samsung';
import { TECNO_MODELS } from './tecno';
import { INFINIX_MODELS } from './infinix';
import { ITEL_MODELS } from './itel';
import { Q3_MODELS } from './q3';
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
    console.log('[DroidKit Mocks] Initializing browser-only mock Tauri API — full model catalogues loaded.');
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

        // Infinix FRP Database Commands (Q2 Transsion)
        case 'frp_get_infinix_database':
          return INFINIX_MODELS;
        case 'frp_search_infinix_models': {
          const q = String(payload?.query || '').toLowerCase();
          return INFINIX_MODELS.filter(m =>
            m.marketing_name.toLowerCase().includes(q) ||
            m.series.toLowerCase().includes(q) ||
            m.chipset.toLowerCase().includes(q) ||
            m.chipset_family.toLowerCase().includes(q)
          );
        }
        case 'frp_get_infinix_by_series': {
          const series = payload?.series || '';
          if (series.toLowerCase() === 'all') return INFINIX_MODELS;
          return INFINIX_MODELS.filter(m => m.series.toLowerCase() === String(series).toLowerCase());
        }

        // Itel FRP Database Commands (Q2 Transsion)
        case 'frp_get_itel_database':
          return ITEL_MODELS;
        case 'frp_search_itel_models': {
          const q = String(payload?.query || '').toLowerCase();
          return ITEL_MODELS.filter(m =>
            m.marketing_name.toLowerCase().includes(q) ||
            m.series.toLowerCase().includes(q) ||
            m.chipset.toLowerCase().includes(q) ||
            m.chipset_family.toLowerCase().includes(q)
          );
        }
        case 'frp_get_itel_by_series': {
          const series = payload?.series || '';
          if (series.toLowerCase() === 'all') return ITEL_MODELS;
          return ITEL_MODELS.filter(m => m.series.toLowerCase() === String(series).toLowerCase());
        }

        // Q3 FRP Database Commands (Xiaomi, OPPO, Realme, Vivo, Honor)
        case 'frp_get_q3_database':
          return Q3_MODELS;
        case 'frp_search_q3_models': {
          const q = String(payload?.query || '').toLowerCase();
          return Q3_MODELS.filter(m =>
            m.marketing_name.toLowerCase().includes(q) ||
            m.series.toLowerCase().includes(q) ||
            m.chipset.toLowerCase().includes(q) ||
            m.chipset_family.toLowerCase().includes(q)
          );
        }
        case 'frp_get_q3_by_brand': {
          const brand = payload?.brand || '';
          if (brand.toLowerCase() === 'all') return Q3_MODELS;
          return Q3_MODELS.filter(m => m.series.toLowerCase() === String(brand).toLowerCase());
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

        // === Advanced Reset & Knox (Confirmed Features) ===
        case 'frp_verify_handshake':
          return {
            handshake_ok: true,
            adb_enabled: true,
            developer_options_enabled: true,
            usb_state: 'adb',
            usb_config: 'mtp,adb',
            message: '✅ Handshake confirmed: USB Debugging enabled, Developer Options allowed, RSA authorized. App can now run reset 100%/70% and Knox removal. Phone will be brand new at Hi there home page after reset 100%.'
          };
        case 'frp_partition_survey':
          // Read-only survey mock — getprop samples + by-name listing.
          return {
            read_only: true,
            properties: [
              { name: 'ro.boot.verifiedbootstate', value: 'green' },
              { name: 'ro.boot.vbmeta.device_state', value: 'locked' },
              { name: 'ro.build.tags', value: 'release-keys' },
              { name: 'ro.oem_unlock_supported', value: '1' },
              { name: 'ro.boot.flash.locked', value: '1' },
              { name: 'ro.build.version.security_patch', value: '2025-12-01' },
              { name: 'ro.build.version.release', value: '15' },
              { name: 'ro.build.fingerprint', value: 'samsung/a15xnnxx/a15x:15/AQ3A.202512.001/REL:user/release-keys' }
            ],
            block_devices: [
              'lrwxrwxrwx 1 root root 21 boot -> /dev/block/mmcblk0p1',
              'lrwxrwxrwx 1 root root 21 frp -> /dev/block/mmcblk0p23',
              'lrwxrwxrwx 1 root root 21 vbmeta -> /dev/block/mmcblk0p3',
              'lrwxrwxrwx 1 root root 21 userdata -> /dev/block/mmcblk0p40'
            ]
          };

        case 'frp_execute_reset_mode': {
          const modeId = payload?.resetModeId || 'factory_reset_frp100';
          const percent = modeId.includes('100') ? 100 : 70;
          const wipes = modeId.includes('factory_reset');
          return {
            reset_mode: MOCK_RESET_MODES.find(m => m.id === modeId) || MOCK_RESET_MODES[0],
            success: true,
            steps: [
              { command: 'getprop ro.build.version.release', success: true, output: '14', error: null },
              { command: 'pm disable-user --user 0 com.google.android.setupwizard', success: true, output: 'Success', error: null },
              { command: 'settings put global device_provisioned 1', success: true, output: '', error: null },
              { command: 'content insert --uri content://settings/secure --bind name:s:user_setup_complete --bind value:s:1', success: true, output: '', error: null },
              ...(wipes ? [{ command: 'am broadcast -a android.intent.action.MASTER_CLEAR', success: true, output: 'Broadcast completed', error: null }] : [])
            ],
            message: percent === 100 && wipes ? '✅ SUCCESS: Factory Reset + Remove FRP 100% — Phone is now brand new like at Hi there home page. FRP 100% removed, data wiped, boots to welcome setup.' : `✅ ${modeId} executed. FRP ${percent}% removed.`,
            device_state_after: wipes && percent === 100 ? 'Brand new — like out of box. Boots to Hi there / Welcome initial setup screen. No Google verification. All data erased. FRP permanently removed 100%. Like new phone at home page.' : `${percent}% FRP removal executed.`,
            requires_reboot: wipes,
            frp_removed_percent: percent,
            data_wiped: wipes
          };
        }
        case 'frp_remove_knox':
          return {
            success: true,
            steps: [
              { command: 'getprop ro.build.version.knox', success: true, output: '3.9', error: null },
              { command: 'pm disable-user --user 0 com.samsung.knox.knoxsetupwizardclient', success: true, output: '', error: null },
              { command: 'pm disable-user --user 0 com.sec.knox.knoxsetupwizardclient', success: true, output: '', error: null },
              { command: 'pm disable-user --user 0 com.samsung.android.knox.attestation', success: true, output: '', error: null },
              { command: 'pm list packages | grep -i knox', success: true, output: '', error: null },
            ],
            message: '✅ Knox Removal SUCCESS: Disabled 6 Knox packages. Knox security, KG (Knox Guard), Secure Folder, Knox attestation disabled. Device now boots without Knox verification. Alliance Shield method available as fallback for Exynos.',
            knox_disabled: true,
            knox_packages_disabled: [
              'com.samsung.knox.knoxsetupwizardclient',
              'com.sec.knox.knoxsetupwizardclient',
              'com.samsung.android.knox.attestation',
              'com.samsung.android.knox.containerdesktop',
              'com.samsung.android.kgclient',
              'com.samsung.android.knoxguard'
            ]
          };

        // Fastboot support
        case 'fastboot_list_devices':
          return [];
        case 'fastboot_check_availability':
          return {
            fastboot_installed: false,
            fastboot_version: 'mock - not installed in browser',
            devices_found: 0,
            devices: [],
            guidance_for_damaged_port: 'For damaged port: WiFi ADB BEST, Fastboot needs USB data pins. Use WiFi.'
          };
        case 'fastboot_reboot_to_bootloader':
        case 'fastboot_reboot_to_system':
        case 'fastboot_oem_unlock':
        case 'fastboot_getvar_all':
        case 'fastboot_erase_frp':
          return { success: true, output: 'Mock fastboot success', error: null, device_serial: null };

        // Screen Mirror reflection window
        case 'capture_screen_frame':
        case 'capture_screen_via_file':
          return {
            base64_png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', // 1x1 png
            width: 1080,
            height: 1920,
            timestamp: Date.now(),
            format: 'png'
          };
        case 'send_tap_via_cursor':
          return `Tap sent to (${payload?.x}, ${payload?.y}) via cursor — controls phone even with broken touch sensor`;
        case 'send_swipe_via_cursor':
          return `Swipe (${payload?.x1},${payload?.y1}) -> (${payload?.x2},${payload?.y2}) ${payload?.durationMs}ms sent`;
        case 'send_text_via_adb':
          return `Text input sent: ${payload?.text}`;
        case 'send_keyevent_via_cursor':
          return `Keyevent ${payload?.keycode} sent`;
        case 'start_mirror_session':
          return {
            device_serial: payload?.deviceSerial || 'RF8M10XXXXX',
            width: 1080,
            height: 1920,
            refresh_interval_ms: payload?.refreshIntervalMs || 800,
            cursor_control_enabled: true,
            reflection_enabled: true,
            message: 'Reflection window started — phone screen mirrored to desktop. Control via cursor: click to tap, drag to swipe. Works even when phone touch sensor broken.'
          };

        default:
          return null;
      }
    });
  }
}

initMocks();
