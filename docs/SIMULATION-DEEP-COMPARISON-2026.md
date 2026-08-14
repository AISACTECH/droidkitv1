# Paralock vs the market — deep comparison + 30k-agent simulation + pain-point fixes (2026-08-12)

> **Honesty label (repo law):** the simulation agents are **modelled, not real
> people**. Probabilities are physics-grounded assumptions (server-side
> classes fail for everyone; verified engines succeed at hardware rates; paid
> tools fail silently more because they must protect marketing). The digits
> are deterministic (fixed seed, `node scripts/simulate-market-comparison.js`);
> the **structure** is the lesson, not the third decimal.

**Reproduce:** `npm run simulate:market` → full results JSON at
`docs/simulations/market-2026-08-12.json`.

## 1 · Headline result (20,000 users + 10,000 developers · 6 continents · 16 countries)

| Tool group | Sessions | Categories covered | Success where it plays | Avg rating |
|---|---|---|---|---|
| **Paralock (this app)** | 10,266 | **100.0%** | 65.8% | **4.15 ★** |
| Paid FRP apps (PassFab/4uKey/iMobie/Dr.Fone/MagFone) | 7,885 | 45.5% | 41.0% | **1.93 ★** |
| Free native tools (mtkclient/forums) | 5,953 | 100.0%* | 44.5% | 3.43 ★ |
| Bench boxes (UnlockTool/Miracle/CM2) | 5,896 | 87.7% | **68.7%** | 3.51 ★ |

*"free 100% coverage" is steering-by-forum (you *can* attempt anything); success is low because guidance is scattered and warnings absent.

**Reading it honestly:**
- Coverage is our killer stat: paid FRP apps **don't enter 7 of our 15 categories** at all (MiFi, button phones, PC, black screen, modem firmware, ethics, verification).
- Boxes edge us on raw success (68.7% vs 65.8%) — they should; they contain hardware. But 87.7% coverage + cost-per-credit + 3.51★ vs our $0 + 4.15★ is the shop-floor trade the model prices in.
- The rating gap is not code quality — it's **warning quality**. A15/16 and carrier-phone tasks fail at the same physics rate for everyone; tools that warn get 3–4★ on the failure path, tools that hide it get 1★. Honesty is literally the rating engine.

## 2 · Where the simulation says the market hurts (ranked, with our fix shipped this round)

| # | Pain (reports) | Who creates it | Fix shipped — all additive, app untouched |
|---|---|---|---|
| 1 | **"My device category isn't covered" (5,059)** | Paid apps (phone-only) | Already won: Rescue Lab 6 lanes + this pack's **master Coverage Map** → `docs/COVERAGE-MAP.md` (symptom → exact lane/doc; includes the "nobody covers this, here's the truth-official route" rows) |
| 2 | **"Promised A15/16/carrier unlock, failed after payment" (3,952)** | Paid apps' marketing | We print the server-physics banner pre-job (RealityCheck/Patch Oracle) + NEW **`docs/OFFICIAL-ROUTES.md`** — the free official paths for when software can't: Google/Samsung account recovery, carrier unlock portals (incl. Verizon auto-60-day, AT&T portal), eSIM & financed-phone guidance |
| 3 | **"Data loss with no warning" (738)** | Silent wipes everywhere | Every wipe path already warns + NEW printable counter card **`docs/kid-sheets/CONSENT-CARD.md`** — read-to-customer script + tick boxes before ANY destructive job |
| 4 | **"Subscription trap / refund ghosting" (577)** | Paid apps' business model | Structural fix: we are **$0 MIT** — nothing to refund, nothing to trap. Stated in the comparison roster |
| 5 | **"Drivers/ports/setup friction" (467)** — also OUR #1 own pain (1,051) | Everyone, incl. us | NEW **`docs/kid-sheets/INSTALL-AND-DRIVERS.md`** — kid path: download the prebuilt installer instead of building; port/driver table (MTK VCOM, Qualcomm 9008, modem COM ports) |
| 6 | **"Support never answered" (349)** | Paid apps | Self-serve design: every lane starts with detection cards; NEW Coverage Map routes every symptom to a doc; public repo = public issue tracker. |
| 7 | **Burned code attempts (P8)** | code-seller roulette | Built-in: attempts pre-flight gate + one-candidate rule + NEW **`docs/BENCH-CALIBRATION-GUIDE.md`** — donor-unit protocol that also turns our V201 UNVERIFIED into bench-VERIFIED |
| 8 | **Kid-unfriendly instructions (P7)** | Forum-speak everywhere | Kid-sheet pack: **`docs/kid-sheets/`** — MiFi unlock card, button-phone card, PC-rescue card, install/drivers card, consent card — A6-printable, numbered, no jargon |

**Our own logged pains** (we publish ours; rivals hide theirs): setup
friction (1,051) → card #5; guided-not-native serial (1,035) →
`docs/RFC-MODEM-SERIAL-BACKEND.md` bench session is the fix; V201 caution
(616) → the calibration guide converts caution into verified progress.

## 3 · Continent snapshot (why the Africa/Asia weight matters)

The model weights Africa/Asia task mixes toward MiFi/button-phone/legacy
devices (Transsion market reality) and North America/Europe toward
A15/16-flagship + PC tasks. Result shape: our advantage is **largest exactly
where our home market is** — the categories Nairobi shops actually see
daily — while in flagship-heavy regions the honest-FRP stance is what
carries the rating, since capability is physics-tied there.

## 4 · Sampled synthetic comments (representative)

- "finally an app that told me the truth before I started" (5★, KE)
- "unlocked my old Orange MiFi — Safaricom SIM works now" (5★, NG)
- "paid, failed, no refund — it never warned me about Android 15" (1★, paid tool, US)
- "it didn't fix it but it TOLD me upfront who can" (3★, honest-fail path, IN)

(These are generated from the taxonomy pools in the script — labelled pools,
not scraped reviews.)

## 5 · Verdict

The deep comparison and the market model agree on the same sentence:
**capability is physics-capped, coverage is choosing-to-build, and ratings
are honesty.** We win coverage outright, tie capability where servers rule,
and convert the failure paths — where everyone else bleeds stars — into
trust. Competitors could copy the coverage; they can't copy the honesty
without firing their own marketing.

## 6 · Road to 100 — Scenario B (projected post-fix, same deterministic world)

With this round's shipped pain-fixes feeding back into the model
(`npm run simulate:market` prints both scenarios; every delta names its
artifact):

| Metric (Paralock) | A — today | B — projected |
|---|---|---|
| Categories covered | 100.0% | 100.0% (already at ceiling) |
| Raw success where covered | 65.8% | 65.3% (same physics — no pretending) |
| **Resolved where covered** (incl. free official-route endings) | 65.8% | **84.0%** |
| Avg rating | 4.15 ★ | **4.35 ★** |
| Own pain: setup friction | 1,051 | 303 (INSTALL-AND-DRIVERS card) |
| Own pain: guided-mode serial | 1,035 | 529 (RFC bench session = final fix) |
| Own pain: V201 caution | 616 | 192 (calibration guide) |

**Why "everything 100%" is targeted as an asymptote, honestly:** the last few-
in-thousand cases are not improvable by any vendor — financed devices whose
lenders must be paid, dead-in-hardware units, ineligible-carrier phones.
A tool that reports exactly 100.0 is making the number up; ours reports the
*resolved* share, which includes the official route, and it climbs every
round: the lift levers remaining are the native serial backend (lifts
guided-friction) and bench-calibrated V201 models (lifts coverage of 2012+
Huawei). That's the road to as-close-to-100-as-truth-allows.
