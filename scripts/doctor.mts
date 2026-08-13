// =====================================================================
// DroidKit environment doctor — `npm run doctor`
// ---------------------------------------------------------------------
// One command that diagnoses EXACTLY why "the app won't launch/build"
// on any machine, bot or human. Prints a verdict table and the precise
// next step. Hard-fails (exit 1) only on the real blockers; everything
// else is a warning with a fix line.
//
//   node --experimental-strip-types scripts/doctor.mts   (Node >= 22.6)
// =====================================================================

import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

let hardFailures = 0
const fixes: string[] = []

function log(kind: "ok" | "warn" | "fail", label: string, detail: string) {
  const icon = kind === "ok" ? "✅" : kind === "warn" ? "⚠️" : "❌"
  console.log(`${icon} ${label} — ${detail}`)
  if (kind === "fail") hardFailures++
}

function sh(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim()
  } catch {
    return null
  }
}

const REQ_NODE = [22, 6] // major.minor — matches package.json engines
const REQ_NPM = 10

console.log("🩺 DroidKit environment doctor\n==============================")

// ---- 1. Node ---------------------------------------------------------
const nodeMajor = Number(process.versions.node.split(".")[0])
const nodeMinor = Number(process.versions.node.split(".")[1])
if (nodeMajor > REQ_NODE[0] || (nodeMajor === REQ_NODE[0] && nodeMinor >= REQ_NODE[1])) {
  log("ok", "Node.js", `v${process.versions.node} (needs >= ${REQ_NODE.join(".")} — Vite 7 + type-stripped test scripts)`)
} else {
  log("fail", "Node.js", `v${process.versions.node} is too old — Vite 7 requires ^20.19/>=22.12 and this repo's tests need >=22.6`)
  fixes.push("Install Node 22 LTS:  winget install --id OpenJS.NodeJS.LTS -e   (Windows)  |  nvm install 22 && nvm use 22   (macOS/Linux)")
}

// ---- 2. npm ----------------------------------------------------------
const npmMajor = Number(sh("npm -v")?.split(".")[0] ?? 0)
if (npmMajor >= REQ_NPM) log("ok", "npm", `v${sh("npm -v")} (needs >= ${REQ_NPM})`)
else {
  log("warn", "npm", `v${sh("npm -v")} — older than ${REQ_NPM}`)
  fixes.push("npm install -g npm@latest")
}

// ---- 3. dependencies -------------------------------------------------
if (existsSync("node_modules/.bin/tsc")) log("ok", "Dependencies", "node_modules installed (tsc present)")
else {
  log("fail", "Dependencies", "node_modules missing or incomplete — the build cannot start")
  fixes.push("npm ci        # frozen lockfile, one truth (NOT npm install)")
}

// ---- 4. build toolchain ----------------------------------------------
if (existsSync("node_modules/.bin/vite")) log("ok", "Vite", "bundler present")
else log("fail", "Vite", "vite missing — run npm ci")

// ---- 5. Rust (desktop app only) --------------------------------------
const cargo = sh("cargo --version")
if (cargo) log("ok", "Rust", `${cargo.split(" ")[0]} present → \`npm run tauri:dev\` + \`npm run tauri:build\` available`)
else {
  log("warn", "Rust", "no cargo on PATH — the desktop app cannot build, but the FULL UI still runs in browser mock mode")
  fixes.push("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh    # then: npm run tauri:dev")
}

// ---- 5b. lockfile truth (the publish-matrix bun detect) ---------------
if (existsSync("bun.lock") || existsSync("bun.lockb")) {
  log("fail", "Lockfile", "bun.lock present — tauri-action will run bun, not npm, and the publish matrix will go red")
  fixes.push("rm -f bun.lock bun.lockb     # npm ci is the one truth (package-lock.json)")
} else {
  log("ok", "Lockfile", "no bun.lock — tauri-action will pick npm")
}

// ---- 6. Android tools (device features) ------------------------------
const adb = sh("adb version")
if (adb) log("ok", "ADB", adb.split("\n")[0])
else log("warn", "ADB", "no adb on PATH — UI/dev works, physical-device features need the Android SDK platform-tools")

// ---- 7. port check (the classic tauri white-window trap) -------------
const portBusy = sh("node -e \"require('net').connect(1420,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))\"; echo $?")?.trim()
const busy = portBusy === "0"
if (busy) {
  log("warn", "Port 1420", "already in use — a second dev server will now FAIL LOUDLY (strictPort) instead of silently shifting")
  fixes.push("Stop the process holding :1420 (or the stray `npm run dev`), then start ONE dev server")
} else log("ok", "Port 1420", "free — dev server can start cleanly")

// ---- 7b. tauri.conf.json schema check (the publisher regression) ------
// Verified against the Tauri 2.x schema (docs.rs tauri-utils BundleConfig):
// `publisher` is a TOP-LEVEL bundle field; `bundle.windows.publisher`
// does NOT exist and fails `tauri build` with
//   "bundle > windows: Additional properties are not allowed ('publisher' was unexpected)"
try {
  const tauriConf = JSON.parse(execSync("node -e \"console.log(JSON.stringify(require('./src-tauri/tauri.conf.json').bundle))\"", { encoding: "utf8" }).trim())
  const hasRootPublisher = typeof tauriConf.publisher === "string" && tauriConf.publisher.length > 0
  const hasWindowsPublisher = tauriConf.windows && "publisher" in tauriConf.windows
  if (hasWindowsPublisher) {
    log("fail", "tauri.conf.json", "'publisher' inside bundle.windows — INVALID per the Tauri 2.x schema (publish/CI will fail with: bundle > windows: publisher unexpected)")
    fixes.push("Move \"publisher\" from bundle.windows UP to the bundle root (next to copyright). Verified: docs.rs tauri-utils BundleConfig.publisher is top-level.")
  } else if (!hasRootPublisher) {
    log("warn", "tauri.conf.json", "bundle.publisher missing at the bundle root (optional metadata — not a build blocker)")
  } else {
    log("ok", "tauri.conf.json", "bundle.publisher at the top level — schema-valid placement")
  }
} catch {
  log("fail", "tauri.conf.json", "unparseable — tauri build will fail")
  fixes.push("Repair src-tauri/tauri.conf.json (valid JSON required)")
}

// ---- 8. dist ----------------------------------------------------------
if (existsSync("dist/index.html")) log("ok", "Production build", "dist/ present → `npm run preview` available")
else log("warn", "Production build", "no dist/ yet — run `npm run build` before preview or tauri:build")

// ---- verdict ----------------------------------------------------------
console.log("\n--- Verdict ---")
if (hardFailures === 0) {
  console.log("✅ READY. Run one of:")
  console.log("   npm run dev          # full UI, browser mock mode (NO Rust, NO device needed)")
  console.log("   npm run tauri:dev    # real desktop app (needs Rust + Android tools for devices)")
  console.log("   npm run build        # production bundle → dist/")
} else {
  console.log(`❌ ${hardFailures} hard blocker(s). Fix in order:`)
  for (const f of fixes) console.log(`   → ${f}`)
  console.log("   Then re-run: npm run doctor")
}
process.exit(hardFailures === 0 ? 0 : 1)
