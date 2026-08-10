# ==============================================================================
# DroidKit - Windows Build Script
# ==============================================================================
# Automatically verifies prerequisites and builds DroidKit for Windows (x64)
# Output: src-tauri/target/release/bundle/nsis/DroidKit_0.1.0_x64-setup.exe
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

# Step 1: Check Node.js
Write-Step "Checking Node.js prerequisite"
try {
    $nodeVersion = node -v
    Write-Success "Node.js found: $nodeVersion"
} catch {
    Write-Err "Node.js is not installed or not in PATH. Please install Node.js 18+ (https://nodejs.org/)"
    exit 1
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

# Step 3: Check MSVC Linker
Write-Step "Checking Microsoft Visual C++ Build Tools (MSVC Linker)"
$msvcCheck = Get-Command cl.exe -ErrorAction SilentlyContinue
if (-not $msvcCheck) {
    Write-Host "   [!] MSVC compiler cl.exe not found in current environment." -ForegroundColor DarkYellow
    Write-Host "   [!] Ensure you have installed Visual Studio C++ Build Tools with Windows 10/11 SDK." -ForegroundColor DarkYellow
} else {
    Write-Success "MSVC compiler found"
}

# Step 4: Install npm dependencies
Write-Step "Installing NPM dependencies"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Err "npm install failed. Please check your network connection or package.json."
    exit 1
}
Write-Success "NPM dependencies installed"

# Step 5: Check TypeScript compilation
Write-Step "Running TypeScript type check (npx tsc --noEmit)"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Err "TypeScript compilation failed with errors. Please fix TypeScript errors before building."
    exit 1
}
Write-Success "TypeScript compilation passed with 0 errors"

# Step 6: Build Vite frontend
Write-Step "Building production Vite bundle"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Err "Vite production build failed."
    exit 1
}
Write-Success "Vite frontend built successfully"

# Step 7: Build Tauri desktop application
Write-Step "Building Tauri desktop application (this may take several minutes)"
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Err "Tauri build failed. Please verify MSVC build tools and WebView2 runtime are installed."
    exit 1
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Success "DroidKit Windows Build Complete!"
Write-Host "================================================" -ForegroundColor Green
Write-Host "Installer output directory: src-tauri/target/release/bundle/nsis/" -ForegroundColor White
Write-Host "Standalone executable:      src-tauri/target/release/droidkit.exe" -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Green
