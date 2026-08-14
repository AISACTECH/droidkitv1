# ⬇️ Install + drivers — the friction-killer card

Pain fixed: "setup ate the session" (also OUR #1 own pain, logged honestly).

## Easiest install (no building at all)
1. Open the repo on GitHub → **Releases** (or Actions → latest green run →
   Artifacts) → download the **Windows .exe installer**.
2. Double-click it → Next → Next → done. (Build-from-source instructions
   exist in `docs/WINDOWS-SETUP.md`, but you only need those if you're
   changing the app, not using it.)

## When Windows can't see the device (drivers, by cable behavior)

| Symptom | What it is | Fix |
|---|---|---|
| Phone charges, nothing in Devices view | Missing ADB driver | Install "Google USB driver" via any search; or Windows Update auto-grabs on newer builds |
| Tecno/Infinix/Itel in Brom shows nothing | MTK VCOM (preloader) driver missing | Search "MediaTek VCOM driver Windows 11", install, replug with Vol-Up/Down held |
| Qualcomm phone shows "QHSUSB_BULK" | 9008 mode, no driver | "Qualcomm HS-USB QDLoader 9008 driver" — then it becomes a COM port |
| Modem/MiFi has no COM port in Device Manager | Its CD-ROM mode needs mode-switch | Eject the fake CD drive that appears, or install the modem's Mobile Partner/WebUI package once |
| COM port appears then vanishes | Cable or hub | Direct rear motherboard port, known-good cable, no hub |

## Golden sequence when in doubt
New cable → rear USB port → driver per table → reboot PC once → reopen app.
That order fixes ~9 in 10 "the app can't see it" cases.
