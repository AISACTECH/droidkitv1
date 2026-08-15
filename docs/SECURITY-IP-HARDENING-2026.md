# 🛡️ Paralock — Security & IP Protection Review (2026-08-15)

Scope: "protect the app / idea from competitors and hackers." This is a review of the *current*
state plus a prioritized action list. What was found is from reading the actual repo and config
(`package.json`, `vite.config.ts`, `tauri.conf.json`, `capabilities/`, `Cargo.toml`, `.gitignore`),
not guesswork.

---

## 1. What the audit found (current posture)

| Area | Finding | Status |
|---|---|---|
| Repo visibility | `AISACTECH/droidkitv1` is **public** | ⚠️ this is the #1 "idea theft" exposure |
| License | **MIT** (`LICENSE`) | ⚠️ grants everyone permission to copy/rebrand |
| Code signing | `certificateThumbprint: null` → unsigned Windows builds | ⚠️ no authenticity, SmartScreen warnings, easy to trojan |
| CSP (webview) | had `script-src 'unsafe-inline'` + `connect-src https://* ws://* wss://*` | ✅ **fixed this pass** (see §4) |
| Capabilities | `default.json` is minimal — good; but `opener:allow-open-url` lets the webview open *any* URL | ⚠️ minor |
| Rust release profile | `lto + strip + opt-level=s + panic=abort + codegen-units=1` | ✅ already good |
| Sourcemaps | off in production (`vite.config.ts`) | ✅ good |
| Secrets in repo | scanned — **none found** (no keys/tokens/passwords) | ✅ clean today |
| `.gitignore` | covers `.env*`, builds, logs, tauri artifacts | ✅ good |

**Bottom line:** the app's *engineering* hygiene is already decent. The real exposure is not a
missing checkbox — it's that the **entire source is public under MIT**.

---

## 2. The honest threat model (what "steal my idea" means for a Tauri app)

Be clear-eyed about what can and cannot be protected:

- **The frontend (React/TS) is always recoverable.** It ships as a JS bundle inside `dist/` and
  inside the installer. Minification only slows a competitor down; deobfuscation is cheap. You
  cannot prevent this for a desktop webview app.
- **The Rust backend is compiled + stripped** (`strip = true`, LTO) — meaningfully harder to
  reverse, but not impossible for a determined engineer.
- **What is genuinely hard to copy** — and where the real moat lives — is not code you can see in
  a bundle: proprietary firehose loaders / signed vendor binaries, a server-side service,
  a live model/catalogue update channel, your brand, your distribution, and your support. **Put
  the valuable logic where it can't be read**, not in the open-source repo.

So: you can *raise the cost* of cloning and *protect the business*, but you cannot make a desktop
app un-reverse-engineerable. Anyone promising "unstealable code" is selling a myth.

---

## 3. Prioritized action plan

### P0 — do now (cheap, high impact)

- [x] **Tighten the CSP** — done this pass (removed `'unsafe-inline'` from `script-src`,
      narrowed `connect-src` to `'self' ipc: http://ipc.localhost`; kept a loose `devCsp` so
      Vite HMR still works in dev). Verify once with `npm run tauri:dev`.
- [ ] **Change the licensing posture.** MIT = a free, legal pass to fork and rebrand. Pick one:
      - *Proprietary*: replace `LICENSE` with "© Isaac Real, all rights reserved" + a EULA in the
        installer, or
      - *Source-available* (e.g. BSL / ELv2 / PolyForm): source visible, commercial use
        restricted. Either is a hard stop to a competitor legally shipping "Paralock clone".
      - Add a `NOTICE` and a copyright header line to source files.
- [ ] **Make the repo private** (or split it): move the engine / patch planner / model DBs to a
      private repo, keep a public landing page. Your public docs currently *describe the entire
      algorithm* — competitors read that too. I can run this switch for you if you want
      (it may affect the GitHub Actions publish workflow — we'd re-test it together).
- [ ] **Code-sign builds.** Windows: get an OV/EV code-signing cert and set
      `bundle.windows.certificateThumbprint` + sign in CI. macOS: Developer ID + notarization.
      This stops the "trojaned Paralock.exe" problem and removes SmartScreen warnings.
- [ ] **Supply-chain scanning in CI.** `npm audit`, `cargo audit`, Dependabot/Renovate, and a
      secret scanner (gitleaks/trufflehog) so a leaked token can't land in history. The scan I ran
      is clean *now*; automate it so it stays clean.

### P1 — this sprint (real deterrents)

- [ ] **Activation/licensing in Rust.** Machine-fingerprint + signed license file (or server
      check). Not bulletproof (a cracker can patch it), but it deters casual copying and is
      standard for commercial desktop tools. Keep the check logic in Rust, not in the JS bundle.
- [ ] **Move the "secret sauce" out of the binary.** Load proprietary model data / loaders /
      method tables from an encrypted, signed update channel at runtime (`update:validate`
      scaffolding already exists) instead of embedding them. An attacker can't copy what isn't
      in the bundle.
- [ ] **Split code by privilege:** keep FRP/algo logic in Rust commands with minimal capability
      surface; the webview should never hold anything an attacker would want.

### P2 — hardening (do with a smoke test)

- [ ] `app.security.freezePrototype: true` (freezes `Object.prototype` in the webview; apply then
      smoke-test — React 19/Radix don't monkeypatch prototypes, but verify).
- [ ] Add response headers via Tauri 2 `security.headers` (`X-Frame-Options: DENY`,
      `X-Content-Type-Options: nosniff`) on top of the CSP `frame-ancestors 'none'` already set.
- [ ] Replace `opener:allow-open-url` with a Rust-side allowlist validator if the app only ever
      opens a known set of URLs (help links, repo, search). Otherwise keep it but log usage.
- [ ] Keep `object-src 'none'` + `base-uri 'self'` (already present — do not regress these).

### P3 — legal / IP (the part that actually stops competitors)

- [ ] EULA + Terms of Use: prohibit reverse engineering, commercial redistribution, and use on
      devices you don't own. This gives you a *legal* lever, not just a technical one.
- [ ] Trademark "Paralock" (name + logo). Copyright alone does not stop someone renaming your app.
- [ ] NDAs for collaborators; a private mirror for anything pre-release.
- [ ] DMCA takedown process ready (GitHub + storefronts) for when a clone appears.

---

## 4. What changed in this pass

`src-tauri/tauri.conf.json`:

- Production `csp`: `script-src 'self'` (was `'self' 'unsafe-inline'`) and
  `connect-src 'self' ipc: http://ipc.localhost` (was `'self' https://* ws://* wss://*`).
  Tauri injects its own nonce/hash for its internal bootstrap script at compile time, so
  `'unsafe-inline'` is not needed — this was a real XSS footgun.
- Added `devCsp` with the previous (loose) policy so `npm run tauri:dev` HMR is unaffected.

Both files validate as JSON. **Verification step before release:** run `npm run tauri:dev` once
and confirm the window loads and IPC works; then `npm run audit:prod` stays green (it only checks
CSP presence, not contents, so it will).

---

## 5. The one-line summary

You can't stop a determined engineer from reverse-engineering a Tauri app — but you can (a) stop
them from **legally** copying it (license + trademark + EULA), (b) make the technical copy
**expensive** (Rust-only logic, server-side secrets, code signing), and (c) stop the **brand**
theft that actually costs you users (trademark + private repo). Do P0 first; it's an afternoon's
work and it is where 80% of the value is.
