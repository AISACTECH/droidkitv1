// =====================================================================
// getprop dump → Fingerprint (read-only, public keys only)
// --------------------------------------------------------------------
// Accepts `adb shell getprop` output in either `[key]: [value]` or
// `key=value` form. Guesses chipset family from public hardware
// strings. Never infers ADB authorization (that is a handshake, not a
// property) — defaults to Unauthorized so we do not reopen the ADB
// ladder by accident.
// =====================================================================

import { brandIdOf, parseAndroidMajor } from "../adaptive-engine/bands.ts"
import type { ChipsetFamily, DeviceMode, Fingerprint, FrpState } from "../adaptive-engine/types.ts"
import type { GetpropParse } from "./types.ts"

const GETPROP_LINE = /^(?:\[([^\]]+)\]:\s*\[([^\]]*)\]|([A-Za-z0-9._-]+)=(.*))$/

export function parseGetpropLines(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const m = line.match(GETPROP_LINE)
    if (!m) continue
    const key = (m[1] ?? m[3] ?? "").trim()
    const value = (m[2] ?? m[4] ?? "").trim()
    if (key) out[key] = value
  }
  return out
}

export function guessChipsetFamily(props: Record<string, string>): ChipsetFamily {
  const blob = [
    props["ro.hardware"],
    props["ro.board.platform"],
    props["ro.hardware.chipname"],
    props["ro.soc.model"],
    props["ro.product.board"],
    props["ro.boot.hardware"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (/mt[0-9]|helio|dimensity|mediatek|mtk/.test(blob)) return "MediaTek"
  if (/sm[0-9]{4}|snapdragon|qcom|msm[0-9]|qualcomm/.test(blob)) return "Qualcomm"
  if (/exynos|s5e[0-9]/.test(blob)) return "Exynos"
  if (/ums[0-9]|unisoc|spreadtrum|sp9863|sc9863|sc7731/.test(blob)) return "Spreadtrum"
  if (/kirin|hi3[0-9]/.test(blob)) return "Kirin"
  // Tensor is not in the engine enum — Unknown is the honest mapping
  // (A15/16 + Unknown → official_only, which is correct for Pixel).
  return "Unknown"
}

function guessMode(props: Record<string, string>): DeviceMode {
  const mode = (props["ro.bootmode"] ?? props["sys.boot.mode"] ?? "").toLowerCase()
  if (mode.includes("download")) return "DownloadMode"
  if (mode.includes("edl") || mode.includes("qcom")) return "EDL"
  if (mode.includes("brom") || mode.includes("preloader")) return "BromMode"
  if (mode.includes("recovery")) return "Recovery"
  if (mode.includes("fastboot") || mode.includes("bootloader")) return "Fastboot"
  return "Normal"
}

function guessFrp(props: Record<string, string>): FrpState {
  const persist = (props["persist.sys.frp"] ?? props["ro.frp.pst"] ?? "").toLowerCase()
  if (persist === "0" || persist === "inactive" || persist === "false") return "Inactive"
  if (persist === "1" || persist === "active" || persist === "true") return "Active"
  return "Unknown"
}

/**
 * Build a Fingerprint from a pasted getprop dump. ADB authorization is
 * NEVER inferred from properties — that would fake an ADB-live window.
 */
export function fingerprintFromGetprop(text: string): GetpropParse {
  const properties = parseGetpropLines(text)
  const warnings: string[] = []
  const brandRaw = properties["ro.product.brand"] || properties["ro.product.manufacturer"] || ""
  const model = properties["ro.product.model"] || properties["ro.product.device"] || ""
  const androidVersionRaw = properties["ro.build.version.release"] || ""
  const androidMajor = parseAndroidMajor(androidVersionRaw)
  if (!brandRaw) warnings.push("ro.product.brand missing — brand defaults to 'other'.")
  if (!model) warnings.push("ro.product.model missing — modelCode empty.")
  if (androidMajor === null) warnings.push("ro.build.version.release unparseable.")
  warnings.push("ADB authorization cannot be read from getprop — defaulting to Unauthorized (honest).")

  const fingerprint: Fingerprint = {
    brand: brandIdOf(brandRaw || "other"),
    brandRaw: brandRaw || "unknown",
    modelCode: model,
    marketingName: properties["ro.product.marketname"] || properties["ro.product.nickname"] || null,
    chipsetFamily: guessChipsetFamily(properties),
    chipsetName: properties["ro.hardware"] || properties["ro.board.platform"] || "unknown",
    androidMajor,
    androidVersionRaw: androidVersionRaw || "unknown",
    sdkVersion: properties["ro.build.version.sdk"] || "",
    securityPatch: properties["ro.build.version.security_patch"] || null,
    binaryVersion: properties["ro.boot.em.did"] || properties["ro.boot.binary"] || properties["ro.build.version.incremental"] || null,
    bootloaderVersion: properties["ro.bootloader"] || null,
    buildFingerprint: properties["ro.build.fingerprint"] || null,
    knoxVersion: properties["net.knoxsso.version"] || properties["ro.config.knox"] || null,
    frpState: guessFrp(properties),
    adbState: "Unauthorized",
    deviceMode: guessMode(properties),
    hasSim: (properties["gsm.sim.state"] ?? "").toLowerCase().includes("ready"),
    hasWifi: true,
  }

  return { fingerprint, properties, warnings }
}
