# 📶 MiFi / pocket-WiFi unlock — the counter card

1. **Model?** Sticker inside the cover (e.g. E5573Cs-609, MF927U, MW40V).
   The carrier logo is dead weight — the MODEL picks the route.
2. **IMEI?** Same sticker, 15 digits. App checks its checksum for you
   (typo = a burned attempt).
3. **ATTEMPTS FIRST.** Terminal → `AT^CARDLOCK?` (Huawei). See the number.
   0–2 left = STOP, don't guess.
4. **Open the app → Rescue Lab 🛠️ → Modem & MiFi 📡 → Auto-Session.**
   Follow the green lights; it reveals ONE code for your model's era.
5. **Enter it once.** Rejected? STOP. (Three rejections hard-lock some
   Alcatels forever.)
6. **New SIM in.** If there's no internet: WebUI → set APN —
   Safaricom `safaricom` · Airtel `airtelgprs.com` · Telkom `telkom` ·
   Faiba `jtl`.
7. Dead carrier (Orange, Telkom)? Doesn't matter — the lock lives in the
   device, not at the company. You own it, you free it, it's legal.
8. Still nothing? Faiba needs a band-28 MiFi — old 3G dongles can't see it
   (physics, not the unlock).
