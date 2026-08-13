# Bench Calibration Guide — turning UNVERIFIED into VERIFIED

Solves pain #7 (burned code attempts) and our own #3 (V201 caution). The
app ships honest labels; this protocol is how the labels level up — with
real bench evidence instead of marketing confidence.

## The donor protocol (20 minutes, zero customer risk)

1. **Donor unit:** the same model you expect to see in the shop (cheap
   dead-carrier stock is ideal — it's plentiful and it's YOURS to risk).
2. **Read the ground truth first:** `AT^CARDLOCK?` → note lock state AND
   attempts left. Write it in the log before touching anything.
3. **Compute candidates** in Rescue Lab → Modem & MiFi → generator
   (or Auto-Session). Note which era the model table assigns (V1/V2 →
   vector-verified engines; V201 → the candidate under test).
4. **Fire exactly ONE** V201 candidate at the DONOR, by hand.
5. **Log the outcome in the Patch Oracle bench log** (FRP Lab 🧪 → Patch
   Oracle 🔮 → bench log → Export JSON), in this sentence shape:
   `MODEL — era=v201 — code 12345678 — attempts-before 10 — RESULT accepted/rejected — date`.
6. **Rules of evidence:** one model × accepted V201 → mark that MODEL as
   bench-verified in your shop notes; THREE independent accepted units of
   the same model → propose flipping the app label via a PR (evidence =
   your exported bench-log JSONs).

## What the label flips look like

| Evidence | Label |
|---|---|
| None (today) | `UNVERIFIED — bench first` |
| 1 donor accepted | shop note only — not enough |
| 3 accepted, same model, logged JSON | candidate for `bench-verified on <model>` in a future release |

## Hard rules (same law as the app)

- Never "confirm" on a customer device. Donors only.
- A single rejection = stop. Log it as a rejection — a logged rejection is
  valuable data, not a failure.
- Attempts ≤ 2 on any unit → that unit gets the refunded-service route,
  not experiments.
- Your exported bench logs are your shop's private calibration dataset.
  They are also the raw material that beats every tool with no dataset.
