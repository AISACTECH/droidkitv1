// =====================================================================
// Rescue Lab data — laptops, carrier unlock, modems, screen locks,
// black screens. Pure content + decision data; zero device commands.
//
// Repo honesty law applies everywhere below:
//   * bands are "doable" / "conditional" / "not-by-software" — no fake 100%,
//   * anything decided by someone else's server (carrier database, Google,
//     Apple, lender MDM) is labelled honestly — same physics as server FRP,
//   * repair-ethics consent travels with every lane: your own devices, or
//     your customer's device with their authorization. Never lender-locked
//     (Watu/M-Kopa/Lipa-Mdogo-Mdogo) circumvention, never IMEI rewriting
//     (illegal in Kenya under CA rules).
// =====================================================================

export type RescueBand = "doable" | "conditional" | "not-by-software"

export interface RescueStep {
  text: string
  /** optional command the technician copies into their own terminal */
  cmd?: string
}

export interface RescueMethod {
  title: string
  band: RescueBand
  /** one honest line: when this works and when it doesn't */
  when: string
  steps: RescueStep[]
  warn?: string
}

export const bandLabel: Record<RescueBand, string> = {
  "doable": "DOABLE",
  "conditional": "CONDITIONAL",
  "not-by-software": "NOT BY SOFTWARE",
}

// ======================= 💻 PC / LAPTOP PASSWORD =======================

export const PC_ACCOUNT_TYPES: { sign: string; meaning: string; route: string }[] = [
  { sign: "Sign-in screen shows an EMAIL address", meaning: "Microsoft account (online)", route: "Only the official web reset works — do it from any phone/browser: account.live.com/password/reset. No local tool can change a Microsoft account password (server-side — our law).", },
  { sign: "Sign-in screen shows a plain username", meaning: "Local account (offline)", route: "Fully rescue-able offline — methods below.", },
  { sign: "Says 'domain' / work or school", meaning: "Managed by an organization", route: "Only their IT admin can reset. Do not fight it — it's the same server law.", },
]

export const PC_WINDOWS_METHODS: RescueMethod[] = [
  {
    title: "You still have ONE admin login working",
    band: "doable",
    when: "Any Windows. Fastest and safest route that exists.",
    steps: [
      { text: "Sign in with the working admin account, open an Administrator terminal (right-click Start → Terminal/Command Prompt (Admin))." },
      { text: "List accounts:", cmd: "net user" },
      { text: "Reset the forgotten one (Windows will ask you to type the new password):", cmd: "net user USERNAME *" },
    ],
  },
  {
    title: "Windows 10/11 'Reset password' link with security questions",
    band: "doable",
    when: "Local account created on Win10 1803+ where the owner set 3 security questions.",
    steps: [
      { text: "On the lock screen, type any wrong password once — a 'Reset password' link appears under the box." },
      { text: "Answer the 3 questions → set a new password. Done in 2 minutes.", },
    ],
  },
  {
    title: "Rescue USB → offline password blank (NTPWEdit / chntpw class)",
    band: "conditional",
    when: "Local accounts on Windows 7–11. The classic professional route. Needs: a second working PC + an empty 8GB+ USB stick + about 30 minutes.",
    steps: [
      { text: "On the working PC, build a rescue USB from a reputable toolkit image (e.g. Hiren's BootCD PE — hirensbootcd.org — or a Windows install USB + recovery). Write it with Rufus/Ventoy." },
      { text: "Boot the LOCKED laptop from the USB: power on and tap the brand's boot-menu key (table below)." },
      { text: "In the rescue environment open NTPWEdit (or chntpw on Linux rescue media), load C:\\Windows\\System32\\config\\SAM, pick the user, choose 'Change/blank password', SAVE." },
      { text: "Reboot without the USB → sign in with the new/blank password." },
    ],
    warn: "If BitLocker / 'Device Encryption' is ON (very common on Windows 11 24H2 clean installs), booting from USB makes Windows demand the 48-digit recovery key — get it FIRST from account.microsoft.com/devices/recoverykey (the owner's Microsoft account). Without it, offline edits can strand the data. Also: blanking a password from outside destroys access to any EFS-encrypted files and saved browser passwords for that account.",
  },
  {
    title: "Original password reset disk / Windows install media utilman swap",
    band: "conditional",
    when: "Reset disk: only if the owner made one BEFORE forgetting. Utilman swap: legacy route, blocked by Secure Boot on many modern laptops.",
    steps: [
      { text: "Reset disk: plug it in at the lock screen → 'Reset password' wizard runs." },
      { text: "Utilman route (advanced, legacy): boot install media → Shift+F10 → swap utilman.exe with cmd.exe in System32 → click Accessibility icon on lock screen → net user. Verified dead on Secure Boot + TPM machines — keep for old stock.", },
    ],
  },
  {
    title: "macOS password",
    band: "not-by-software",
    when: "FileVault is on by default on modern Macs.",
    steps: [
      { text: "FileVault ON: only the owner's Apple-ID recovery or recovery key opens it. No software tool on Earth — same server/encryption law as Android 15/16 FRP." },
      { text: "FileVault OFF (old Macs): recovery partition → resetpassword utility works offline." },
    ],
  },
]

export const PC_BOOT_KEYS: { brand: string; bootMenu: string; bios: string }[] = [
  { brand: "HP", bootMenu: "Esc then F9", bios: "F10" },
  { brand: "Dell", bootMenu: "F12", bios: "F2" },
  { brand: "Lenovo", bootMenu: "F12 (or Novo pinhole button)", bios: "F2 / Fn+F2" },
  { brand: "Acer", bootMenu: "F12 (enable in BIOS first)", bios: "Del / F2" },
  { brand: "ASUS", bootMenu: "Esc / F8", bios: "F2 / Del" },
  { brand: "Toshiba / Dynabook", bootMenu: "F12", bios: "F2" },
  { brand: "Samsung laptop", bootMenu: "Esc / F10", bios: "F2" },
  { brand: "MSI", bootMenu: "F11", bios: "Del" },
  { brand: "Generic desktop", bootMenu: "F8 / F11 / F12", bios: "Del" },
]

// ======================= 📶 CARRIER / NETWORK UNLOCK =======================

export const CARRIER_PHYSICS_NOTE =
  "A carrier lock is a line in the CARRIER'S database (iPhone especially: Apple's activation server + carrier policy). Like Android 15/16 FRP, it is decided on someone else's server — nobody's software computes around it. What software CAN do: detect the lock truthfully, reach the OFFICIAL unlock route, and service the legacy era where codes were generated on-device."

export const CARRIER_DETECT: RescueMethod[] = [
  {
    title: "Is it actually locked? (2-minute truth test)",
    band: "doable",
    when: "Always do this before promising anything to a customer.",
    steps: [
      { text: "iPhone: Settings → General → About → 'Carrier Lock'. 'No SIM restrictions' = already unlocked." },
      { text: "Samsung: dial *#7465625# (service menu) or Settings → Connections → More connection settings → Network unlock — it says Network locked / unlocked." },
      { text: "Universal: insert a SIM from a DIFFERENT carrier and make a call. 'SIM network unlock PIN' / 'SIM not supported' = locked." },
      { text: "Check blacklist state before spending money: a blacklisted (stolen/unpaid) IMEI stays blocked on networks even after unlock. Check on imei.info or the carrier.", },
    ],
  },
  {
    title: "Official unlock — the route that really is near-100%",
    band: "doable",
    when: "Any carrier-branded phone whose contract is finished / eligible. Free or cheap, and permanent.",
    steps: [
      { text: "US imports (common in Kenya): AT&T — att.com/deviceunlock (free if eligible); T-Mobile — app/account request (policy: postpaid 40 days+ paid off); Verizon — AUTO-unlocks 60 days after activation, nothing to do." },
      { text: "UK/EU imports (EE/O2/Vodafone): each has a free unlock portal once out of contract." },
      { text: "Kenya: Safaricom/Airtel devices are normally sold UNLOCKED — a 'locked' Kenya phone is usually a FINANCED phone (Lipa Mdogo Mdogo, M-Kopa, Watu). That is a lender MDM lock, NOT a carrier lock — we do not defeat lender locks (law + ethics), route the customer to the lender." },
      { text: "Waiting is normal: official unlocks arrive OTA in 1–14 days — iPhones flip when Apple activates the policy server-side." },
    ],
  },
  {
    title: "Third-party IMEI unlock services",
    band: "conditional",
    when: "Carrier refuses (foreign carrier, no original account). These services pay for carrier-database access — which is exactly why they can do what software cannot.",
    steps: [
      { text: "Reality: cost $10–$80, 1–14 days, success varies by carrier/model; refunds matter — use sellers with buyer protection." },
      { text: "We do NOT resell these and we do NOT print their marketing claims in here. Verify reviews; blacklist state still applies afterwards." },
    ],
  },
  {
    title: "Legacy on-device codes (old NCK era)",
    band: "conditional",
    when: "Pre-~2013 stock only: old Huawei/ZTE/Alcatel phones & modems computed unlock codes from the IMEI on-device. This is a bench skill, not a promise.",
    steps: [
      { text: "WARNING — attempt counters: these devices allow a limited number of wrong codes (often 5–10), then HARD-LOCK forever. Never type calculator output blindly; confirm the algorithm on a donor unit first and log it in the FRP Lab → Patch Oracle bench log." },
      { text: "Modems: the lock state AND remaining attempts are readable by AT command — see the Modem lane (AT^CARDLOCK?)." },
    ],
  },
]

// ======================= 📡 MODEM RESCUE =======================

export const MODEM_LEGAL_NOTE =
  "Kenya law: altering a device's IMEI is illegal (CA rules) — READ the IMEI, never rewrite it. Firmware work below = replacing official/stock firmware, which is legitimate repair."

export const MODEM_AT_COMMANDS: { cmd: string; meaning: string; band: RescueBand }[] = [
  { cmd: "AT", meaning: "Handshake — any reply 'OK' means the modem brain is alive", band: "doable" },
  { cmd: "ATI", meaning: "Manufacturer / model / firmware version (know your patient)", band: "doable" },
  { cmd: "AT+CGSN", meaning: "READ the IMEI — verify it matches the sticker (read-only, never rewrite)", band: "doable" },
  { cmd: "AT+CSQ", meaning: "Signal quality — 99,99 = antenna/radio problem, not SIM", band: "doable" },
  { cmd: "AT+CPIN?", meaning: "SIM state — READY / SIM PIN / not inserted", band: "doable" },
  { cmd: "AT^CARDLOCK?", meaning: "Huawei: lock status AND remaining code attempts — check BEFORE any unlock code", band: "conditional" },
  { cmd: "AT+CLCK=\"PN\",2", meaning: "Standard: query network (PN) personalization state", band: "conditional" },
]

export const MODEM_FIRMWARE: RescueMethod[] = [
  {
    title: "Reflash stock firmware with the vendor's own updater",
    band: "doable",
    when: "'Uninstalling firmware' = you don't remove firmware, you REPLACE it. Official updater package for the exact model is the safe way (Huawei/D-link/ZTE/MF-class vendor pages or the ISP's page).",
    steps: [
      { text: "Identify EXACT model + current firmware (ATI above). Wrong board firmware = dead modem." },
      { text: "Run the vendor updater on Windows with the modem directly in the PC port (no USB hub), battery/grid power stable." },
      { text: "If it asks for a flash code on old Huawei stock — that code protects accidental flashes; obtain it from the official service channel, and never burn NCK attempts guessing." },
    ],
  },
  {
    title: "Web dashboard / WebUI reinstall",
    band: "doable",
    when: "Dashboard corrupt or wrong-language WebUI on MiFi/dongle devices.",
    steps: [
      { text: "Many devices accept a WebUI-only update package via the device's own 192.168.x.x update page — safest of all reflashes." },
    ],
  },
  {
    title: "Deep unbrick (Balong USB-loader / boot-pin class)",
    band: "conditional",
    when: "Modem fully dead after a bad flash: no ports, no LEDs response to AT. Bench-only procedure.",
    steps: [
      { text: "Involves test-points/boot-pin shorting and loading the boot firmware over raw USB. Model-specific, genuinely brick-or-revive — bench research per model; when it works it's magic, when it doesn't the modem becomes a paper-weight. Price the job accordingly." },
    ],
    warn: "Never flash a file you cannot trace to the exact model+board revision. 'Similar model' firmware kills modems.",
  },
]

// ======================= 🔓 PHONE SCREEN LOCK =======================

export const SCREENLOCK_ERAS: { era: string; band: RescueBand; truth: string }[] = [
  { era: "Android ≤ 8 pattern lock (gesture.key era)", band: "doable", truth: "Pattern hash is RAW unsalted SHA-1 — our offline cracker below breaks it in seconds with the data preserved. You need the gesture.key file (root ADB, TWRP, or chip-level read on dead units)." },
  { era: "Android ≤ 7 PIN/password (password.key era)", band: "conditional", truth: "Salted hashes + gatekeeper transition era — bench research per model; the data-preserving window is narrow but real on some legacy stock." },
  { era: "Samsung with 'Remote unlock' enabled", band: "doable", truth: "OFFICIAL: SmartThings Find (findmymobile.samsung.com) → 'Unlock' — resets the lock screen remotely, data untouched. Must have been enabled before lockout; needs the owner's Samsung account." },
  { era: "Android 9 – 16 pattern/PIN/password", band: "not-by-software", truth: "Gatekeeper/Weaver hardware + file-based encryption: the key IS the lock. Offline cracking is impossible by design — every tool claiming otherwise on modern Android is wiping (they just don't say it)." },
  { era: "The honest modern route", band: "doable", truth: "Recovery factory reset (data erased — say it to the customer FIRST) or OEM account recovery. After reset, FRP appears — that's what the FRP views + FRP Lab in this same app are for. Full journey exists inside DroidKit." },
]

// ======================= 🖥️ BLACK SCREEN =======================

export const BLACKSCREEN_TRIAGE: {
  id: string
  question: string
  yes: { verdict: string; band: RescueBand; moves: RescueStep[] }
  no: { verdict: string; band: RescueBand; moves: RescueStep[] }
}[] = [
  {
    id: "alive",
    question: "Any sign of life? (vibration on power press, LED, sound, warmth, notification pings)",
    yes: {
      verdict: "Brain alive — likely display path (panel/flex/backlight) or display subsystem crash. DATA-FIRST window is open.",
      band: "doable",
      moves: [
        { text: "Force-restart first (fixes crashed display drivers): brand combos below." },
        { text: "Still black? If USB debugging was EVER enabled & authorized on this PC: open DroidKit → Screen view — the reflection window mirrors & controls the phone even with a dead panel. BACK UP DATA NOW via Files view before any repair (screens get replaced; data doesn't)." },
        { text: "No ADB? USB-OTG + computer mouse: many phones show pointer support — plug an OTG adapter + mouse, click blindly using muscle memory is a myth — but with an HDMI/DP-capable phone (Samsung DeX, some flagships) plug a monitor: real second chance." },
        { text: "Then hardware: screen swap is a parts job — quote parts+labor after data is safe." },
      ],
    },
    no: {
      verdict: "Possibly deep-dead — but 'dead screen' ≠ dead phone. Do the 3 checks before pronouncing death.",
      band: "conditional",
      moves: [
        { text: "Charge 30–60 min on a KNOWN-good cable+brick, then try power again (deep-discharged batteries fake death)." },
        { text: "Force-restart combo (below) a few times — hold long (some need 15–30s)." },
        { text: "Plug into PC: any USB connect sound? Check DroidKit Devices view. A phone Windows sees in Brom/EDL/recovery is REVIVABLE — go to FRP Lab Phase Runbook / flash stock." },
        { text: "Truly nothing after all 3 (+water history? never charge a wet phone — corrosion clock is ticking; open & clean properly, the rice thing is a myth) → board-level diagnosis bench." },
      ],
    },
  },
]

export const FORCE_RESTART: { brand: string; combo: string; recovery: string }[] = [
  { brand: "Samsung (new, no Bixby btn)", combo: "Power + Vol-Down 10–15s", recovery: "Power + Vol-Up (plug into PC) " },
  { brand: "Samsung (Bixby btn era)", combo: "Power + Vol-Down 10s", recovery: "Power + Vol-Up + Bixby" },
  { brand: "Tecno / Infinix / Itel", combo: "Power 10–15s (or Power + Vol-Up)", recovery: "Power + Vol-Up → robot → Power+Vol-Up tap" },
  { brand: "Xiaomi / Redmi / POCO", combo: "Power 10–15s", recovery: "Power + Vol-Up" },
  { brand: "Huawei / Honor", combo: "Power 10–15s", recovery: "Power + Vol-Up" },
  { brand: "Nokia / Motorola / Pixel", combo: "Power 10–30s (Pixel: Power+Vol-Up)", recovery: "Power + Vol-Up, or Power then Vol-Up+Down dance" },
  { brand: "Oppo / Vivo / Realme", combo: "Power 10s", recovery: "Power + Vol-Down" },
]

export const RESCUE_CONSENT =
  "Repair-ethics rule for every lane in this view: work only on devices you own, or a customer's device with their clear authorization. We never defeat lender/finance locks (Watu, M-Kopa, Lipa Mdogo Mdogo) and never rewrite IMEIs (illegal in Kenya)."
