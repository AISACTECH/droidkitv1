# ☎️ Button-phone password — the counter card

1. **Says "SIM PIN"?** That's the SIM card, not the phone. Try 0000/1234
   once. Three wrong = PUK needed = FREE from the carrier (it's on the
   SIM's original card / Safaricom *100#). NEVER flash a phone for a SIM PIN.
2. **Phone lock? Try the defaults:** 1234 → 0000 → 1122 → **12345** (Nokia)
   → 1111 → 00000000. Most keypad phones open here. Costs nothing.
3. **Still locked?** Open **Rescue Lab 🛠️ → Button Phone ☎️** → brand map:
   Itel/Tecno/Nokia = mostly Unisoc inside → service route (spd_dump with
   the model's loaders, or a bench box — one click either way).
4. **WARN THE CUSTOMER FIRST:** the service format erases phonebook/SMS
   stored ON THE PHONE (SIM contacts survive). Use the Say-It-First card.
5. **KaiOS phone** (Nokia 8110-style slider/flip)? Different animal —
   model-exact bench route only; no Android tricks.
