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
  { era: "The honest modern route", band: "doable", truth: "Recovery factory reset (data erased — say it to the customer FIRST) or OEM account recovery. After reset, FRP appears — that's what the FRP views + FRP Lab in this same app are for. Full journey exists inside Paralock." },
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
        { text: "Still black? If USB debugging was EVER enabled & authorized on this PC: open Paralock → Screen view — the reflection window mirrors & controls the phone even with a dead panel. BACK UP DATA NOW via Files view before any repair (screens get replaced; data doesn't)." },
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
        { text: "Plug into PC: any USB connect sound? Check Paralock Devices view. A phone Windows sees in Brom/EDL/recovery is REVIVABLE — go to FRP Lab Phase Runbook / flash stock." },
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

// ============ 📡 MiFi / POCKET-WIFI CARRIER UNLOCK (round 2) ============
// The correction that matters: a modem/MiFi checks its unlock code
// LOCALLY — there is no carrier server in the loop. A locked MiFi whose
// carrier DIED (Orange KE, Telkom-era stock) is therefore fully
// free-able, and self-unlocking your own device to use a better-covered
// SIM is legal. This is different physics from iPhone/carrier phones —
// the Lane says so explicitly so we stay honest in both directions.

export const MIFI_PHYSICS_NOTE =
  "Modems & pocket WiFis verify the unlock code INSIDE the device — no carrier server, ever. That's why a locked Orange/Telkom-era MiFi is NOT a dead device: only its lock is dead. Self-unlock = legal (you own it). The one real enemy is the attempt counter — read remaining attempts BEFORE typing anything, and enter ONE correct-generation code, not guesses."

export const MIFI_IDENTIFY: RescueStep[] = [
  { text: "Find the exact model: sticker under the battery / inside the cover (e.g. E5573Cs-609, MF927U, MW40V). The model — not the carrier logo — decides the route. Carriers rebrand the same hardware." },
  { text: "Or plug it in and read it: ATI (terminal) or open the WebUI — Huawei 192.168.8.1, ZTE 192.168.0.1, Alcatel 192.168.1.1 → Device Information shows model + IMEI." },
  { text: "Write the 15-digit IMEI down from the sticker and CROSS-CHECK it with AT+CGSN — you will validate it with the app's built-in checksum before generating anything." },
  { text: "READ REMAINING ATTEMPTS before any code: Huawei — AT^CARDLOCK? (reply shows attempts left). Others — AT+CLCK=\"PN\",2. If it says 1-2 left: stop, get certainty first." },
]

export const MIFI_BRAND_ROUTES: { brand: string; band: RescueBand; route: string }[] = [
  { brand: "Huawei legacy (E1550/E160/E1750 3G dongles, pre-2012)", band: "doable", route: "Codes are computable from the IMEI — OUR GENERATOR below (V1/V2, unit-verified against real published examples). Enter via WebUI unlock page or AT^CARDLOCK=\"code\"." },
  { brand: "Huawei 2012+ (E3131/E3276/E5330/E5372-class)", band: "conditional", route: "V201 generation — our candidate is a faithful port but UNVERIFIED (labelled in-app); bench-confirm on a donor first, or use a $3–8 IMEI code service which answers in minutes for these." },
  { brand: "Huawei E5573Cs-609 / -322 (the classic Telkom & Orange Kenya unit)", band: "conditional", route: "Famous documented route: boot-pin + modified firmware removes simlock entirely. Bench-only (opening the device, shorting a test point, flashing) with real brick risk — follow the model-exact guide, never a 'similar' one." },
  { brand: "ZTE MF910/MF920/MF927U (Telkom KE favourites)", band: "conditional", route: "16-digit NCK from IMEI via cheap verified code services (~$3–8). Counter is short (often 5 tries) — never guess. WebUI at 192.168.0.1 asks for the code when a foreign SIM goes in." },
  { brand: "Alcatel / TCL LINKZONE (MW40/MW41/MW45/MW70 — Orange & Airtel stock)", band: "conditional", route: "10–16 digit NCK via the 192.168.1.1 unlock page, code per exact model from a verified IMEI service. THREE wrong tries can hard-lock on several Alcatel models — measure twice, enter once." },
  { brand: "Generic / open-market MiFis", band: "doable", route: "Many were never locked — test a different-carrier SIM first before paying anyone anything." },
]

export const MIFI_AFTER_UNLOCK: RescueStep[] = [
  { text: "Insert the new SIM → the WebUI may ask for the unlock code once; enter the verified correct one." },
  { text: "Set the new carrier's APN in WebUI → Settings → Network → APN. Common Kenya values (verify if unsure): Safaricom = safaricom · Airtel = airtelgprs.com · Telkom = telkom · Faiba 4G = jtl." },
  { text: "No signal after unlock? Check the MiFi's LTE bands vs the carrier (Faiba is band-28-heavy — an old 3G-era dongle will never see it). Unlock removes the LOCK, not physics." },
]

// ==================== ☎️ BUTTON PHONE (FEATURE PHONE) ====================

export const BUTTONPHONE_NOTE =
  "Feature phones (Itel/Tecno/Nokia keypads) keep the phone lock in LOCAL firmware — no server, no gatekeeper, no counter on most. This is one of the most genuinely doable rescues in the whole app. The lock and the SIM PIN are different things — the SIM PIN card below saves people from needless flashing."

/** Per-brand coverage map — the road to maximum button-phone accuracy is
 *  knowing which silicon is inside before you open the toolbox. */
export const BUTTONPHONE_BRAND_GUIDE: { brand: string; chipset: string; defaults: string; route: string; band: RescueBand }[] = [
  { brand: "Itel (it2160/it5626/21-26 series)", chipset: "Unisoc SPD (SC6531E/SC7731) dominant", defaults: "1234 / 0000 / 1122", route: "spd_dump + matched FDL → format user-data; boxes one-click", band: "conditional" },
  { brand: "Tecno (T301/T35x/T4xx/T5xx series)", chipset: "Unisoc SPD / some MT6261", defaults: "1234 / 1122 / 0000", route: "SPD route; MT6261 stock → engineering menu or box", band: "conditional" },
  { brand: "Nokia HMD keypad (105/106/110/215/225)", chipset: "Unisoc (6531/8910) inside", defaults: "12345 (documented factory default)", route: "try 12345 first; else SPD service route", band: "doable" },
  { brand: "Nokia classic Series 40 (older 100/200/300)", chipset: "Broadcom/Infineon era", defaults: "12345", route: "legacy JAF/box era — bench; new SPD recipes don't apply", band: "conditional" },
  { brand: "Clone / China keypads (unbranded, 'SQ', 'X-Bo'…)", chipset: "MediaTek MT6260/6261 dominant", defaults: "1122 / 1234 / 0000 / 13579", route: "some accept *#9646633# engineering menu; else Miracle/MRT one-click", band: "conditional" },
  { brand: "QMobile / VGO Tel / African store brands", chipset: "MTK or Unisoc (model decides)", defaults: "1122 / 1234", route: "identify inside (boot logo trick or box autodetect) → matching route", band: "conditional" },
  { brand: "Safaricom Neon / carrier-branded keypads", chipset: "mostly KaiOS-Qualcomm or SPD", defaults: "1234 / 12345", route: "SPD units → SPD route; KaiOS units → own bench path (never Android recipes)", band: "conditional" },
  { brand: "KaiOS smart-keypads (Nokia 8110 4G, Energizer…)", chipset: "Qualcomm MSM8909-era", defaults: "none documented", route: "fastboot/adb bench path per exact model", band: "conditional" },
]

export const BUTTONPHONE_METHODS: RescueMethod[] = [
  {
    title: "Is it actually a SIM PIN, not a phone lock?",
    band: "doable",
    when: "If the prompt appears immediately at boot before the menu, mentions the SIM card, or the owner changed nothing — it's the SIM's PIN, and NO phone tool fixes it, because it lives on the SIM card.",
    steps: [
      { text: "SIM PIN is usually 0000 or 1234 unless changed — 3 wrong tries and the SIM asks for the PUK." },
      { text: "PUK is FREE: printed on the original SIM-card letter, or from the carrier (Safaricom care *100#, Airtel care line). 10 wrong PUK entries kill the SIM forever — then it's a SIM-swap at the carrier shop, still not a phone problem." },
      { text: "Only proceed below when it's the PHONE's own lock (shows after the SIM PIN, or with the SIM removed)." },
    ],
  },
  {
    title: "Default & master codes (try these first — free, zero risk)",
    band: "doable",
    when: "A huge share of Itel/Tecno/Nokia keypads still carry a factory lock code. Order = most common first.",
    steps: [
      { text: "Try: 1234 → 0000 → 1122 → 12345 (THE Nokia default) → 1111 → 00000000 → 13579." },
      { text: "Owner set a custom code and forgot? Codes don't help — service route below." },
    ],
  },
  {
    title: "Itel / Tecno / Nokia (HMD) keypad — service route (Unisoc/SPD inside)",
    band: "conditional",
    when: "Most Itel it-series / Tecno T-series / Nokia 105-110-215 (and their clones) are Unisoc SPD (SC6531E/SC7731-class). The lock flag lives in the user-data area — erase that region and the lock is gone.",
    steps: [
      { text: "Open-source route: spd_dump (the Spreadtrum research tool, github: ilyakurdyukov) with the model-matched FDL1/FDL2 loaders → read/format the user-data region → security code cleared." },
      { text: "Bench boxes (Miracle, CM2/Infinity, UnlockTool...) do the same in one click — this is daily bread on every Nairobi repair street; it takes minutes, so charge fairly." },
      { text: "Connection: usually USB with a boot key held, or test points on some boards — model-specific; check the exact model guide first." },
    ],
    warn: "Formatting user data ERASES phonebook & SMS stored on the PHONE (SIM contacts survive). Tell the customer before, not after.",
  },
  {
    title: "MTK MT6261-era feature phones (many clone keypads)",
    band: "conditional",
    when: "Older clone/China keypads with MediaTek inside.",
    steps: [
      { text: "Some stock opens an engineering menu with *#9646633# — if it opens, the lock can often be cleared from inside; if not, Miracle/MRT-class tools read these over USB in one click." },
    ],
  },
  {
    title: "KaiOS phones (Nokia 8110 4G, Energizer KaiOS...)",
    band: "conditional",
    when: "Neither classic feature-phone NOR Android — Qualcomm/KaiOS stack with fastboot/adb surfaces.",
    steps: [
      { text: "Bench route per exact model (fastboot-based userdata paths exist for several) — research the model first; do not apply Android recipes here blindly." },
    ],
  },
]

// ================= 💻 PC EXTRA CARE CARDS (round 2 accuracy) =================

export const PC_SAFETY_FIRST: RescueMethod = {
  title: "⚠️ BEFORE ANY OFFLINE EDIT — the 2-minute disaster check",
  band: "doable",
  when: "Do this FIRST whenever you can still get into ANY admin session on the laptop, or before building the rescue USB. It is what 'careful and accurate' means on this job.",
  steps: [
    { text: "Check if the drive is encrypted — admin terminal:", cmd: "manage-bde -status C:" },
    { text: "If it says 'Protection On' (BitLocker/Device Encryption): get the 48-digit recovery key BEFORE touching anything — it's in the owner's Microsoft account at account.microsoft.com/devices/recoverykey. Show the protectors:", cmd: "manage-bde -protectors -get C:" },
    { text: "If you skip this on an encrypted drive, the rescue-USB method turns a locked laptop into an UNREADABLE one. Two minutes here saves the whole machine." },
    { text: "Same steps for desktop computers — a 'computer' and a 'laptop' are identical for this job; only the boot-key brands differ (table below)." },
  ],
}

export const PC_CHNTPW_METHOD: RescueMethod = {
  title: "Linux rescue USB + chntpw (free, open-source route)",
  band: "conditional",
  when: "The free-software equivalent of NTPWEdit: boot any Ubuntu live USB on the locked PC. Local accounts on Win7–11; Ubuntu live boots fine with Secure Boot on.",
  steps: [
    { text: "Boot Ubuntu live USB → 'Try Ubuntu' → connect internet → open Terminal." },
    { text: "Install the offline registry editor:", cmd: "sudo apt-get install -y chntpw" },
    { text: "Go to the SAM hive on the Windows partition (folder name varies):", cmd: "cd /media/ubuntu/*/Windows/System32/config" },
    { text: "List the accounts:", cmd: "sudo chntpw -l SAM" },
    { text: "Open the editor for the locked user:", cmd: "sudo chntpw -u USERNAME SAM" },
    { text: "Menu: press 1 (BLANK password = remove it) → q (quit) → y (write hive). Reboot without the USB, sign in with an empty password, set a new one from inside Windows." },
  ],
  warn: "Blanking is the safer mode, but ANY outside edit loses that account's DPAPI secrets (saved browser passwords, EFS files) on modern Windows. BitLocker check first (card above).",
}

export const PC_DOMAIN_METHOD: RescueMethod = {
  title: "Company / school laptop (Domain or AzureAD joined)",
  band: "not-by-software",
  when: "Sign-in shows WORK\\user, an org email, or says the device is managed.",
  steps: [
    { text: "The account's truth lives on the organization's servers — identical physics to Android 15/16 FRP and carrier phone locks: nobody's software changes it from outside." },
    { text: "Route: the org's IT admin resets it (legal, instant, free). If the owner bought an ex-company laptop: the honest fix is a clean Windows reinstall with their own license — offline 'account adds' break compliance and often re-lock at first network contact." },
  ],
}

export const PC_RESET_METHOD: RescueMethod = {
  title: "\"Reset everything\" — the honest version (Windows' own Reset)",
  band: "conditional",
  when: "When the goal is to WIPE the PC's accounts and start fresh (you don't need the old password, just the machine). No cable from another computer can do this — Windows accepts no such commands over USB/HDMI; the 'cable method' for PCs IS the bootable USB, except this built-in route needs no USB at all.",
  steps: [
    { text: "On the lock screen: click the Power icon → hold Shift → click Restart → Troubleshoot → Reset this PC." },
    { text: "'Keep my files' removes the accounts/passwords but keeps user files (apps are lost). 'Remove everything' = factory-fresh." },
    { text: "If the drive is BitLocker-encrypted it will demand the recovery key first — same 2-minute check from the safety card." },
    { text: "After reset: Windows asks you to create a NEW account. Done — the old password is gone forever." },
  ],
  warn: "Saved browser passwords / EFS files of the old accounts die with this route. If the customer needs THOSE, use the chntpw/rescue-USB route instead.",
}

// ============ 🎥 MYTH vs PHYSICS: cables & bypass claims (keep visible) ============

export const MYTH_HDMI =
  "HDMI (and USB-C DisplayPort) carries PICTURE AND SOUND — nothing else. There is no command channel in it: an HDMI cable cannot remove a password, cannot bypass FRP, cannot unlock anything, on ANY device — modern or old. Any tool/video claiming an 'HDMI bypass' is a scam. What display-out REALLY does (and it's valuable): with a phone that has HDMI/DP-out (Samsung DeX, some flagships), you SEE the screen of a broken-touch phone — paired with a USB-OTG mouse you can CLICK it too. That's rescue through visibility, not bypass. Same cable law for PCs: computers take no password-reset commands through cables — the bootable USB you build IS the 'cable method'."

export const MYTH_100_RULE =
  "Where the 100% honesty lands, per device class: LEGACY Huawei modems → the math IS deterministic for that generation (as close to 100% as physics allows — codes verified against real published examples, the risk is only attempts-management, which the app gates). Button phones → defaults or one service-route format covers the great majority; the rest are named exceptions. Android 15/16 FRP & carrier-locked phones & Microsoft/Apple/account laptops → server-side: 0% by software for anyone. One number for everything would be a lie; per-class truth is the product."
