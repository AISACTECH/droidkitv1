# Paralock Capability Roadmap — Open-Closed Edition (2026-08-12)

**Architectural law for every item below:** existing core files, views, engines
and gates are CLOSED for modification. New capability arrives as NEW modules
registered at the seams that already exist. Nothing below edits a core
function's behaviour; anything that would is automatically out of scope.

**The extension seams the app already exposes (the "open for extension" points):**

1. **Nav seam** — one row in `navigationItems` (`AppSidebar.tsx`) + one `case` in
   `MainContent.tsx`. Every future view goes through here; no existing case changes.
2. **Lane seam** — Rescue Lab's lanes are independent components behind a picker;
   a new lane = one new file in `views/RescueLab/` + one registry entry.
3. **Content seam** — `help-content.ts` is the single source rendered by Help view
   AND the PDF generator. New FAQs/policies append; nothing rewrites.
4. **Engine seam** — pure libraries in `src/lib` with executable test gates in
   `scripts/verify-*.mts`. New engines = new file + new gate script.
5. **Native seam** — Tauri commands: new Rust command = new module + one
   `invoke_handler` line; existing commands untouched (see RFC pattern).
6. **Gate seam** — every feature ships with its own `verify-*.mts`; `test:lab`/
   `test:core` stay green by construction (they only read, never gate-keep writing).

---

## Phase 1 — Native backends graduate (highest user value)

| Step | Deliverable | Seam | Definition of done |
|------|------------|------|-------------------|
| 1.1 | **Serial backend** per `docs/RFC-MODEM-SERIAL-BACKEND.md`: `serialport` 4.x, read-only AT allowlist, one-entry-per-open, no IMEI writes, TX/RX journal | Native | `cargo check --locked` green in CI; `test:lab` probe trio still green (probe flips to "native" automatically — zero frontend edits by design) |
| 1.2 | Auto-Session native mode ship | none — self-activating | bench log entry from a real dongle |
| 1.3 | **MTK Brom native probe** (read-only chip-ID handshake), following the physics roadmap note in `PHYSICS-LAYER-RESEARCH.md` | Native + Engine | detected SLA/DAA state displayed in Patch Oracle panel; no flashing capability in phase 1 |

## Phase 2 — Lab accuracy pipeline

| Step | Deliverable | Seam |
|------|------------|------|
| 2.1 | Donor-bench calibration of V201 Huawei NCK per `BENCH-CALIBRATION-GUIDE.md` | Content (label graduates from UNVERIFIED only with log evidence) |
| 2.2 | Bench-log importer: Patch Oracle ingests exported session JSONs into its calibration meter | Engine (new module `bench-ingest.ts`) |
| 2.3 | Coverage-map expansion rows as bench evidence lands | Content |

## Phase 3 — Rescue-USB builder lane (PC lane completion)

- New lane file `RescueUsbLane.tsx` — the last honest gap in the PC story:
  step-by-step Ventoy/Hiren's + NTPWEdit/chntpw media creation, with the
  BitLocker pre-check first (already demanded by `PC_SAFETY_FIRST`).
- **Closure note:** requires NO native code (it is instruction + checksum
  verification guidance), so it can ship purely at the Lane seam.

## Phase 4 — Reach & inclusion

| Step | Deliverable | Seam |
|------|------------|------|
| 4.1 | i18n scaffold: extract help-content strings behind a `t()` module; first locales: English, Kiswahili | Content seam (new module; existing English stays the default export) |
| 4.2 | Accessibility pass: aria-labels on lane pickers, focus order in Help, keyboard-only walkthrough of setup | Additive props only |
| 4.3 | Offline docs bundle: kid-sheets pre-rendered into the PDF guide's appendix | PDF generator seam |

## Phase 5 — Performance guardrails (protect, don't chase)

- Views-budget rule (already in `PERFORMANCE.md`): if a new view crosses
  85 kB gz, split THAT view into its own chunk — never raise the number silently.
- Rust release profile (LTO/strip/opt-s) is final; no changes planned.
- Any new engine must ship its `verify-*` gate in the same commit (Gate seam).

## Explicitly NOT on the roadmap (permanent, by policy)

- Lender-MDM defeat, IMEI rewriting, third-party account stripping (policies 2–3).
- Any auto-fired unlock entry (interlock I5 is physics-policy).
- Any feature that would require editing the honesty law's banned-claim set.

**Validation protocol for every phase:** `lint → build → test:core → test:lab →
test:nck → test:rescue → test-all → audit:prod → perf:report`, and the CHANGELOG
records what was promised vs what shipped — calibration applies to plans too.
