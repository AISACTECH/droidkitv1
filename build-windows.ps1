# ==============================================================================
# DroidKit v1.1.0 - Automated Windows Build Script
# ==============================================================================
# Builds DroidKit for Windows (x64 native installer and standalone executable).
# Supports both Bun and Node.js/NPM environments automatically.
# Output (version read dynamically from package.json at build time):
#   Installer:  src-tauri/target/release/bundle/nsis/DroidKit_<version>_x64-setup.exe
#   Executable: src-tauri/target/release/droidkit.exe
# Full guide: docs/WINDOWS-SETUP.md
# ==============================================================================

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n[+] $Message..." -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Write-Err {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "         DroidKit v1 - Windows Build Tool       " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

# Step 0: Ensure we are in repo root
if (-not (Test-Path -Path "package.json" -PathType Leaf) -or -not (Test-Path -Path "src-tauri" -PathType Container)) {
    Write-Err "This script must run in the repository root where package.json and src-tauri/ exist."
    exit 1
}

# Step 1: Detect package manager (Bun preferred, fallback to NPM)
Write-Step "Checking JavaScript/TypeScript runtime (Bun / Node)"
$pkgCmd = "npm"
$runCmd = "npm run"
if (Get-Command bun -ErrorAction SilentlyContinue) {
    $bunVersion = bun --version
    Write-Success "Bun found: v$bunVersion (Using Bun for ultra-fast builds)"
    $pkgCmd = "bun"
    $runCmd = "bun run"
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Success "Node.js found: $nodeVersion (Using NPM)"
} else {
    Write-Err "Neither Bun nor Node.js found in PATH. Attempting Bun via official PowerShell installer..."
    try {
        irm https://bun.sh/install.ps1 | iex
        $pkgCmd = "bun"
        $runCmd = "bun run"
    } catch {
        Write-Err "Failed to install Bun automatically. Please install Node.js 22 LTS via: winget install --id OpenJS.NodeJS.LTS -e"
        exit 1
    }
}

# Step 2: Check Rust / Cargo
Write-Step "Checking Rust and Cargo prerequisite"
try {
    $rustVersion = rustc --version
    $cargoVersion = cargo --version
    Write-Success "Rust found: $rustVersion ($cargoVersion)"
} catch {
    Write-Err "Rust is not installed or not in PATH. Please install Rust via rustup (https://rustup.rs/)"
    exit 1
}

# Step 3: Check MSVC Toolchain & Compiler
Write-Step "Checking Microsoft Visual C++ Build Tools (MSVC Toolchain)"
if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    Write-Warning "cl.exe (MSVC C++ compiler) not found in current PATH."
    Write-Warning "Ensure you have installed Visual Studio 2022 C++ Build Tools with 'Desktop development with C++' workload."
    Write-Warning "Install via Winget: winget install --id Microsoft.VisualStudio.2022.BuildTools -e"
} else {
    Write-Success "MSVC compiler found (cl.exe)"
}

# Step 4: Ensure MSVC target is added to Rust
Write-Step "Verifying stable-x86_64-pc-windows-msvc toolchain target"
try {
    rustup target add x86_64-pc-windows-msvc 2>$null
    Write-Success "MSVC target verified"
} catch {
    Write-Warning "Could not verify rustup targets (may be managed externally)."
}

# Step 5: Install dependencies
Write-Step "Installing dependencies with $pkgCmd"
& $pkgCmd install
if ($LASTEXITCODE -ne 0) {
    Write-Err "Dependency installation failed."
    exit 1
}
Write-Success "Dependencies installed"

# Step 6: Check TypeScript compilation
Write-Step "Running TypeScript type check (npx tsc --noEmit)"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Err "TypeScript compilation failed with errors. Please fix TypeScript errors before building."
    exit 1
}
Write-Success "TypeScript compilation passed with 0 errors"

# Step 7: Build Vite frontend
Write-Step "Building production Vite frontend bundle ($runCmd build)"
& $pkgCmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Err "Vite production build failed."
    exit 1
}
Write-Success "Vite frontend built successfully"

# Step 8: Build Tauri desktop application
Write-Step "Building Tauri desktop application (compiling native Windows binary)"
try {
    & $pkgCmd run tauri build
} catch {
    Write-Warning "$pkgCmd run tauri build encountered an issue, falling back to cargo tauri build..."
    if (-not (Get-Command cargo-tauri -ErrorAction SilentlyContinue)) {
        Write-Step "Installing tauri-cli via cargo"
        cargo install tauri-cli
    }
    cargo tauri build
}
if ($LASTEXITCODE -ne 0) {
    Write-Err "Tauri build failed. Please verify MSVC build tools and WebView2 runtime are installed."
    exit 1
}

# Step 9: Report artifacts
Write-Host "`n================================================" -ForegroundColor Green
Write-Success "DroidKit Windows Build Complete!"
Write-Host "================================================" -ForegroundColor Green
Write-Host "Built Artifacts Location:" -ForegroundColor White
Get-ChildItem -Path "src-tauri\target\release\bundle" -Recurse -Force -ErrorAction SilentlyContinue | Select-Object FullName, Length | Format-Table -AutoSize
Write-Host "================================================`n" -ForegroundColor Green
