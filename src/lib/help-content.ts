// =====================================================================
// Help Center + PDF Guide content — ONE source of truth.
// src/components/views/HelpCenter.tsx renders this in-app;
// scripts/build-help-pdf.mts renders the same data into
// docs/PARALOCK-HELP-GUIDE.pdf (full-colour printable edition).
// RULES for this file:
//   - ASCII-only text (the PDF engine uses WinAnsi fonts) — no emoji,
//     no smart quotes, arrows written as "->".
//   - The honesty law applies here too: no invented percentages, no
//     "100% FRP" claims, bands over promises, misses stay visible.
// =====================================================================

export const HELP_META = {
  appName: "Paralock",
  publisher: "Isaac Real",
  developer: "Isaac Real",
  email: "isaacreal2026@gmail.com",
  tagline: "The free, honest Android + repair toolkit",
  repoUrl: "https://github.com/AISACTECH/droidkitv1",
  issuesUrl: "https://github.com/AISACTECH/droidkitv1/issues",
  pdfInApp: "/help-guide.pdf",
  pdfInRepo: "docs/PARALOCK-HELP-GUIDE.pdf",
  edition: "Full-colour edition, August 2026",
}

// ------------------------- traffic-light bands -------------------------

export type HelpTone = "green" | "amber" | "red" | "slate"

export const BAND_LEGEND: { band: string; tone: HelpTone; meaning: string; example: string }[] = [
  {
    band: "DOABLE",
    tone: "green",
    meaning: "Physics and the software path are on your side. The method is known, testable, and the app either does it or hands you exact steps.",
    example: "Legacy-Huawei MiFi NCK codes (math is deterministic for that generation), feature-phone default locks, gesture.key cracking on Android <= 8.",
  },
  {
    band: "CONDITIONAL",
    tone: "amber",
    meaning: "Possible, but only with the right model, the right firmware, or a named third party. Real risk exists (attempt counters, bricking, data loss) - the app gates and warns instead of guessing.",
    example: "E5573Cs-609 boot-pin route, ZTE/Alcatel NCK via cheap verified code services, chntpw on a Windows LOCAL account.",
  },
  {
    band: "NOT-BY-SOFTWARE",
    tone: "red",
    meaning: "Decided on someone else's server (Google, Apple, a carrier, a lender). No app on Earth computes around that - anyone claiming otherwise is selling a lie. We name the honest route instead.",
    example: "Android 15/16 FRP after a hard reset, Microsoft/Apple-account laptop passwords, lender MDM locks (Watu, M-Kopa, Lipa Mdogo Mdogo).",
  },
  {
    band: "UNVERIFIED",
    tone: "slate",
    meaning: "A faithful port of published work that our own bench has NOT confirmed yet. It is labelled, fenced, and never auto-fired. The bench log - not marketing - decides when it graduates.",
    example: "Huawei V201-era NCK candidate for 2012+ models.",
  },
]

// ------------------------------ policies ------------------------------

export interface HelpPolicy {
  id: string
  title: string
  tone: HelpTone
  paras: string[]
}

export const POLICIES: HelpPolicy[] = [
  {
    id: "honesty",
    title: "1. The Honesty Law (our first and highest policy)",
    tone: "green",
    paras: [
      "Paralock never prints a success number it cannot prove. The famous advert line - 'total FRP bypass on Android 15/16, every model' - is false for every tool on Earth, because the decision lives on Google's server, not in any cable or app. Anyone selling you that promise is selling a scam; you will never find it in this app.",
      "Instead: traffic-light bands (DOABLE / CONDITIONAL / NOT-BY-SOFTWARE), named limits, named risks, and a bench log where real measurements - not marketing - calibrate every claim. Where we have not measured something, it is labelled UNVERIFIED in plain sight.",
      "Where the math genuinely is deterministic (legacy Huawei modems), we say exactly that and show the real published examples the engine was verified against. Per-class truth is the product.",
    ],
  },
  {
    id: "ownership",
    title: "2. Your devices only - the ownership policy",
    tone: "amber",
    paras: [
      "Use Paralock on devices YOU own, or a customer's device with their clear authorization. Every repair lane carries this consent rule on screen, and the in-app consent card (docs/kid-sheets/CONSENT-CARD.md) is free to print for shop counters.",
      "FRP, screen locks, and passwords exist to protect owners from thieves. If you cannot sign in to the account that locked a device, our position is simple: the correct party is the account holder, the seller, or the platform's official recovery - not a bypass.",
    ],
  },
  {
    id: "refusals",
    title: "3. Jobs we refuse, permanently (and why)",
    tone: "red",
    paras: [
      "Lender/financed-phone MDM locks (Watu Simu, M-Kopa, Lipa Mdogo Mdogo and similar): a 'carrier-locked' phone bought on instalments in Kenya is almost always a LENDER lock, not a carrier lock. The phone belongs to the lender until the last payment. Defeating it is not unlock - it is taking property. The honest route: finish paying, or call the lender. We will not build this, ever.",
      "IMEI rewriting: illegal in Kenya under Communications Authority rules and in most countries. No Paralock feature touches the IMEI, by design.",
      "Stolen or found devices: if ownership cannot be shown, the answer is the official-recovery page or the police - not a tool.",
    ],
  },
  {
    id: "privacy",
    title: "4. Privacy and your data",
    tone: "green",
    paras: [
      "Paralock runs on YOUR computer. There is no Paralock account, no sign-up, and no Paralock server that receives your device data. Device information, logs, and settings stay in local storage on your machine (the app's own store files).",
      "The one thing that CAN leave your machine is the bench log - and only when you personally export the JSON file and choose to share it. Nothing uploads itself.",
      "No adverts, no trackers, no bundled 'offers'. The codebase is open - the claim is falsifiable by reading it.",
    ],
  },
  {
    id: "free",
    title: "5. Free - the pricing policy",
    tone: "green",
    paras: [
      "Paralock is free and open source (MIT licence). No subscription, no trial clock, no 'credits', no feature locked behind a payment page inside the app.",
      "Some jobs genuinely require third parties (for example a $3-8 NCK code service for ZTE/Alcatel MiFis, or an authorized Samsung/Google account recovery). We name them honestly, we take no cut, and we always show the free path first when one physically exists.",
    ],
  },
  {
    id: "experimental",
    title: "6. Lab features are EXPERIMENTAL",
    tone: "amber",
    paras: [
      "The FRP Lab (Patch Oracle) and the Rescue Lab are research benches. They are clearly badged EXPERIMENTAL in the app. They teach, predict, detect, and gate - and where software physically cannot act, they say so instead of pretending.",
      "Predictions from the Patch Oracle are falsifiable: each forecast states what would prove it wrong, and the calibration record is kept in the open. Wrong predictions are corrected publicly, in the changelog.",
    ],
  },
  {
    id: "safety",
    title: "7. Safety policy: counters, bricks, and your photos",
    tone: "amber",
    paras: [
      "Attempt counters are sacred. Modems and MiFis permanently hard-lock after too many wrong codes (some Alcatels die after 3). The app's Auto-Session reads remaining attempts BEFORE allowing any code entry, blocks at 2 or fewer, validates the IMEI checksum, and never lets a machine fire the entry command - a human clicks it.",
      "Data loss is always named before a route is suggested. Every method card states if it ERASES the device. Fast, flashy and data-destroying is a bad trade we refuse to hide.",
      "Brick risk is stated wherever flashing or boot-pin work is involved, with the model-exactness warning ('never follow a guide for a similar model').",
    ],
  },
  {
    id: "legal",
    title: "8. Legality quick notes (Kenya first)",
    tone: "slate",
    paras: [
      "Self-unlocking a device you OWN (carrier-unlocking your own MiFi or phone, removing your own forgotten password) is legal. Unlocking removes the lock, not physics - a 3G-era dongle will still never see Faiba's band-28 4G.",
      "Illegal / off-limits: IMEI rewriting; defeating lender MDM (see policy 3); bypassing activation locks on devices whose ownership you cannot show.",
      "When in doubt, the official carrier or platform route is printed in the app alongside the DIY route, so you can always choose the fully-official path.",
    ],
  },
  {
    id: "support",
    title: "9. Support policy and fair expectations",
    tone: "slate",
    paras: [
      "Support happens in the open via GitHub issues - so answers help the next person too. Include your Paralock version, your device model, what you clicked, and what you expected vs what happened.",
      "We will never ask for your passwords, your Google/Samsung account, your unlock codes, or remote access to your computer. Anyone doing so in our name is an impostor.",
      "Fixes land in the open repo. If a job is physically impossible, the honest answer will stay 'no' - with the best real route attached - rather than a pretend feature.",
    ],
  },
]

// --------------------------- quick start ---------------------------

export const QUICK_START: string[] = [
  "Install Paralock on your computer (next page shows Windows, macOS and Linux).",
  "On the phone: Settings -> About phone -> tap 'Build number' 7 times to unlock Developer options.",
  "In Developer options, switch ON 'USB debugging'.",
  "Connect the phone with a good USB cable (a DATA cable - some cheap cables are charge-only) and tap 'Allow' on the phone's USB-debugging prompt.",
  "In Paralock, open Devices and wait for your phone to appear, then click it to select it.",
  "Open Help (this view) any time, and read the band colours before trusting any job: green, amber, red.",
]

// --------------------------- setup guide ---------------------------

export interface HelpStep { text: string; cmd?: string }
export interface SetupSection {
  id: string
  title: string
  intro?: string
  steps: HelpStep[]
}

export const SETUP_SECTIONS: SetupSection[] = [
  {
    id: "install",
    title: "Install Paralock",
    intro: "Get the installer for your computer from the project's GitHub Releases page (link on the last page).",
    steps: [
      { text: "Windows: download the .msi (or .exe) installer, double-click it, and follow the prompts. If SmartScreen warns because the app is new, click 'More info' -> 'Run anyway' (the binary is built publicly by GitHub Actions from this repo)." },
      { text: "macOS: download the .dmg, open it, and drag Paralock into Applications. On first open, right-click -> Open if Gatekeeper hesitates." },
      { text: "Linux: download the .AppImage (chmod +x it, then run) or the .deb (sudo dpkg -i file.deb)." },
      { text: "Building from source instead: install Node 20+ and Rust, then run 'npm install' and 'npm run tauri:build'. The repo's docs/CI-GREEN-GUIDE.md explains the one-time automation setup for maintainers." },
    ],
  },
  {
    id: "drivers",
    title: "USB drivers (Windows only)",
    intro: "macOS and Linux normally need nothing. On Windows, the phone appears only after its ADB driver exists.",
    steps: [
      { text: "Install your phone brand's official driver (Samsung, Xiaomi, Transsion for Tecno/Infinix/Itel, etc.) - or Google's universal 'Google USB Driver' for Pixel-class devices." },
      { text: "In Device Manager, the phone should appear as an 'Android ADB Interface' (not 'Unknown device'). If it shows an error icon, update its driver manually and pick the ADB one." },
      { text: "Try a rear motherboard USB port and a different cable if installation loops - charge-only cables are the number one silent cause." },
    ],
  },
  {
    id: "debugging",
    title: "Switch on USB debugging (on the phone)",
    steps: [
      { text: "Settings -> About phone -> 'Build number': tap it 7 times until it says 'You are now a developer'. (Transsion phones: it can hide under About phone -> 'Build number' too; some show it after tapping 'Version'.)" },
      { text: "Back in Settings -> System -> Developer options -> turn ON 'USB debugging'." },
      { text: "Plug into the computer. A prompt 'Allow USB debugging?' appears on the phone: tick 'Always allow from this computer' and tap Allow. If no prompt appears, unplug, run 'revoke USB debugging authorizations' in Developer options, and retry." },
      { text: "Wireless pairing (Android 11+): Developer options -> 'Wireless debugging' -> 'Pair device with pairing code', then use Paralock's + button in the sidebar." },
    ],
  },
  {
    id: "firstuse",
    title: "First use - the 60-second tour",
    steps: [
      { text: "Devices: pick your phone. Everything else unlocks after a device is selected - except Help, which always works." },
      { text: "System Info: confirms what is really inside (brand, model, Android version, chip). Every repair decision starts from these facts." },
      { text: "FRP Removal: the guided classic workflow for supported scenarios. FRP Lab: the experimental Patch Oracle - physics-layer survival and patch forecasts." },
      { text: "Rescue Lab: six repair lanes (PC password, carrier unlock, MiFi/modem, button phone, screen lock, black screen). Read a lane's band colour before starting any job." },
      { text: "Files / Apps / Screen / Logcat / Shell: everyday power tools once the phone is connected." },
    ],
  },
]

export interface TroubleRow { symptom: string; cause: string; fix: string }

export const TROUBLESHOOTING: TroubleRow[] = [
  { symptom: "'npm install' or the app fails to install from GitHub", cause: "Old clone conflicted with generated files, or a syntax slip in an edited file", fix: "Delete the folder and clone fresh, then: npm install -> npm run lint -> npm run build. The paired-devices store syntax slip that broke CI was fixed; docs/CI-GREEN-GUIDE.md has the one-time bot setup." },
  { symptom: "Phone not listed in Devices", cause: "USB debugging off, missing driver, or charge-only cable", fix: "Follow the Setup page top to bottom; test with another cable first - it is the most common cause." },
  { symptom: "'Unauthorized' next to the device", cause: "The phone's Allow prompt was not accepted", fix: "Unplug, revoke USB debugging authorizations on the phone, replug, tick 'Always allow', tap Allow." },
  { symptom: "MiFi unlock code 'not accepted'", cause: "Wrong code generation for the model era, or counter already low", fix: "Stop. Read attempts left first (the Modem lane shows how). One correct-generation code, not guesses." },
  { symptom: "Feature worked in a YouTube video but not here", cause: "Many videos show server-side-impossible 'bypasses' or patched firmware holes", fix: "Check the band colour of your exact model in the Rescue Lab. NOT-BY-SOFTWARE means nobody's software does it - the honest route is printed." },
  { symptom: "The app feels slow to start", cause: "First-run antivirus scan of a new binary, or an old hard disk", fix: "Second launch is the fair one. Measured first-load wire size is about 260 kB gzip - see docs/PERFORMANCE.md." },
]

// ---------------------------- tool guides ----------------------------

export interface ToolGuide {
  id: string
  name: string
  what: string
  how: string[]
  honesty?: string
}

export const TOOL_GUIDES: ToolGuide[] = [
  {
    id: "devices",
    name: "Devices",
    what: "Your connected phones and tablets, USB or wireless.",
    how: [
      "Connect by cable (USB debugging on) or pair wirelessly (Android 11+) with the + button.",
      "Click a device to select it - the other views wake up.",
      "If nothing appears: cable first, driver second, debugging prompt third.",
    ],
  },
  {
    id: "system-info",
    name: "System Info",
    what: "The truth sheet: real model, Android version, security patch, chipset, battery.",
    how: [
      "Open it immediately after connecting - every rescue decision depends on these facts.",
      "The patch level here feeds the Patch Oracle's survival estimate.",
    ],
  },
  {
    id: "frp",
    name: "FRP Removal (classic)",
    what: "The guided FRP workflow covering several hundred known models and methods.",
    how: [
      "Select the brand and exact model from the catalogue.",
      "Follow the on-screen steps in order; skip nothing.",
      "Results differ per model and patch level - that is physics, not a defect.",
    ],
    honesty: "Server-side FRP (Android 15/16 era) cannot be bypassed by any software, including this one - the app says so on screen instead of pretending.",
  },
  {
    id: "frp-lab",
    name: "FRP Lab + Patch Oracle (experimental)",
    what: "Physics-layer survival for each FRP method, patch-timeline forecasts with calibration, and an exportable bench log.",
    how: [
      "It pre-fills from the connected device's patch level.",
      "Read bands, not wishes: each method shows what survives and what would disprove the forecast.",
      "Export the bench log JSON to calibrate claims with real measurements.",
    ],
  },
  {
    id: "rescue-lab",
    name: "Rescue Lab (experimental) - six lanes",
    what: "PC password, carrier unlock, MiFi/modem unlock, button-phone locks, phone screen locks, and black screens - each with detection first and bands, not promises.",
    how: [
      "PC lane: identify the account type first (Microsoft vs local vs domain). Local accounts get the boot-USB route; Microsoft/accounts get official recovery - no software pretends otherwise.",
      "Carrier lane: detect the lock type first; lender-financed phones are refused by policy with the honest route shown.",
      "Modem lane: identify the exact model, read remaining attempts, then (legacy Huawei) generate verified codes or (ZTE/Alcatel) use the named $3-8 service route. Auto-Session gates every step.",
      "Button-phone lane: SIM PIN vs phone lock first, then defaults (1234, 0000, 1122, 12345), then the per-brand chipset route.",
      "Screen-lock lane: pick the Android era; Android <= 8 gestures can be cracked offline by the built-in tool, Android 9+ is server-side truth.",
      "Black-screen lane: a yes/no triage tree - force-restart combos, then repair-shop honesty if the panel is dead.",
    ],
  },
  {
    id: "files",
    name: "Files",
    what: "Browse, pull and push files between computer and phone.",
    how: ["Select a device, open Files, navigate folders, use pull/push to copy.", "Great for rescuing photos before a risky repair."],
  },
  {
    id: "apps",
    name: "Apps",
    what: "List, inspect and manage installed packages on the device.",
    how: ["Select a device, open Apps, search for the package name.", "Uninstall/disable actions follow normal Android permissions."],
  },
  {
    id: "screen",
    name: "Screen",
    what: "See and control the phone's screen from the computer.",
    how: ["Select a device and open Screen.", "Essential partner for the black-screen and screen-lock lanes when touch is broken."],
  },
  {
    id: "performance",
    name: "Performance",
    what: "Live CPU, memory and battery readouts from the device.",
    how: ["Select a device and open Performance.", "Use it to spot a runaway app before blaming hardware."],
  },
  {
    id: "logcat",
    name: "Logcat",
    what: "The phone's live diagnostic log stream.",
    how: ["Select a device, open Logcat, reproduce the problem, copy the errors.", "Attach the relevant lines (never passwords) to GitHub issues."],
  },
  {
    id: "shell",
    name: "Shell",
    what: "Direct ADB shell for experts.",
    how: ["Everything typed here runs on the phone with shell-user power - type carefully.", "If you are not sure what a command does, do not run it; ask in Help first."],
  },
]

// ------------------------------- FAQ -------------------------------

export interface Faq { q: string; a: string; tag: string }

export const FAQS: Faq[] = [
  {
    tag: "claims",
    q: "Can Paralock remove FRP on Android 15/16 completely, like some apps promise?",
    a: "No - and neither can they, whatever their adverts say. That decision happens on Google's server after a reset. Any tool, cable or video claiming full removal on those versions is a scam. Paralock shows the physics, the real options per version, and the honest route (the account owner, official recovery) instead of selling the lie.",
  },
  {
    tag: "claims",
    q: "Then what does '100% working' mean anywhere in this app?",
    a: "Only where physics makes it true: per device class. Legacy Huawei modems - the code math is deterministic for that generation (verified against real published examples). Button phones - defaults or one known route covers the great majority. Android 15/16 FRP, carrier-locked phones, Microsoft/Apple-account laptops - zero by software, for anyone. One number for everything would be a lie; the bands page is the product.",
  },
  {
    tag: "carrier",
    q: "My carrier does not exist any more (Orange Kenya / Telkom-era pocket WiFi). Is my locked MiFi e-waste?",
    a: "No. A MiFi checks the unlock code INSIDE itself - there is no carrier server to die. The lock is dead, not the device. The Modem lane identifies your exact model, reads remaining attempts, and gives the route: verified code generation for legacy Huawei, boot-pin firmware route for E5573Cs-609, or the named $3-8 code services for ZTE/Alcatel. Then set the new carrier's APN (Safaricom, Airtel, Telkom, Faiba values are listed in the lane).",
  },
  {
    tag: "carrier",
    q: "A shop 'unlocked' my financed phone and it re-locked. Why?",
    a: "Because it was never a carrier lock. Watu/M-Kopa/Lipa Mdogo Mdogo phones are lender-managed (MDM): the re-lock is the lender's server, and it will keep happening until the phone is fully paid. Paralock refuses this job by policy - the honest route is the lender, not another shop.",
  },
  {
    tag: "cable",
    q: "Can an HDMI cable bypass the lock on modern devices?",
    a: "No cable can. HDMI and USB-C DisplayPort carry picture and sound only - there is no command channel in them. On ANY device, modern or old, an 'HDMI bypass' is physically impossible; anyone selling it is scamming. What display-out DOES do: with Samsung DeX-class phones you can SEE a broken-touch screen and click it with a USB-OTG mouse. Visibility, not bypass.",
  },
  {
    tag: "cable",
    q: "Can a USB cable reset my laptop's password from another computer?",
    a: "No - computers take no password-reset commands through any PC-to-PC cable. There is no such protocol, on any operating system. The bootable rescue USB you build IS the 'cable method'; the PC lane walks you through it, account type by account type.",
  },
  {
    tag: "modems",
    q: "How many times can I try an unlock code on my MiFi?",
    a: "It depends on the model - Huaweis typically allow about 10, several Alcatels hard-lock after just 3 wrong tries, and ZTEs are often around 5. This is why the Auto-Session reads your remaining attempts FIRST, blocks at 2 or fewer, validates the IMEI checksum, and lets only a human fire the final entry. Never guess a code.",
  },
  {
    tag: "modems",
    q: "The V201 code generation is 'UNVERIFIED'. Why show it at all?",
    a: "Because hiding it would be pretending it does not exist, and pretending it works would be worse. It is a faithful port of published Huawei work, clearly labelled, fenced off from auto-entry, and waiting for donor-bench calibration (the calibration guide is in docs/BENCH-CALIBRATION-GUIDE.md). The bench log decides graduation - not marketing.",
  },
  {
    tag: "phones",
    q: "My button/keypad phone (Itel, Tecno, Nokia) asks for a phone lock code.",
    a: "First make sure it is the PHONE lock, not your SIM PIN (the lane's first card separates them - SIM PIN uses defaults from the SIM pack, and PUK comes free from the carrier). For the phone lock: try the defaults 1234 / 0000 / 1122 / 12345, then follow the per-brand chipset route in the Button-phone lane. The lock lives in local firmware - no server - so this class is one of the most genuinely doable rescues in the app.",
  },
  {
    tag: "phones",
    q: "I forgot my phone's pattern. Can you crack it without wiping?",
    a: "Android 8 and older: yes - the Screen-lock lane includes a working gesture.key cracker (tested: all 389,112 possible patterns; it finds matches from the on-device hash). Android 9+: the lock moved into hardware-backed storage; offline cracking is over for everyone. Then the honest options are Samsung's findmymobile (if set up), or a wipe via recovery - the lane says which applies to your era.",
  },
  {
    tag: "phones",
    q: "My phone fell and the screen is black but it rings. Dead?",
    a: "Maybe not. The Black-screen lane is a yes/no triage: force-restart combos per brand, charge-and-try-again, screen-mirror to check if the phone is alive behind a dead panel (your data is often fully rescuable), and the honest 'panel replacement is a hardware job' verdict when it is.",
  },
  {
    tag: "pc",
    q: "I forgot my Windows laptop password. What actually works?",
    a: "Three different worlds: MICROSOFT account -> reset online at account.live.com/password/reset (no software can do this locally). LOCAL account -> the boot-USB route with chntpw clears it in minutes; the PC lane gives the exact steps, including the BitLocker check you must run FIRST so you do not lock yourself out of your own files. DOMAIN/work laptop -> only your IT admin. The lane identifies which world you are in before touching anything.",
  },
  {
    tag: "pc",
    q: "Will the PC rescue delete my files?",
    a: "The chntpw route for local accounts does not touch personal files. 'Reset this PC' has a keep-files option, and the lane puts the data-backup step first in every route. Any route that erases is labelled ERASES before you choose it - never after.",
  },
  {
    tag: "privacy",
    q: "Does Paralock send my device data anywhere?",
    a: "No. It runs on your computer; there is no Paralock account or cloud. The only file that can leave is the bench log you personally export and choose to share. The code is open if you want to verify the claim.",
  },
  {
    tag: "money",
    q: "Why is it free? What is the catch?",
    a: "No catch: MIT-licensed open source. The catch exists in the $30/month tools that promise server-side-impossible miracles - the comparison lives in docs/COMPARISON-2026-FINAL.md. Where a job genuinely needs a third party (a $3-8 code service, an official recovery page) the app says so and takes no cut.",
  },
  {
    tag: "setup",
    q: "Do I need internet for Paralock to work?",
    a: "Only to install it and to read linked web resources. The core work - detection, guides, code generation, the cracker, help and the PDF guide - is offline. Nothing phones home.",
  },
  {
    tag: "setup",
    q: "Is unlocking my own phone or MiFi legal in Kenya?",
    a: "Self-unlocking devices you own is legal. Rewriting IMEIs is illegal (Communications Authority rules) and Paralock never touches the IMEI. Defeating lender MDM on financed phones is not unlocking - it is taking the lender's property, and this app refuses it by policy.",
  },
  {
    tag: "features",
    q: "One feature only supports my phone by talking to it over cable - why not fully automatic?",
    a: "Read-only AT probes (identify model, read attempts) can be automated - the Auto-Session does this, and the native serial backend RFC is ready in docs/RFC-MODEM-SERIAL-BACKEND.md. The unlock-entry command itself stays human-fired by design: a machine must never guess against a permanent attempt counter. That is a policy, not a missing button.",
  },
]

// ----------------------------- glossary -----------------------------

export interface GlossaryTerm { term: string; meaning: string }

export const GLOSSARY: GlossaryTerm[] = [
  { term: "ADB", meaning: "Android Debug Bridge - the official cable/wireless channel between computer and phone that every Paralock phone feature uses." },
  { term: "FRP", meaning: "Factory Reset Protection. After a reset, Android demands the previous Google account. Newer versions enforce it on Google's server." },
  { term: "NCK", meaning: "Network Control Key - the code that removes a carrier lock from a modem/MiFi. Typed once, counted forever." },
  { term: "Attempt counter", meaning: "How many wrong codes a lock accepts before it dies permanently. Read it before typing anything." },
  { term: "Luhn check", meaning: "The checksum built into every IMEI; the app validates it so a typo never burns an attempt." },
  { term: "IMEI", meaning: "The device's 15-digit identity. Reading it: fine. Rewriting it: illegal in Kenya and never touched by this app." },
  { term: "MDM", meaning: "Mobile Device Management - remote control by a company or lender. Financed phones re-lock because of MDM, not carriers." },
  { term: "APN", meaning: "Access Point Name - the settings entry that tells a SIM how to reach the internet (Safaricom = safaricom, Airtel = airtelgprs.com, Telkom = telkom, Faiba = jtl)." },
  { term: "Bootloader / EDL / Brom", meaning: "Low-level chip modes used for deep repair. Powerful and brick-capable; the Rescue Lab routes you only with model-exact instructions." },
  { term: "EDL", meaning: "Emergency Download mode (Qualcomm chips) - a fire-rescue door for dead devices, used by service tools." },
  { term: "Band (traffic light)", meaning: "Green DOABLE / amber CONDITIONAL / red NOT-BY-SOFTWARE. The honest difficulty label on every job." },
  { term: "Bench log", meaning: "The exportable JSON record of real measurements the lab keeps; it is how UNVERIFIED claims graduate." },
  { term: "Patch Oracle", meaning: "The FRP Lab engine that estimates method survival against security patches and publishes falsifiable forecasts." },
  { term: "spd_dump", meaning: "Open-source tool for Spreadtrum/Unisoc feature phones - the button-phone lane's deep route for stubborn Itel/Tecno locks." },
]

// ------------------------ getting help page ------------------------

export const GET_HELP_STEPS: string[] = [
  "Find your exact model and Android version (System Info view, or the sticker under a MiFi's battery).",
  "Search this Help view and the FAQ - most questions are already answered.",
  "Check the band colour for your exact model in the FRP Lab / Rescue Lab lane.",
  "Still stuck? Open a GitHub issue (link below) with: Paralock version, device model, what you clicked, expected vs actual, and log lines from Logcat. Never include passwords or unlock codes.",
  "Urgent shop counter question? The printable kid-sheets in docs/kid-sheets/ are made for exactly that moment.",
]

export const HELP_LINKS: { label: string; url: string }[] = [
  { label: "Email Isaac Real", url: "mailto:isaacreal2026@gmail.com" },
  { label: "GitHub repository", url: "https://github.com/AISACTECH/droidkitv1" },
  { label: "Report a problem (issues)", url: "https://github.com/AISACTECH/droidkitv1/issues" },
  { label: "Coverage map (which brands/routes)", url: "https://github.com/AISACTECH/droidkitv1/tree/main/docs/COVERAGE-MAP.md" },
  { label: "Honest comparison vs paid FRP apps", url: "https://github.com/AISACTECH/droidkitv1/tree/main/docs/COMPARISON-2026-FINAL.md" },
  { label: "CI / install-from-git fix guide", url: "https://github.com/AISACTECH/droidkitv1/tree/main/docs/CI-GREEN-GUIDE.md" },
]
