// =====================================================================
// Release preflight (`npm run release:prepare`)
// --------------------------------------------------------------------
// Everything we can prove BEFORE anyone presses "Run workflow".
// Does not build installers (that needs Rust + the publish matrix).
// Hard-fails on the regressions that burned yesterday's two runs:
//   * bun.lock present (tauri-action then runs `bun tauri build`)
//   * publisher nested under bundle.windows (Tauri 2 schema reject)
//   * leftover merge-conflict markers
//   * version drift across the three manifests
// =====================================================================

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, extname } from "node:path"

let failed = 0
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`)
  if (!ok) failed++
}

const root = join(import.meta.dirname, "..")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const tauri = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"))
const cargo = readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8")
const cargoVer = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1]

console.log("Paralock release preflight\n==========================")

check("semver in package.json", /^\d+\.\d+\.\d+$/.test(pkg.version), pkg.version)
check("package.json == tauri.conf.json", pkg.version === tauri.version, `${pkg.version} / ${tauri.version}`)
check("package.json == Cargo.toml", pkg.version === cargoVer, `${pkg.version} / ${cargoVer}`)
check("packageManager is npm (one lockfile truth)", typeof pkg.packageManager === "string" && pkg.packageManager.startsWith("npm@"))

check("NO bun.lock (tauri-action lockfile detect)", !existsSync(join(root, "bun.lock")))
check("NO bun.lockb", !existsSync(join(root, "bun.lockb")))
const gitignore = readFileSync(join(root, ".gitignore"), "utf8")
check(".gitignore lists bun.lock", gitignore.split(/\r?\n/).some((l) => l.trim() === "bun.lock"))

const bundle = tauri.bundle ?? {}
check("bundle.publisher at TOP level", typeof bundle.publisher === "string" && bundle.publisher.length > 0, String(bundle.publisher ?? ""))
check("bundle.windows has NO publisher key", !(bundle.windows && "publisher" in bundle.windows))

const livePublish = existsSync(join(root, ".github/workflows/publish.yml"))
  ? readFileSync(join(root, ".github/workflows/publish.yml"), "utf8")
  : ""
const stagedPublish = readFileSync(join(root, "docs/workflows-manual/publish.yml"), "utf8")
const stagedCi = readFileSync(join(root, "docs/workflows-manual/ci.yml"), "utf8")
check("staged publish.yml forces npm tauriScript", /tauriScript:\s*npm run tauri/.test(stagedPublish))
check("staged publish.yml does NOT use setup-bun", !/setup-bun/.test(stagedPublish))
check("staged ci.yml exists and names frontend-gates", /frontend-gates/.test(stagedCi) && /cargo check/.test(stagedCi))
if (livePublish) {
  // The App token cannot update workflow files. Live publish.yml on main
  // is already npm-based; tauriScript / preflight live in the staged copy
  // until a human pastes them. Fail only if bun is still wired.
  check("live publish.yml does NOT use setup-bun", !/setup-bun/.test(livePublish))
  if (!/tauriScript:\s*npm run tauri/.test(livePublish)) {
    console.log("⚠️  live publish.yml missing tauriScript — paste docs/workflows-manual/publish.yml (App token cannot update workflow files)")
  } else {
    check("live publish.yml forces npm tauriScript", true)
  }
} else {
  console.log("⚠️  live publish.yml missing — paste docs/workflows-manual/publish.yml via the GitHub UI")
}
check("staged ci.yml ready to paste", existsSync(join(root, "docs/workflows-manual/ci.yml")))

const CONFLICT = /^(<<<<<<<|=======|>>>>>>>)/m
const TEXT_EXT = new Set([".ts", ".tsx", ".mts", ".js", ".mjs", ".json", ".md", ".yml", ".yaml", ".toml", ".css", ".html"])
const SKIP_DIRS = new Set(["node_modules", "dist", "target", ".git", ".arena", ".cache"])
const conflictHits: string[] = []
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full)
    else if (TEXT_EXT.has(extname(name)) && st.size < 2_000_000) {
      const txt = readFileSync(full, "utf8")
      if (CONFLICT.test(txt)) conflictHits.push(full.slice(root.length + 1))
    }
  }
}
walk(root)
check("no leftover merge-conflict markers", conflictHits.length === 0, conflictHits.join(", "))

console.log("\n--- Next step (this sandbox cannot produce installers) ---")
console.log("1. Merge this branch to main.")
console.log("2. If .github/workflows/ci.yml is still missing on main: paste docs/workflows-manual/ci.yml via the GitHub UI.")
console.log("3. Actions → publish → Run workflow. A tag push (v*) also triggers it.")
console.log("4. Draft Release appears with Linux / Windows / macOS (ARM+Intel) installers.")

process.exit(failed === 0 ? 0 : 1)
