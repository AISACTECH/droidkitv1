// =====================================================================
// FRP Adaptive Engine — rapid UI-flow refinement tool (WBS A2-3.2 / A2-3.3)
// ---------------------------------------------------------------------
// Usage: node --experimental-strip-types scripts/refine-ui-flows.mts [path/to/journal-export.json]
//
// Reads the engine's journal export (JSON) or a raw failure-dump file,
// classifies every failure, and suggests concrete updates:
//   * keyword candidates for the classifier table (word-frequency
//     analysis of unknown dumps, stop-word + existing-keyword filtered)
//   * transition/flow-map hints for unclassifiable screens
// The team then applies suggestions to ui-samples.ts / ui-fsm.ts and
// runs `npm run test:adaptive` — data edit → test → ship.
// =====================================================================

import { readFileSync, existsSync } from "node:fs"
import { classifyFromDump } from "../src/lib/adaptive-engine/index.ts"

// Existing classifier keywords (lowercased) — suggestions must be NEW.
const EXISTING = new Set([
  "this device was reset", "verify your account", "gsf.login", "google account", "sign in to continue", "previously synced",
  "enter your email", "email or phone", "forgot email", "add your account",
  "enter your password", "forgot password", "type your password",
  "2-step verification", "google terms of service", "agree", "privacy policy",
  "emergencydialer", "emergency call", "dialpad",
  "hwmoduletest", "test mode", "dimming", "megacam", "tof", "barometer",
  "developer options", "oem unlocking", "build number",
  "usb debugging", "android debugging",
  "allow usb debugging", "rsa key fingerprint", "always allow from this computer",
  "com.android.settings", "system settings", "connections", "about phone",
  "wi-fi", "wifi", "wireless", "network & internet",
  "mobile data", "sim card", "cellular", "data network",
  "copy apps", "copy data", "apps & data", "transfer",
  "hi there", "welcome", "get started", "let's go", "language", "start",
  "android recovery", "wipe data/factory reset", "reboot system now",
  "fastboot mode", "download mode", "odin mode", "do not turn off target",
  "too many attempts", "locked for", "try again in", "wait 24",
  "launcher3", "oneui.home", "miui.home", "com.transsion", "nova launcher", "app drawer", "recents",
  "samsung account", "find my mobile", "hi os", "xos", "phoenix", "network setup", "palm store",
  "mi account", "hyperos", "miui",
])

const STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "that", "this", "from", "text", "device", "screen",
  "button", "click", "continue", "next", "back", "done", "okay", "cancel", "skip", "account",
])

/** Tokenize a dump into candidate keyword phrases (1–2 words). */
export function tokenizeCandidates(dump: string): { phrase: string; count: number }[] {
  const words = dump
    .toLowerCase()
    .replace(/[^a-z0-9*#\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  const counts = new Map<string, number>()
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    counts.set(w, (counts.get(w) ?? 0) + 1)
    const prev = words[i - 1]
    if (prev) {
      const pair = `${prev} ${w}`
      if (pair.split(" ").every((p) => p.length >= 3)) counts.set(pair, (counts.get(pair) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count || b.phrase.length - a.phrase.length)
}

/** Suggest NEW classifier keywords for a dump that classified as unknown. */
export function suggestKeywords(dump: string, limit = 5): string[] {
  return tokenizeCandidates(dump)
    .filter((c) => !EXISTING.has(c.phrase) && ![...EXISTING].some((e) => e.includes(c.phrase)))
    .slice(0, limit)
    .map((c) => c.phrase)
}

export interface RefineReport {
  analyzed: number
  unknown: number
  suggestions: { dumpId: string; keywords: string[]; hint: string }[]
}

/** Analyze journal-export entries (kind=fail with meta.dump) and produce the report. */
export function refineFromEntries(entries: { kind?: string; text?: string; meta?: Record<string, unknown> }[]): RefineReport {
  const fails = entries.filter((e) => e.kind === "fail" && typeof e.meta?.dump === "string")
  const report: RefineReport = { analyzed: fails.length, unknown: 0, suggestions: [] }
  fails.forEach((e, i) => {
    const dump = String(e.meta?.dump ?? "")
    const c = classifyFromDump(dump, "other")
    if (c.state === "unknown") {
      report.unknown += 1
      report.suggestions.push({
        dumpId: `fail-${i + 1}`,
        keywords: suggestKeywords(dump),
        hint:
          "Add the strongest keyword to the classifier table (ui-fsm.ts KEYWORDS), or add a " +
          "full sample to ui-samples.ts with the correct expected state, then run test:adaptive.",
      })
    }
  })
  return report
}

// ---------- CLI (only when run directly, not when imported by tests) ----------
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/refine-ui-flows.mts") ?? false
if (isMain) {
  const arg = process.argv[2]
  if (!arg) {
    console.log("Usage: node --experimental-strip-types scripts/refine-ui-flows.mts path/to/journal-export.json")
    process.exit(2)
  }
  if (!existsSync(arg)) {
    console.error(`No such file: ${arg}`)
    process.exit(1)
  }
  const raw = JSON.parse(readFileSync(arg, "utf8"))
  const entries = Array.isArray(raw) ? raw : raw.entries
  const report = refineFromEntries(entries ?? [])
  console.log(`Analyzed ${report.analyzed} failure entries; ${report.unknown} classified as unknown.\n`)
  for (const s of report.suggestions) {
    console.log(`${s.dumpId}: suggested keywords → ${s.keywords.join(", ") || "(none above threshold)"}`)
    console.log(`  ${s.hint}\n`)
  }
  process.exit(0)
}
