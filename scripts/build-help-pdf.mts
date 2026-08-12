// =====================================================================
// Full-colour PDF guide builder — node --experimental-strip-types scripts/build-help-pdf.mts
// Renders src/lib/help-content.ts (the SAME data the in-app Help Center
// shows) into docs/DROIDKIT-HELP-GUIDE.pdf, and copies it to
// public/help-guide.pdf so the app ships it offline.
// No browser needed (pure pdfkit). ASCII-safe text per WinAnsi fonts.
// =====================================================================
import fs from "node:fs"
import path from "node:path"
import PDFDocument from "pdfkit"
import {
  HELP_META, BAND_LEGEND, POLICIES, QUICK_START, SETUP_SECTIONS,
  TROUBLESHOOTING, TOOL_GUIDES, FAQS, GLOSSARY, GET_HELP_STEPS, HELP_LINKS,
  type HelpTone, type HelpPolicy, type TroubleRow, type ToolGuide, type Faq,
} from "../src/lib/help-content.ts"
import { MYTH_HDMI, MYTH_100_RULE } from "../src/lib/rescue-data.ts"

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))

// ---------- palette ----------
const DARK = "#0B1220", INK = "#1E293B", MUTED = "#64748B", HAIR = "#E2E8F0", CARD = "#F6F8FB"
const TEAL = "#0D9488", CYAN = "#0891B2"
const TONE: Record<HelpTone, { fg: string; bg: string; bd: string }> = {
  green: { fg: "#15803D", bg: "#E9F6EE", bd: "#A9D8B8" },
  amber: { fg: "#B45309", bg: "#FBF3E2", bd: "#E7CF96" },
  red: { fg: "#B91C1C", bg: "#FBECEC", bd: "#EBB9B9" },
  slate: { fg: "#475569", bg: "#EEF3F8", bd: "#C3CEDC" },
}

// WinAnsi safety: standard PDF fonts cannot draw arrows/emoji.
const REPL: Record<string, string> = {
  "\u2192": "->", "\u2014": " - ", "\u2013": "-", "\u2018": "'", "\u2019": "'",
  "\u201C": '"', "\u201D": '"', "\u2026": "...", "\u00B7": "*", "\u2264": "<=",
  "\u2265": ">=", "\u00D7": "x", "\u2B50": "*", "\u2011": "-",
}
const safe = (s: string) => s.replace(/[^\x00-\xFF]/g, ch => REPL[ch] ?? "-").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")

const OUT_DOC = process.env.PDF_DEBUG_NOCOMPRESS
  ? path.join("/tmp", "guide-debug.pdf")
  : path.join("docs", "DROIDKIT-HELP-GUIDE.pdf")
const OUT_PUBLIC = path.join("public", "help-guide.pdf")

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 50, bottom: 58, left: 46, right: 46 },
  bufferPages: true,
  compress: !process.env.PDF_DEBUG_NOCOMPRESS, // debug: PDF_DEBUG_NOCOMPRESS=1 -> greppable output
  info: {
    Title: `DroidKit v${pkg.version} - Help, Setup & Policies Guide`,
    Author: "AISACTECH",
    Subject: HELP_META.edition,
    Keywords: "DroidKit, help, policies, setup, FRP, rescue, Android, MiFi, honesty",
  },
})
const stream = fs.createWriteStream(OUT_DOC)
doc.pipe(stream)

const PW = doc.page.width, PH = doc.page.height
const ML = 46, CW = PW - 46 - 46
const LIMIT = PH - 58

let y = 50
const ensure = (h: number) => { if (y + h > LIMIT) { doc.addPage(); y = 50 } }

// ---------- flow primitives ----------
function para(text: string, opts: { size?: number; color?: string; gap?: number; indent?: number; bold?: boolean } = {}) {
  const { size = 9.5, color = INK, gap = 6, indent = 0, bold = false } = opts
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size)
  const h = doc.heightOfString(safe(text), { width: CW - indent })
  ensure(h + gap)
  doc.fillColor(color).text(safe(text), ML + indent, y, { width: CW - indent })
  y = doc.y + gap
}

function sectionBar(num: string, title: string, color: string) {
  ensure(44)
  doc.save().roundedRect(ML, y, CW, 26, 5).fill(color).restore()
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#FFFFFF")
    .text(`${num}   ${safe(title)}`, ML + 12, y + 7, { width: CW - 24 })
  y += 36
  tocEntries.push({ label: `${num}  ${safe(title)}`, color, page: curPage() })
}

function h3(text: string, color = TEAL) {
  ensure(22)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(color).text(safe(text), ML, y, { width: CW })
  y = doc.y + 4
}

function numbered(items: string[], indent = 0, size = 9.5) {
  items.forEach((it, i) => {
    const label = `${i + 1}.`
    doc.font("Helvetica").fontSize(size)
    const h = doc.heightOfString(safe(it), { width: CW - indent - 18 })
    ensure(h + 3)
    doc.font("Helvetica-Bold").fillColor(TEAL).text(label, ML + indent, y, { width: 14 })
    doc.font("Helvetica").fillColor(INK).text(safe(it), ML + indent + 18, y, { width: CW - indent - 18 })
    y = doc.y + 3
  })
  y += 3
}

function card(opts: { title: string; tone: HelpTone; chip?: string; paras?: string[]; steps?: string[] }) {
  const t = TONE[opts.tone]
  doc.font("Helvetica").fontSize(9.5)
  const bodyH =
    (opts.paras ?? []).reduce((a, p) => a + doc.heightOfString(safe(p), { width: CW - 24 }) + 5, 0) +
    (opts.steps ?? []).reduce((a, s) => a + doc.heightOfString(safe(s), { width: CW - 36 }) + 3, 0)
  const H = 14 + 15 + (bodyH > 0 ? 6 : 0) + bodyH + 10
  ensure(H + 8)
  doc.save()
  doc.roundedRect(ML, y, CW, H, 6).fillAndStroke(t.bg, t.bd)
  doc.rect(ML, y, 4, H).fill(t.fg)
  doc.restore()
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(t.fg).text(safe(opts.title), ML + 14, y + 9, { width: CW - 90 })
  if (opts.chip) {
    doc.roundedRect(ML + CW - 82, y + 7, 70, 15, 7).fill(t.fg)
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#FFFFFF")
      .text(safe(opts.chip), ML + CW - 82, y + 11, { width: 70, align: "center" })
  }
  let cy = y + 26
  for (const p of opts.paras ?? []) {
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(safe(p), ML + 14, cy, { width: CW - 24 })
    cy = doc.y + 5
  }
  if (opts.steps) {
    opts.steps.forEach((s, i) => {
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(t.fg).text(`${i + 1}.`, ML + 14, cy, { width: 14 })
      doc.font("Helvetica").fillColor(INK).text(safe(s), ML + 30, cy, { width: CW - 36 })
      cy = doc.y + 3
    })
  }
  y += H + 8
}

function table(headers: string[], widths: number[], rows: string[][], zebra = CARD) {
  const x0 = ML
  // header
  const headerH = 18
  ensure(headerH + 20)
  doc.save().rect(x0, y, CW, headerH).fill(DARK).restore()
  let x = x0
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text(safe(h), x + 5, y + 5, { width: widths[i] - 10 })
    x += widths[i]
  })
  y += headerH
  rows.forEach((row, ri) => {
    doc.font("Helvetica").fontSize(8.5)
    const rh = Math.max(...row.map((c, ci) => doc.heightOfString(safe(c), { width: widths[ci] - 10 }))) + 10
    if (y + rh > LIMIT) {
      doc.addPage(); y = 50
      doc.save().rect(x0, y, CW, headerH).fill(DARK).restore()
      let hx = x0
      headers.forEach((h, i) => {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text(safe(h), hx + 5, y + 5, { width: widths[i] - 10 })
        hx += widths[i]
      })
      y += headerH
    }
    if (ri % 2 === 1) doc.save().rect(x0, y, CW, rh).fill(zebra).restore()
    let cx = x0
    row.forEach((c, ci) => {
      doc.font(ci === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(INK)
        .text(safe(c), cx + 5, y + 5, { width: widths[ci] - 10 })
      cx += widths[ci]
    })
    doc.save().moveTo(x0, y + rh).lineTo(x0 + CW, y + rh).lineWidth(0.5).stroke(HAIR).restore()
    y += rh
  })
  y += 10
}

// ---------- page tracking ----------
const tocEntries: { label: string; color: string; page: number }[] = []
const curPage = () => doc.bufferedPageRange().count - 1  // 0-based absolute index

// =====================================================================
// COVER
// =====================================================================
doc.save()
doc.rect(0, 0, PW, PH).fill(DARK)
// decorative colour bursts
doc.save().opacity(0.16).circle(PW - 60, 110, 190).fill(CYAN).restore()
doc.save().opacity(0.14).circle(70, PH - 120, 160).fill(TEAL).restore()
doc.save().opacity(0.10).circle(PW / 2, PH / 2 - 60, 240).fill("#6366F1").restore()
// icon
try {
  doc.image("public/droidkit-icon-128.png", PW / 2 - 44, 86, { width: 88 })
} catch { /* icon missing is not fatal */ }
doc.font("Helvetica-Bold").fontSize(38).fillColor("#FFFFFF")
  .text(`${HELP_META.appName}`, 0, 198, { width: PW, align: "center" })
doc.font("Helvetica").fontSize(17).fillColor("#7DD3FC")
  .text("Help, Setup & Policies Guide", 0, 250, { width: PW, align: "center" })
doc.font("Helvetica").fontSize(10.5).fillColor("#94A3B8")
  .text(HELP_META.tagline, 0, 282, { width: PW, align: "center" })
// band chips row
const chips: { label: string; c: string }[] = [
  { label: "DOABLE", c: TONE.green.fg },
  { label: "CONDITIONAL", c: TONE.amber.fg },
  { label: "NOT-BY-SOFTWARE", c: TONE.red.fg },
  { label: "UNVERIFIED", c: TONE.slate.fg },
]
const chipW = 122, chipGap = 12, chipsX = (PW - (chipW * 4 + chipGap * 3)) / 2
chips.forEach((ch, i) => {
  const cx = chipsX + i * (chipW + chipGap)
  doc.save().roundedRect(cx, 330, chipW, 26, 13).fill(ch.c).restore()
  doc.font("Helvetica-Bold").fontSize(8.6).fillColor("#FFFFFF")
    .text(ch.label, cx, 339, { width: chipW, align: "center" })
})
doc.font("Helvetica-Oblique").fontSize(10).fillColor("#CBD5E1")
  .text('"No fake 100%. Bands, not promises - physics decides, we just report it."', 60, 388, {
    width: PW - 120, align: "center",
  })
// info plate
doc.save().roundedRect(PW / 2 - 170, 470, 340, 118, 10).fill("#111C33").restore()
const plateX = PW / 2 - 150
doc.font("Helvetica").fontSize(10).fillColor("#94A3B8")
  .text(`Version ${pkg.version}  |  ${HELP_META.edition}`, plateX, 490, { width: 300, align: "center" })
doc.text(`Publisher: ${HELP_META.publisher}  |  Free & open source (MIT)`, plateX, doc.y + 4, { width: 300, align: "center" })
doc.fillColor("#E2E8F0")
  .text("Install  |  Setup  |  Every tool  |  Policies  |  FAQ", plateX, doc.y + 10, { width: 300, align: "center" })
doc.font("Helvetica").fontSize(9).fillColor("#64748B")
  .text(safe(HELP_META.repoUrl), 0, PH - 88, { width: PW, align: "center" })
  .text("Works offline. Nothing phones home. Your devices only.", { width: PW, align: "center" })
doc.restore()

// =====================================================================
// TOC PAGE (page-number column is filled at the end — bufferPages)
// =====================================================================
doc.addPage()
const tocPageIdx = curPage()
y = 50
doc.font("Helvetica-Bold").fontSize(20).fillColor(DARK).text("What's inside", ML, y)
y = doc.y + 6
doc.moveTo(ML, y).lineTo(ML + CW, y).lineWidth(1).stroke(TEAL)
y += 16
para("Read it like a traffic light: the same colour bands used everywhere in the app run through every page of this guide. Green means physics allows it, amber means it depends (model, firmware, or a named third party), red means nobody's software can do it - and grey means we have not bench-verified it yet.", { color: MUTED, size: 9.5 })
const TOC_SLOTS = 7 // number of section entries we will draw later
const tocStartY = y + 8
y = tocStartY + tocPlaceholderHeight()
// "how to use" mini panel
h3("How to use this guide")
numbered([
  "In a hurry at the counter? Section 2 (Setup) and Section 5 (FAQ) answer 90% of questions.",
  "Before any repair job, read the matching Policy in Section 1 and the band colour in Section 5.",
  "This same content lives inside the app: sidebar -> Help & Info. The app version is searchable.",
  "The printable counter cards in docs/kid-sheets/ are the one-page companions to this guide.",
])
// footer honesty plate
ensure(46)
doc.save().roundedRect(ML, LIMIT - 42, CW, 42, 6).fill("#FFF7E6").restore()
doc.save().rect(ML, LIMIT - 42, 4, 42).fill(TONE.amber.fg).restore()
doc.font("Helvetica-Bold").fontSize(9).fillColor(TONE.amber.fg)
  .text("THE HONESTY LAW", ML + 14, LIMIT - 33)
doc.font("Helvetica").fontSize(8.8).fillColor(INK)
  .text("No page of this guide claims what physics cannot deliver. Where a job needs a carrier, Google, a lender or a server, this guide says so - and names the honest route instead.", ML + 14, LIMIT - 21, { width: CW - 28 })

function tocPlaceholderHeight() { return (TOC_SLOTS + 1) * 24 + 10 }

// =====================================================================
// 1 · POLICIES
// =====================================================================
doc.addPage(); y = 50
sectionBar("1", "The policies - promises, rules, refusals", TEAL)
para("Nine plain-word policies that every feature in DroidKit obeys. They are colour-coded: green is a promise we make to you, amber is a rule that keeps you safe or legal, red is a permanent refusal.", { color: MUTED })
for (const p of POLICIES as HelpPolicy[]) {
  card({
    title: p.title,
    tone: p.tone,
    chip: p.tone === "red" ? "NEVER" : p.tone === "amber" ? "RULE" : p.tone === "green" ? "PROMISE" : "NOTE",
    paras: p.paras,
  })
}

// =====================================================================
// 2 · SETUP
// =====================================================================
doc.addPage(); y = 50
sectionBar("2", "Setup, in detail - from download to first scan", CYAN)
para("Sixty seconds if all goes well. If it does not, the symptom doctor at the end of this section is the page to print and keep next to the computer.", { color: MUTED })
h3("Quick start")
numbered(QUICK_START)
for (const s of SETUP_SECTIONS) {
  h3(s.title)
  if (s.intro) para(s.intro, { color: MUTED, gap: 4 })
  numbered(s.steps.map(x => x.text))
}
h3("Symptom doctor - when it refuses")
table(
  ["Symptom", "Why it happens", "The fix"],
  [150, 150, CW - 300],
  (TROUBLESHOOTING as TroubleRow[]).map(r => [r.symptom, r.cause, r.fix]),
)

// =====================================================================
// 3 · TOOLS
// =====================================================================
doc.addPage(); y = 50
sectionBar("3", "Every tool in the app, explained", "#7C3AED")
para("What each view in the sidebar does and the exact clicks to drive it. Remember: Help works without any device connected - everything else wakes up after you select a device.", { color: MUTED })
for (const t of TOOL_GUIDES as ToolGuide[]) {
  card({ title: t.name, tone: "slate", chip: "TOOL", paras: [t.what, ...(t.honesty ? [`HONEST NOTE: ${t.honesty}`] : [])], steps: t.how })
}

// =====================================================================
// 4 · MYTH vs PHYSICS
// =====================================================================
doc.addPage(); y = 50
sectionBar("4", "Myth vs physics - the two cards that stop scams", TONE.red.fg)
para("These two boxes are printed in the app's Rescue Lab too. They are the direct answer to the most common 'magic cable' and 'magic percentage' claims sold on the internet.", { color: MUTED })
card({ title: "HDMI & magic-cable claims", tone: "red", chip: "SCAM ALERT", paras: [safe(MYTH_HDMI)] })
card({ title: "Where '100%' honestly lands, per device class", tone: "amber", chip: "PER-CLASS", paras: [safe(MYTH_100_RULE)] })

// =====================================================================
// 5 · FAQ
// =====================================================================
doc.addPage(); y = 50
sectionBar("5", "Questions & answers (the counter favourites)", TONE.amber.fg)
para(`The ${FAQS.length} questions real users actually ask, answered with the honesty law applied. In the app these are searchable from the Help view.`, { color: MUTED })
for (const f of FAQS as Faq[]) {
  const qH = doc.font("Helvetica-Bold").fontSize(9.8).heightOfString(safe(`Q:  ${f.q}`), { width: CW - 24 })
  const aH = doc.font("Helvetica").fontSize(9.3).heightOfString(safe(f.a), { width: CW - 24 })
  const H = 10 + qH + 4 + aH + 10
  ensure(H + 8)
  doc.save().roundedRect(ML, y, CW, H, 6).fillAndStroke(CARD, HAIR).restore()
  doc.save().rect(ML, y, 4, H).fill(TEAL).restore()
  doc.font("Helvetica-Bold").fontSize(9.8).fillColor(DARK).text(safe(`Q:  ${f.q}`), ML + 14, y + 8, { width: CW - 24 })
  let cy = doc.y + 4
  doc.font("Helvetica").fontSize(9.3).fillColor(INK).text(safe(f.a), ML + 14, cy, { width: CW - 24 })
  y += H + 8
}

// =====================================================================
// 6 · BANDS & WORDS
// =====================================================================
doc.addPage(); y = 50
sectionBar("6", "The bands, and the words behind them", TONE.green.fg)
para("The four labels you see under every job in the app - and the small dictionary for the words repair people throw around.", { color: MUTED })
for (const b of BAND_LEGEND) {
  card({ title: b.band, tone: b.tone, chip: b.band, paras: [b.meaning, `Example: ${b.example}`] })
}
h3("Small dictionary")
table(
  ["Word", "What it actually means"],
  [120, CW - 120],
  GLOSSARY.map(g => [g.term, g.meaning]),
)

// =====================================================================
// 7 · GETTING HUMAN HELP
// =====================================================================
doc.addPage(); y = 50
sectionBar("7", "Getting human help", TONE.slate.fg)
para("In order, so answers are fast and free:", { color: MUTED })
numbered(GET_HELP_STEPS)
h3("Official places")
table(
  ["What", "Where"],
  [180, CW - 180],
  HELP_LINKS.map(l => [l.label, l.url]),
)
h3("Before you report - the 5 facts that make bugs die fast")
numbered([
  `Your DroidKit version (this guide covers v${pkg.version}).`,
  "The exact device model and Android version (System Info view).",
  "What you clicked, in order.",
  "What you expected vs what happened.",
  "Relevant Logcat lines - never passwords, patterns, IMEIs of third parties, or unlock codes.",
])
ensure(70)
doc.save().roundedRect(ML, y, CW, 62, 6).fill("#E9F6EE").restore()
doc.save().rect(ML, y, 4, 62).fill(TONE.green.fg).restore()
doc.font("Helvetica-Bold").fontSize(9.5).fillColor(TONE.green.fg).text("FINAL WORD", ML + 14, y + 9)
doc.font("Helvetica").fontSize(9.2).fillColor(INK)
  .text("DroidKit will never promise you a miracle. It promises you the truth, the exact steps physics allows, and the honest route for the rest - free, offline, and in the open.", ML + 14, y + 24, { width: CW - 28 })

// =====================================================================
// Fill TOC page numbers + footers
// =====================================================================
const total = doc.bufferedPageRange().count
doc.switchToPage(tocPageIdx)
tocEntries.slice(0, TOC_SLOTS).forEach((e, i) => {
  const ey = tocStartY + i * 24
  doc.save().circle(ML + 5, ey + 7, 5).fill(e.color).restore()
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(e.label, ML + 18, ey, { width: CW - 90 })
  const labelW = doc.widthOfString(e.label)
  doc.save().moveTo(ML + 22 + labelW, ey + 9).lineTo(ML + CW - 46, ey + 9).dash(2, { space: 3 }).lineWidth(0.7).stroke(HAIR).restore()
  doc.font("Helvetica-Bold").fontSize(11).fillColor(TEAL).text(`page ${e.page}`, ML + CW - 44, ey, { width: 44 })
})
// footers on every page except the cover (index 0).
// NOTE: pdfkit auto-paginates if text starts below the bottom margin —
// lift the margin while stamping footers, then restore (classic recipe).
for (let i = 1; i < total; i++) {
  doc.switchToPage(i)
  const savedBottom = doc.page.margins.bottom
  doc.page.margins.bottom = 0
  doc.save().moveTo(ML, PH - 40).lineTo(ML + CW, PH - 40).lineWidth(0.6).stroke(HAIR).restore()
  doc.font("Helvetica").fontSize(8).fillColor(MUTED)
    .text(`${HELP_META.appName} v${pkg.version} - Help, Setup & Policies - ${HELP_META.publisher}`, ML, PH - 32, { width: CW - 80, lineBreak: false })
  doc.font("Helvetica-Bold").fillColor(TEAL)
    .text(`Page ${i} of ${total - 1}`, ML + CW - 80, PH - 32, { width: 80, align: "right", lineBreak: false })
  doc.page.margins.bottom = savedBottom
}
doc.switchToPage(total - 1)
doc.end()

stream.on("finish", () => {
  const kb = (fs.statSync(OUT_DOC).size / 1024).toFixed(1)
  console.log(`✓ ${OUT_DOC}  (${total} pages, ${kb} kB)`)
  if (!process.env.PDF_DEBUG_NOCOMPRESS) {
    fs.copyFileSync(OUT_DOC, OUT_PUBLIC)
    console.log(`✓ ${OUT_PUBLIC}  (bundled copy for the in-app Help view)`)
  }
})
