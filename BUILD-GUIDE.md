# DroidKit v1 — Comprehensive Build & Architecture Guide

Welcome to **DroidKit v1**, the cross-platform Android device management and FRP (Factory Reset Protection) removal suite built with **Tauri v2 (Rust)** and **React 19 + TypeScript + Vite + Tailwind CSS**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Building on Windows](#3-building-on-windows)
4. [Building on macOS](#4-building-on-macos)
5. [Building on Linux](#5-building-on-linux)
6. [Browser-Only Mock Mode](#6-browser-only-mock-mode)
7. [FRP Database & Architecture](#7-frp-database--architecture)
8. [Troubleshooting & Common Issues](#8-troubleshooting--common-issues)

---

## 1. Architecture Overview

DroidKit uses a hybrid architecture designed for both native desktop execution and web-based live preview:

```
+-----------------------------------------------------------------------------+
|                           REACT 19 FRONTEND (Vite)                          |
|  +-----------------------------------------------------------------------+  |
|  |  UI: FrpRemoval.tsx / MainContent.tsx / AppSidebar.tsx               |  |
|  |  State: React Query + Custom Hooks (useConnectedDevices)             |  |
|  |  TypeScript Bindings: src/lib/frp-commands.ts & src/tauri-commands.ts|  |
|  +-----------------------------------+-----------------------------------+  |
+--------------------------------------|--------------------------------------+
                                       |
                   +-------------------+-------------------+
                   | (in Tauri Window) | (in Browser Mode) |
                   v                   v                   v
+------------------------------------+   +------------------------------------+
|         TAURI v2 RUST BACKEND      |   |       BROWSER MOCK API ENGINE      |
|  +------------------------------+  |   |  +------------------------------+  |
|  | src-tauri/src/frp/           |  |   |  | src/mocks/index.ts           |  |
|  |  |- database.rs (Samsung 35) |  |   |  |  |- samsung.ts (35 models)   |  |
|  |  |- database.rs (Tecno 70)   |  |   |  |  |- tecno.ts (70 models)     |  |
|  |  |- q4_database.rs (Q4 33)   |  |   |  |  |- q4.ts (33 models)        |  |
|  |  |- algorithm.rs (Chipsets)  |  |   |  |                              |  |
|  |  |- commands.rs (24 cmds)    |  |   |  | Automatically intercepts     |  |
|  |  |- bypass.rs & detector.rs  |  |   |  | Tauri invoke calls in Web    |  |
|  +------------------------------+  |   +------------------------------------+
+------------------------------------+
```

---

## 2. Prerequisites

| Component | Minimum Version | Required For |
| :--- | :--- | :--- |
| **Node.js** | `v22 LTS (>= 22.6)` | TypeScript, Vite 7 frontend build + type-stripped test scripts |
| **Rust / Cargo** | `v1.75.0+` | Tauri desktop backend compilation |
| **Visual Studio C++ Build Tools** | `2019+` | MSVC Linker (`cl.exe`) on Windows |
| **Windows 10/11 SDK** | `10.0.19041+` | Win32 API header files on Windows |
| **Xcode Command Line Tools** | `14.0+` | macOS C/C++ linker and SDK |
| **WebKit2GTK** | `4.1+` | Linux WebKit webview dependency |

---

## 3. Building on Windows

### Option A: Automated Build Script (Recommended)
An automated PowerShell script (`build-windows.ps1`) is provided in the repository root:

1. Open PowerShell as Administrator (or standard user with MSVC in PATH).
2. Execute the build script:
   ```powershell
   .\build-windows.ps1
   ```
3. The script will automatically:
   - Check Node.js and Rust/Cargo versions.
   - Install NPM dependencies (`npm install`).
   - Run TypeScript type verification (`npx tsc --noEmit`).
   - Build the Vite production bundle (`npm run build`).
   - Compile the Tauri Windows installer (`npm run tauri build`).

### Option B: Manual Windows Build
```powershell
# 1. Install dependencies
npm install

# 2. Type check
npx tsc --noEmit

# 3. Build desktop installer (.exe / .msi)
npm run tauri build
```
The compiled NSIS installer will be saved to:
`src-tauri/target/release/bundle/nsis/DroidKit_0.1.0_x64-setup.exe`

---

## 4. Building on macOS

1. Ensure Xcode command line tools and Rust are installed:
   ```bash
   xcode-select --install
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. Build DroidKit:
   ```bash
   npm install
   npx tsc --noEmit
   npm run tauri build
   ```
3. Output DMG bundle:
   `src-tauri/target/release/bundle/dmg/DroidKit_0.1.0_x64.dmg` (or arm64 on Apple Silicon)

---

## 5. Building on Linux

1. Install Debian/Ubuntu dependencies:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
   ```
2. Build application bundle:
   ```bash
   npm install
   npx tsc --noEmit
   npm run tauri build
   ```
3. Output AppImage and Deb:
   - `src-tauri/target/release/bundle/appimage/DroidKit_0.1.0_amd64.AppImage`
   - `src-tauri/target/release/bundle/deb/droidkit_0.1.0_amd64.deb`

---

## 6. Browser-Only Mock Mode

DroidKit includes an integrated browser mock engine in `src/mocks/index.ts`.
When you start the development server (`npm run dev`) or preview (`npm run preview`) without the Tauri desktop container:
- `window.__TAURI_INTERNALS__` is detected as undefined.
- `@tauri-apps/api/mocks` intercepts all `invoke(...)` calls.
- Full access to all **138 device models** (35 Samsung + 70 Tecno + 33 Q4), mock connected devices, and simulated FRP bypass flows is available directly in Chrome, Firefox, Safari, or Edge.

---

## 7. FRP Database & Architecture

DroidKit's FRP Removal Module is structured around quarter-based market releases in Kenya and Sub-Saharan Africa:
- **Samsung Database (`src-tauri/src/frp/database.rs`)**: 35 Galaxy models with 15 bypass methods (TalkBack, Combination Firmware, Settings Access, Download Mode).
- **Tecno Database (`src-tauri/src/frp/database.rs`)**: 70 Tecno models across Pop, Spark, Camon, Pova, and Phantom series with Brom/Preloader and SPD Bootloader erase support.
- **Q4 Database (`src-tauri/src/frp/q4_database.rs`)**: 33 models covering Nokia, Moto, Huawei, Sony, Pixel, and Asset Finance locked devices (M-Kopa, Watu Credit, PayJoy).
- **Universal Algorithm Engine (`src-tauri/src/frp/algorithm.rs`)**: Auto-detects chipset family (`Exynos`, `Qualcomm`, `MediaTek`, `Spreadtrum`, `Kirin`) and assigns optimal bypass phases.

---

## 8. Troubleshooting & Common Issues

### 1. `Vite blocked host (allowedHosts)`
- **Symptom**: `Invalid host header` or `Blocked host` when accessing live preview URL.
- **Solution**: `vite.config.ts` is preconfigured with `server.allowedHosts: true` to permit all development tunnel hosts.

### 2. `MSVC Linker cl.exe not found on Windows`
- **Symptom**: `error: linker cl.exe not found` during `cargo build` or `tauri build`.
- **Solution**: Install **Visual Studio 2022 C++ Build Tools** and ensure the Windows 10/11 SDK option is checked.

### 3. `SLA / MTK Auth preloader failure`
- **Symptom**: MediaTek Brom Mode erase fails with `DA Authentication required`.
- **Solution**: Use the **MTK Auth Bypass** method first to disable Secure Boot / SLA verification before sending DA payload.
