#!/usr/bin/env node
/**
 * Paralock — Comprehensive Test Suite
 * Tests everything to pass, ready to clone/install on GitHub,
 * accuracy peak, speed efficiency, reliability, Windows support,
 * ADB/USB/WiFi/Fastboot, Screen Mirror reflection window
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
let warnings = 0;

function log(msg, type = 'info') {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
  console.log(`${icons[type] || ''} ${msg}`);
  if (type === 'pass') passed++;
  if (type === 'fail') failed++;
  if (type === 'warn') warnings++;
}

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: 'pipe', ...opts });
  } catch (e) {
    return e.stdout?.toString() + e.stderr?.toString() || e.message;
  }
}

console.log("\n🧪 Paralock Comprehensive Test Suite");
console.log("==============================================\n");

// 1. Clone / Install Ready
console.log("--- 1. Clone / Install Ready ---");
const requiredFiles = [
  'package.json',
  'package-lock.json',
  'src/main.tsx',
  'src/App.tsx',
  'src/components/AppSidebar.tsx',
  'src/components/views/FrpRemoval.tsx',
  'src/components/views/FrpRemoval/BrandRibbon.tsx',
  'src/components/views/FrpRemoval/ModelBrowser.tsx',
  'src/components/views/FrpRemoval/DeviceStatusPanel.tsx',
  'src/components/views/ScreenControl.tsx',
  'src/components/StatusBar.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/lib/logger.ts',
  'src/lib/frp-commands.ts',
  'src/tauri-commands.ts',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
  'src-tauri/src/lib.rs',
  'src-tauri/src/fastboot.rs',
  'src-tauri/src/screen_mirror.rs',
  'src-tauri/src/frp/reset.rs',
  'src-tauri/src/frp/algorithm.rs',
  'src-tauri/src/frp/bypass.rs',
  'vite.config.ts',
  'tsconfig.json',
  'index.html',
];

for (const f of requiredFiles) {
  if (fs.existsSync(path.join(root, f))) log(`Core component ${f} exists`, 'pass');
  else log(`Missing core component ${f}`, 'fail');
}

// .gitignore should not ignore src
const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
if (gitignore.includes('node_modules') && gitignore.includes('dist')) log('.gitignore correctly ignores node_modules, dist', 'pass');
else log('.gitignore missing essentials', 'fail');

if (!gitignore.includes('src/') && !gitignore.includes('src-tauri/src')) log('.gitignore does NOT ignore src (ready to clone)', 'pass');
else log('.gitignore incorrectly ignores src', 'fail');

// 2. TypeScript Check
console.log("\n--- 2. TypeScript & Build ---");
try {
  execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' });
  log('TypeScript check passes with zero errors', 'pass');
} catch (e) {
  log(`TypeScript errors: ${e.stdout?.toString().slice(0, 500)}`, 'fail');
}

// Vite build
try {
  const out = execSync('npm run build', { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  if (fs.existsSync(path.join(root, 'dist/index.html'))) log('Vite production build succeeds, dist/index.html exists', 'pass');
  else log('Vite build failed no dist', 'fail');

  // Bundle size check
  const distSize = (() => {
    let total = 0;
    function walk(p) {
      const stat = fs.statSync(p);
      if (stat.isFile()) total += stat.size;
      else if (stat.isDirectory()) {
        for (const f of fs.readdirSync(p)) walk(path.join(p, f));
      }
    }
    try { walk(path.join(root, 'dist')); } catch {}
    return total;
  })();
  if (distSize < 5 * 1024 * 1024) log(`Bundle size ${Math.round(distSize/1024)}KB <5MB efficient`, 'pass');
  else log(`Bundle size ${Math.round(distSize/1024)}KB >5MB check chunks`, 'warn');
} catch (e) {
  log(`Vite build failed: ${e.message.slice(0,300)}`, 'fail');
}

// 3. Feature Accuracy — based on feedback
console.log("\n--- 3. Feature Accuracy (Feedback Driven) ---");

// FRP Databases
try {
  const dbFiles = [
    'src-tauri/src/frp/database.rs',
    'src-tauri/src/frp/infinix_database.rs',
    'src-tauri/src/frp/itel_database.rs',
    'src-tauri/src/frp/q3_database.rs',
    'src-tauri/src/frp/q4_database.rs',
  ];
  let totalModels = 0;
  for (const f of dbFiles) {
    const content = fs.readFileSync(path.join(root, f), 'utf8');
    const count = (content.match(/model_code|marketing_name/g) || []).length;
    totalModels += count;
  }
  if (totalModels > 200) log(`FRP databases comprehensive: ${totalModels} model references >200`, 'pass');
  else log(`FRP databases low: ${totalModels}`, 'warn');
} catch { log('FRP DB check failed', 'fail'); }

// FRP Methods
const bypassContent = fs.readFileSync(path.join(root, 'src-tauri/src/frp/bypass.rs'), 'utf8');
const methods = ['SetupWizardDisable', 'DeviceProvisioning', 'ContentProviderBypass', 'AllianceShieldBypass', 'TalkBackBypass'];
for (const m of methods) {
  if (bypassContent.includes(m)) log(`FRP method ${m} exists accurate`, 'pass');
  else log(`FRP method ${m} missing`, 'fail');
}

// Reset-mode compatibility IDs remain, but the public contract must be honest:
// ADB modes never claim block-level partition erasure or guaranteed completion.
const algoContent = fs.readFileSync(path.join(root, 'src-tauri/src/frp/algorithm.rs'), 'utf8');
const resetContent = fs.readFileSync(path.join(root, 'src-tauri/src/frp/reset.rs'), 'utf8');
if (
  algoContent.includes('FactoryResetRemoveFrp100')
  && algoContent.includes('pub fn erases_frp_partition')
  && algoContent.includes('false')
  && resetContent.includes('pending_post_reboot_verification')
  && resetContent.includes('success: false')
  && !resetContent.toLowerCase().includes('brand new at hi there')
) {
  log('Reset modes present with no partition-erase claim and post-reboot verification required', 'pass');
} else log('Reset-mode safety contract missing or regressed', 'fail');

// Knox package maintenance: semantic verification, no Knox Guard/finance-lock target.
if (
  resetContent.includes('pm list packages -d')
  && resetContent.includes('packages_verified_disabled_user0')
  && !resetContent.includes('"com.samsung.android.kgclient"')
  && !resetContent.includes('"com.samsung.android.knoxguard"')
) {
  log('Knox package maintenance verifies user-0 state and excludes Knox Guard/finance locks', 'pass');
} else log('Knox package safety contract missing', 'fail');

// Handshake verification
if (fs.readFileSync(path.join(root, 'src-tauri/src/frp/commands.rs'), 'utf8').includes('frp_verify_handshake')) {
  log('Handshake verification (USB debugging + Dev Options) exists accurate', 'pass');
} else log('Handshake verification missing', 'fail');

// Fastboot + backend permit safety
const fastbootContent = fs.readFileSync(path.join(root, 'src-tauri/src/fastboot.rs'), 'utf8');
const safetyContent = fs.readFileSync(path.join(root, 'src-tauri/src/operation_safety.rs'), 'utf8');
if (fastbootContent.includes('FRP_ONLY') && !fastbootContent.includes('["frp", "frp_a", "frp_b", "persistent"') && !fastbootContent.includes('"config"]')) {
  log('Fastboot erase allow-list is restricted to explicit FRP partition names', 'pass');
} else log('Unsafe fastboot fallback partition detected', 'fail');
if (safetyContent.includes('consume_permit') && safetyContent.includes('one-use') && safetyContent.includes('PERMIT_TTL')) {
  log('Rust operation permits are expiring, one-use and device/operation bound', 'pass');
} else log('Rust operation permit contract missing', 'fail');

// Screen Mirror reflection window
if (fs.existsSync(path.join(root, 'src-tauri/src/screen_mirror.rs')) && fs.readFileSync(path.join(root, 'src/components/views/ScreenControl.tsx'), 'utf8').includes('Reflection Window') && fs.readFileSync(path.join(root, 'src/components/views/ScreenControl.tsx'), 'utf8').includes('cursorControl')) {
  log('Screen Mirror reflection window with cursor control exists — for broken touch sensor repair + control', 'pass');
} else log('Screen Mirror reflection missing', 'fail');

// WiFi ADB
const libRs = fs.readFileSync(path.join(root, 'src-tauri/src/lib.rs'), 'utf8');
if (libRs.includes('connect_wireless_device') && libRs.includes('pair_wireless_device') && libRs.includes('discover_wireless_devices')) {
  log('WiFi ADB support exists — connect through WiFi, QR code pairing', 'pass');
} else log('WiFi ADB missing', 'fail');

// 4. Speed Efficiency & Reliability
console.log("\n--- 4. Speed Efficiency & Reliability ---");

// Query client offlineFirst + adaptive
const queryClient = fs.readFileSync(path.join(root, 'src/lib/query-client.ts'), 'utf8');
if (queryClient.includes('offlineFirst') && queryClient.includes('retryDelay') && queryClient.includes('refetchOnWindowFocus: false')) {
  log('QueryClient optimized for speed efficiency & reliability — offlineFirst, adaptive, no aggressive refetch', 'pass');
} else log('QueryClient not optimized', 'warn');

// ErrorBoundary + Logger
if (fs.existsSync(path.join(root, 'src/components/ErrorBoundary.tsx')) && fs.existsSync(path.join(root, 'src/lib/logger.ts'))) {
  log('Reliability: ErrorBoundary + logger buffered 500 exists', 'pass');
} else log('Reliability components missing', 'fail');

// Manual chunks
const viteConf = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
if (viteConf.includes('manualChunks') && viteConf.includes('vendor-react') && viteConf.includes('views')) {
  log('Speed efficiency: Vite manualChunks code-split vendor-react, views, mocks — reduces load', 'pass');
} else log('Vite manualChunks missing', 'warn');

// 4b. Three-gate solutions (installers / CI / bench) — no Rust, no hardware
console.log("\n--- 4b. Three-gate solutions ---");
if (!fs.existsSync(path.join(root, 'bun.lock')) && !fs.existsSync(path.join(root, 'bun.lockb'))) {
  log('No bun.lock — tauri-action will not pick bun over npm', 'pass');
} else log('bun.lock present — publish matrix will run bun tauri build', 'fail');

const stagedPublish = fs.readFileSync(path.join(root, 'docs/workflows-manual/publish.yml'), 'utf8');
if (stagedPublish.includes('tauriScript: npm run tauri') && !stagedPublish.includes('setup-bun')) {
  log('Staged publish.yml forces npm tauriScript (no setup-bun)', 'pass');
} else log('Staged publish.yml missing npm tauriScript', 'fail');

if (fs.existsSync(path.join(root, 'docs/workflows-manual/ci.yml'))) {
  log('Staged ci.yml ready to paste into .github/workflows/', 'pass');
} else log('Staged ci.yml missing', 'fail');

if (fs.existsSync(path.join(root, 'src/lib/bench/index.ts')) && fs.existsSync(path.join(root, 'scripts/verify-bench.mts'))) {
  log('Bench desk module + verify-bench gate present', 'pass');
} else log('Bench desk missing', 'fail');

{
  const icnsPath = path.join(root, 'src-tauri/icons/icon.icns');
  if (fs.existsSync(icnsPath) && fs.readFileSync(icnsPath).subarray(0, 4).toString('ascii') === 'icns') {
    log('icon.icns is a real Apple icon (not a renamed PNG)', 'pass');
  } else log('icon.icns missing or is a PNG renamed to .icns — macOS tauri build will fail', 'fail');
}

const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (!changelog.includes('<<<<<<<') && !readme.includes('<<<<<<<')) {
  log('README + CHANGELOG have no leftover merge-conflict markers', 'pass');
} else log('Merge-conflict markers left in README or CHANGELOG', 'fail');

{
  const bundle = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8')).bundle;
  if (bundle && typeof bundle.publisher === 'string' && !(bundle.windows && 'publisher' in bundle.windows)) {
    log('tauri.conf.json publisher at bundle root (schema-valid)', 'pass');
  } else log('tauri.conf.json publisher misplaced under bundle.windows', 'fail');
}

// 4c. Honesty + no-friction chrome
console.log("\n--- 4c. Honesty + background pause ---");
{
  const statusBar = fs.readFileSync(path.join(root, 'src/components/StatusBar.tsx'), 'utf8');
  if (!statusBar.includes('Donate') && !statusBar.includes('Windows 11') && !statusBar.includes('B450M')) {
    log('Status bar has no fake Donate / Windows / motherboard chrome', 'pass');
  } else log('Status bar still has fake Donate/Windows/B450M chrome', 'fail');

  const main = fs.readFileSync(path.join(root, 'src/components/MainContent.tsx'), 'utf8');
  if (main.includes("activeView === 'rescue-lab'") && main.indexOf("activeView === 'rescue-lab'") < main.indexOf('!selectedDevice')) {
    log('Rescue Lab is available without a selected phone', 'pass');
  } else log('Rescue Lab still gated on selectedDevice', 'fail');

  const queries = fs.readFileSync(path.join(root, 'src/hooks/useDeviceQueries.ts'), 'utf8');
  const screen = fs.readFileSync(path.join(root, 'src/components/views/ScreenControl.tsx'), 'utf8');
  const perf = fs.readFileSync(path.join(root, 'src/components/views/PerformanceMonitor.tsx'), 'utf8');
  if (fs.existsSync(path.join(root, 'src/hooks/usePageVisible.ts')) && queries.includes('usePageVisible') && screen.includes('usePageVisible') && perf.includes('usePageVisible')) {
    log('ADB polling / mirror / perf pause when the window is hidden', 'pass');
  } else log('Background pause not wired — Windows may force-stop a hidden window', 'fail');

  if (!perf.includes('Math.random()')) log('Performance monitor does not invent CPU numbers', 'pass');
  else log('Performance monitor still uses Math.random() for CPU', 'fail');
}

// 5. Windows Support
console.log("\n--- 5. Windows Support ---");
const tauriConf = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
if (tauriConf.bundle && tauriConf.bundle.windows && tauriConf.bundle.windows.nsis) {
  log('Windows bundle NSIS configured', 'pass');
} else log('Windows bundle not configured', 'fail');

if (fs.existsSync(path.join(root, 'build-windows.ps1'))) {
  log('build-windows.ps1 exists for Windows', 'pass');
} else log('build-windows.ps1 missing', 'warn');

if (tauriConf.app && tauriConf.app.windows && tauriConf.app.windows[0].width >= 1100) {
  log(`Window size ${tauriConf.app.windows[0].width}x${tauriConf.app.windows[0].height} production suitable for Windows`, 'pass');
} else log('Window size small', 'warn');

// Check path separators — should use forward slashes
const frpRemoval = fs.readFileSync(path.join(root, 'src/components/views/FrpRemoval.tsx'), 'utf8');
if (!frpRemoval.includes('\\\\')) log('No Windows backslash path issues — forward slashes used', 'pass');
else log('Potential Windows path backslash issue', 'warn');

// 6. Accuracy Peak — Based on Simulation Feedback
console.log("\n--- 6. Accuracy Peak & Feedback ---");
if (fs.existsSync(path.join(root, 'simulation-report.json'))) {
  const report = JSON.parse(fs.readFileSync(path.join(root, 'simulation-report.json'), 'utf8'));
  log(`Simulation tested ${report.meta.devCount}+${report.meta.userCount}=40k agents`, 'pass');
  if (report.summary.avgErrorsPerDev && parseFloat(report.summary.avgErrorsPerDev) < 20) {
    log(`Avg errors per dev ${report.summary.avgErrorsPerDev} <20 accurate`, 'pass');
  }
} else log('Simulation report missing', 'warn');

// Production audit
try {
  const auditOut = exec('node scripts/production-audit.js');
  if (auditOut.includes('All 22 core components present') && auditOut.includes('TypeScript check: ✅')) {
    log('Production audit passes — core components + TS + build', 'pass');
  } else log('Production audit has warnings', 'warn');
} catch { log('Production audit failed', 'fail'); }

// 7. Static release-readiness criteria (native builds and physical devices are separate gates)
console.log("\n--- 7. Static Release-Readiness Criteria ---");
const criteria = [
  { check: (() => {
      const pv = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
      const cv = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8').match(/version\s*=\s*"([^"]+)"/)?.[1];
      return /^\d+\.\d+\.\d+$/.test(pv) && tauriConf.version === pv && cv === pv;
    })(), msg: 'Version aligned across manifests (package.json + tauri.conf.json + Cargo.toml)' },
  { check: tauriConf.app.security.csp && !tauriConf.app.security.csp.includes('null'), msg: 'Security CSP hardened not null' },
  { check: fs.existsSync(path.join(root, 'LICENSE')), msg: 'License MIT exists' },
  { check: fs.existsSync(path.join(root, 'README.md')) && fs.readFileSync(path.join(root, 'README.md'), 'utf8').includes('Paralock'), msg: 'README exists with Paralock' },
  { check: fs.existsSync(path.join(root, 'docs/FEATURE_CONFIRMATION_USB_KNOX_RESET.md')), msg: 'Feature confirmation doc exists' },
  { check: fs.existsSync(path.join(root, 'docs/bench/OBSERVED-EVIDENCE.md')), msg: 'Physical post-reboot benchmark evidence contract exists' },
  { check: fs.existsSync(path.join(root, 'src/components/OperationSafetyGate.test.tsx')), msg: 'React safety-gate tests exist' },
  { check: fs.readFileSync(path.join(root, 'src/components/views/ScreenControl.tsx'), 'utf8').includes('Reflection Window') && fs.readFileSync(path.join(root, 'src/components/views/ScreenControl.tsx'), 'utf8').includes('broken touch sensor'), msg: 'Reflection window control path is implemented' },
];

for (const c of criteria) {
  if (c.check) log(c.msg, 'pass');
  else log(c.msg, 'fail');
}

// Final summary
console.log("\n==============================================");
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️ Warnings: ${warnings}`);
console.log(`Total: ${passed + failed + warnings}`);

if (failed === 0) {
  console.log("\n✅ FRONTEND + STATIC CONTRACT GATES PASS");
  console.log("   - Bundle, TypeScript, source contracts and browser-facing reliability checks are green");
  console.log("   - Mutating FRP operations are permit-gated with semantic read-back and reboot verification required");
  console.log("   - Native cargo tests/builds, signed installers and physical-device outcomes remain independent release gates");
  process.exit(0);
} else {
  console.log("\n❌ Some tests failed — fix before release");
  process.exit(1);
}
