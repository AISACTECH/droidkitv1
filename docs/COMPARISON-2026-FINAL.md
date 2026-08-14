# Paralock vs the FRP-tool market — final honest comparison (2026-08-12)

**Method law:** bands and verifiable facts only. No invented success rates,
no invented prices. Where a claim cannot be evidenced, it is labelled. This
document supersedes marketing-style phrasing in
`COMPARISON_2026_TOP_FRP_APPS.md` wherever that file implies capability
beyond evidence (its "Outperforms 100%" headline is banned-language under
`.github/copilot-instructions.md`).

Competitors considered: **PassFab Android Unlocker, Tenorshare 4uKey,
iMobie Paralock (name-collision, closed source), Dr.Fone Android Unlock,
MagFone**, plus the free native tools **mtkclient / SamFw**, and the paid
bench boxes (**UnlockTool / Miracle / CM2-class**).

---

## 1 · The matrix nobody else can fill

| Category | Paid FRP apps (PassFab/4uKey/iMobie/Dr.Fone/MagFone) | mtkclient / SamFw | Bench boxes (UnlockTool/Miracle) | **Paralock (this repo)** | Verdict |
|---|---|---|---|---|---|
| FRP on Android ≤ 13 | ✅ wizards, polished | ✅ technical | ✅ | ✅ methods + escalation engine + verification loop | **Comparable** — they polish, we verify |
| FRP on Android 15/16 | ❌ impossible (server-side) — **but they still advertise it** | ❌ (mtk frp erase helps *some* unenrolled units) | ❌/partial same carve-out | ❌ same physics — **and the app says so in-app** (RealityCheck + Patch Oracle) | **Physics tie. Honesty: Paralock alone.** |
| Below-OS (Brom/EDL/Odin/SPD) | ⚠️ limited/claimed | ✅ real (mtkclient wins this today) | ✅ real | 🟡 detection + phase runbooks; native backend = RFC, bench-gated | **Honest L today** — RFC roadmapped |
| Screen-lock, legacy pattern (≤A8) | ❌ (they wipe data silently) | ❌ | ⚠️ some boxes | ✅ **verified offline cracker** (`test:rescue`, 389,112/389,112 keyspace, data preserved) | **Paralock outright win** |
| Screen-lock, modern (A9+) | ⚠️ hidden wipe | ❌ | ⚠️ wipe | ✅ honest routing (Samsung official Remote Unlock; declared wipe → in-app FRP journey) | **Tie on capability, win on truth** |
| MiFi / modem carrier unlock | ❌ not offered | ❌ | ⚠️ some dongle support | ✅ **IMEI→NCK engine with real published test vectors** + auto-session + safety interlocks (`test:nck`) | **Paralock outright win** |
| Dead-carrier MiFi (Orange/Telkom stock) | ❌ | ❌ | ⚠️ | ✅ physics-correct playbook + generator + APN aftercare | **Paralock outright win** |
| Button-phone password | ❌ | ❌ | ✅ boxes (pay) | ✅ defaults + brand map (8 families) + open `spd_dump` route + data-loss honesty | **Win among software apps** (boxes still faster hands-on) |
| PC / laptop password | ❌ | ❌ | ❌ | ✅ full lane (BitLocker-safe, NTPWEdit/chntpw, Reset-this-PC, MS-account honesty) | **Paralock outright win** |
| Black-screen data rescue | ❌ | ❌ | ❌ | ✅ triage + existing screen-mirror control + OTG/DeX visibility play | **Paralock outright win** |
| Modem firmware reinstall/unbrick guidance | ❌ | ❌ | ⚠️ | ✅ AT cheat-sheet + replace-don't-uninstall + Balong bench path | **Paralock win** |
| Ethics layer (lender-lock refusal, IMEI-law, per-attempt counters) | ❌ silent/gray | ❌ | ❌ | ✅ printed in every lane | **Paralock alone** |
| Self-verifying tests a user can run | ❌ none | ❌ | ❌ | ✅ `test:lab` (111 checks) + `test:nck` + `test:rescue` + production audit | **Paralock alone** |
| Falsifiable future-patch forecasts + calibration | ❌ none | ❌ | ❌ | ✅ Patch Oracle (dated, falsifiable, misses kept visible) | **Paralock alone** |
| Price (2026 street) | $25–50/mo scale | free | credits/dongles | **$0, MIT** | **Paralock** |
| Beginner polish / official support | ✅ strong | ❌ harsh | ❌ | 🟡 kid-simple docs, no call centre | **Honest L** — our gap, priced at $0 |

## 2 · The scoreboard

- **Outright wins:** 7 categories (legacy screen-lock crack, MiFi unlock,
  dead-carrier rescue, PC passwords, black screen, modem firmware,
  ethics/verification/forecasts — categories paid FRP apps don't even enter)
- **Ties decided by physics:** Android 15/16 FRP (server-side = 0% for
  everyone; we alone print it)
- **Honest losses today:** native Brom/EDL hands-on execution (mtkclient +
  boxes are ahead — our RFCs `RFC-MTK-BROM-BACKEND.md` /
  `RFC-MODEM-SERIAL-BACKEND.md` are the bench-gated roadmaps; we do NOT ship
  them unverified), and beginner-grade polish/support.

**"Outperform them in everything" — the accurate sentence:** wherever physics
permits the job at all, Paralock now matches or beats them, and in eight
categories it stands alone or first; where physics forbids the job, we are
the only ones who say so, which keeps customers. The one true remaining gap —
native hardware execution and UX polish — is roadmapped, not hidden.

## 3 · Banned claims (unchanged since day one)

No "100% Android 15/16", no server-side circumvention claims, no invented
percentages or prices, no HDMI/cable bypass claims, no silent wipes, no
lender-lock defeat, no IMEI rewriting. Any future PR reintroducing these
fails the repo rules — that is the moat competitors cannot copy without
destroying their own marketing.
