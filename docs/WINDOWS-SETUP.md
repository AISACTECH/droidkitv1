# 🪟 DroidKit on Windows — git clone → running app → installer

Everything below was validated against **v1.1.0** (`Passed: 61/61` on `scripts/test-all.js`). Follow it top-to-bottom on a fresh Windows 10/11 machine.

## 1. Prerequisites (one-time, ~10 min)

Open **PowerShell** (regular user is fine) and run each line:

```powershell
# Git
winget install --id Git.Git -e

# Node.js LTS (includes npm)
winget install --id OpenJS.NodeJS.LTS -e

# Rust ( MSVC toolchain )
winget install --id Rustlang.Rustup -e

# Microsoft C++ Build Tools — required to compile the Tauri/Rust backend
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

# (usually already present on Win10/11) WebView2 Runtime
winget install --id Microsoft.EdgeWebView2Runtime -e
```

Close and reopen PowerShell so PATH refreshes, then sanity-check:

```powershell
git --version        # any 2.x
node -v              # v18 or newer
rustc --version      # e.g. 1.7x+
```

## 2. Download the app with git

```powershell
cd $env:USERPROFILE\source 2>$null; if (-not $?) { mkdir ~\source; cd ~\source }
git clone https://github.com/AISACTECH/droidkitv1.git
cd droidkitv1
```

## 3. Install JavaScript dependencies

```powershell
npm ci        # reproducible install from package-lock.json (takes ~1 min)
```

## 4. Run it

**Option A — instant UI preview, no device needed (browser mock mode):**
```powershell
npm run dev      # then open http://localhost:1420
```
The full UI runs against the built-in mock IPC layer — all views, the FRP catalogue (260+ models), the Reality Check panel, and the experimental **FRP Lab 🧪** engine can be exercised with zero hardware.

**Option B — the real desktop app (talks to physical phones over USB):**
```powershell
npm run tauri:dev
```
First compile takes a few minutes (Rust crates). On the phone: enable **Developer options → USB debugging**, connect USB, accept the RSA prompt.

## 5. Build the Windows installer (one command)

```powershell
powershell -ExecutionPolicy Bypass -File .\build-windows.ps1
```

The script auto-detects your package manager, verifies Rust/MSVC, type-checks the frontend, and produces:

```
src-tauri\target\release\droidkit.exe                                    # standalone binary
src-tauri\target\release\bundle\nsis\DroidKit_<version>_x64-setup.exe    # NSIS installer
```

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `scripts cannot be loaded on this system` | Use the `-ExecutionPolicy Bypass` flag shown above |
| `cl.exe not found` / linker `link.exe` errors | VS Build Tools install incomplete — rerun the override line from §1, ensure the **VCTools** workload checked |
| Blank white window on start | WebView2 missing — install `Microsoft.EdgeWebView2Runtime` |
| `adb` not detecting the phone | Install your phone vendor's USB drivers (Samsung/OEM), enable USB debugging, check `adb devices` |
| `npm ci` network errors | Corporate proxy — `npm config set proxy …` or retry on another network |
| Rust compile OOM on small VMs | Close other apps; first build needs ~4 GB free RAM |

## 7. Prove it's working (30 seconds)

```powershell
npm run lint; npm run build; npm run audit:prod; node scripts/test-all.js
```
Expected: 0 TS errors → vite build success → audit all-green → `Passed: 61, Failed: 0`.
