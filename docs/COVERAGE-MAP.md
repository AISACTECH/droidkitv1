# Master Coverage Map — "I have X… where do I go?" (2026-08-12)

Solves the #1 market pain: "my device category isn't covered." One symptom
per row → the exact lane or doc. Honest rows included: where NOBODY on
Earth has a software fix, we say who does (the official route).

| Symptom you see | Device | Where in DroidKit | Honest ceiling |
|---|---|---|---|
| Google account lock after reset, Android 11–14 | Samsung/Tecno/Infinix/Itel/others | **FRP Removal** + **FRP Lab 🧪** (escalation + verdict loop) | Strong on ≤13; patch-level decides 14 |
| Google lock, Android 15/16 | Any | **FRP Lab → Reality Check / Patch Oracle 🔮** for the truthful band + below-OS runbooks | Server-side: **0% software for everyone** → `docs/OFFICIAL-ROUTES.md` |
| MiFi won't take another carrier's SIM | Huawei/ZTE/Alcatel pocket WiFi, USB dongles | **Rescue Lab 🛠️ → Modem & MiFi 📡** (auto-session + verified code generator) | Legacy Huawei: deterministic; newer: cheap official IMEI code service |
| MiFi from a DEAD carrier (Orange, Telkom-era) | Same | Same lane — lock is local, carrier death doesn't matter | Same as above |
| Button/keypad phone asks for a phone password | Itel/Tecno/Nokia/clones | **Rescue Lab → Button Phone ☎️** (defaults → brand map → spd service route) | Near-total coverage; phone-stored contacts warning before format |
| Says "SIM PIN/PUK", not phone password | Any SIM | Button Phone lane card #1 | PUK is FREE from the carrier — never flash for this |
| Phone pattern lock, Android ≤ 8, data must survive | Old Android | **Rescue Lab → Screen Lock 🔓** verified cracker (offline, keeps data) | Deterministic within the 389,112 keyspace |
| Phone PIN/pattern lock, Android 9+ | Modern Android | Screen Lock lane honest routes | With data preserved: **nobody can** (gatekeeper+encryption); Samsung owners: official Remote Unlock |
| Laptop/PC password lost | Windows local account | **Rescue Lab → PC Password 💻** (safety check → admin/net-user → questions → rescue USB) | Deterministic on unencrypted drives; BitLocker needs the 48-digit key |
| Laptop asks Microsoft/org account | Windows | PC lane cards + `docs/OFFICIAL-ROUTES.md` | Server-side: only the official reset / org admin |
| Black/dead screen, data needed | Any Android | **Rescue Lab → Black Screen 🖥️** triage → existing **Screen** mirror + **Files** views | If ADB was authorized: likely saveable; else OTG/HDMI-DeX visibility tricks, then parts |
| Modem dead after bad flash, behaves bricked | Huawei/ZTE dongle | Modem lane firmware cards (replace-don't-uninstall; Balong bench path) | Bench-only deep unbrick; brick risk is declared |
| "FRP/unlock everything" for a FINANCED phone (Watu/M-Kopa/Lipa Mdogo Mdogo) | Any | **Refused by design** (law + ethics) — route to the lender | Lender locks are not our product, permanently |
| IMEI "repair" | Any | **Refused by design** (illegal in Kenya) | Documentation only |

If a row says a lane you don't see in your sidebar, update the app — the lane
list as of this date: Devices · System Info · FRP Removal · FRP Lab 🧪 ·
Rescue Lab 🛠️ · Files · Logcat · Apps · Screen · Performance · Shell.
