# 🔧 Publish Build Fix 2026 — why the app "can't build" in CI (and the fix)

**Date:** 2026-08-17 · **Affected:** `.github/workflows/publish.yml` (all 4 matrix jobs)
**Status:** root cause fixed & pushed on `arena/01a00f04-droidkitv1` (commit `a70df41`);
workflow-file change below must be applied by a maintainer (GitHub App token lacks
`workflows` permission to push `.github/workflows/*`).

---

## 1 · Symptom

Every `publish` run (all 3 runs so far: `31490928957`, `31492804654`, `32013630728`)
fails identically:

- **All 4 platform jobs** (linux, windows, macos ARM, macos Intel) fail at the
  `tauri-apps/tauri-action@v0` step **within 1–2 seconds** — too fast for any
  TypeScript, Vite or Rust compile.
- Annotation: `Command "npm ["run","tauri","build","--","--target",...]" failed with exit code 1`
- The Node.js 20 deprecation warning about `actions/setup-node@v4` is unrelated noise.

## 2 · Root cause — Tauri npm ↔ Rust crate version mismatch (hard gate)

Tauri's CLI runs `check_mismatched_packages` early in every `tauri build`
(`crates/tauri-cli/src/info/plugins.rs`, called from `setup()` in `src/build.rs`).
It compares the **major.minor** of the installed `@tauri-apps/*` npm packages against
the `tauri` / `tauri-plugin-*` crate versions resolved in `src-tauri/Cargo.lock`.
**Any difference in major OR minor is a hard error** (only `--ignore-version-mismatches`
bypasses it):

```
Found version mismatched Tauri packages. Make sure the NPM package and Rust crate
versions are on the same major/minor releases:
tauri (v2.10.2) : @tauri-apps/api (v2.11.1)
```

This repo had a floating-range drift:

| Package | package.json range | npm ci installed | Cargo.lock crate | Verdict |
|---|---|---|---|---|
| `@tauri-apps/api` | `^2.1.1` | **2.11.1** | `tauri` **2.10.2** | ❌ 2.11 vs 2.10 |
| `@tauri-apps/cli` | `^2.1.0` | **2.11.4** | `tauri` 2.10.2 | ❌ (same gate) |
| `@tauri-apps/plugin-opener` | `^2.2.1` | 2.5.4 | `tauri-plugin-opener` 2.5.3 | ✅ 2.5 = 2.5 |
| `@tauri-apps/plugin-store` | `^2.4.2` | 2.4.4 | `tauri-plugin-store` 2.4.2 | ✅ 2.4 = 2.4 |

Why it was missed: the previous failure (TS2345 across the 4 runners) was blamed on
`bun.lock` dependency resolution and fixed by removing bun (`oven-sh/setup-bun@v2` →
`npm ci`). That was a real but **separate** issue — after the bun removal the run still
failed on the version gate, which is platform-independent and package-manager-independent.

## 3 · The fix (pushed in `a70df41`)

**`package.json`** — pin the npm Tauri packages to the exact major.minor of their
`Cargo.lock` counterparts (npm has no `2.10.2`, so `2.10.1` is used for api/cli;
plugins match crate versions exactly):

```json
"@tauri-apps/api": "2.10.1",
"@tauri-apps/plugin-opener": "2.5.3",
"@tauri-apps/plugin-store": "2.4.2",
"@tauri-apps/cli": "2.10.1"
```

`package-lock.json` regenerated (`npm install --package-lock-only` + `npm ci`) —
only the 4 packages + CLI platform binaries changed.

**`scripts/doctor.mts`** — new hard-failing **Tauri version sync** check (exit 1 with a
clear message if npm and crate major.minor drift apart), so this can never silently kill
the publish matrix again:

```
✅ Tauri version sync — npm packages and Rust crates share major.minor — tauri build's mismatch gate will pass
❌ Tauri version sync — @tauri-apps/api 2.11.1 (package.json) vs tauri crate 2.10.2 (Cargo.lock) — tauri build hard-fails...
```

Verified locally: `npm ci` clean · `npm run doctor` green · `npm run build` passes ·
doctor red (exit 1) when drift is reintroduced.

## 4 · Workflow change — apply by a maintainer (needs `workflows` permission)

Edit `.github/workflows/publish.yml`:

1. `actions/setup-node@v4` → `actions/setup-node@v5` (clears the Node 20 deprecation warning).
2. After `install frontend dependencies`, add a pre-flight guard so CI fails with a
   readable message instead of the opaque command error:

```yaml
      - name: pre-flight doctor (publish blockers)
        run: npm run doctor
```

Full diff (also saved as `/tmp/publish-workflow-fix.patch` during diagnosis):

```diff
-      - uses: actions/setup-node@v4
+      - uses: actions/setup-node@v5
         with:
           node-version: 22
           cache: 'npm'
           cache-dependency-path: package-lock.json

       - name: install frontend dependencies
         run: npm ci

+      # Pre-flight guard: doctor hard-fails on the exact blockers that killed
+      # every publish run to date — npm @tauri-apps/* ↔ Rust crate version
+      # drift (tauri build's mismatch gate exits 1 in ~1s), bun.lock present,
+      # broken icon.icns, invalid tauri.conf.json schema.
+      - name: pre-flight doctor (publish blockers)
+        run: npm run doctor
+
       - uses: tauri-apps/tauri-action@v0
```

## 5 · Next steps

1. Merge `arena/01a00f04-droidkitv1` into `main` (contains the version pins + doctor guard).
2. Apply the `.github/workflows/publish.yml` diff above (or cherry-pick it locally).
3. Re-run **publish** on `main` → all 4 jobs should now build past the mismatch gate
   (expect real compile/bundle times: minutes, not 2 seconds).

## 6 · Evidence trail

- `tauri info` before fix: `@tauri-apps/api ⱼₛ: 2.11.1`, `@tauri-apps/cli ⱼₛ: 2.11.4`
- `src-tauri/Cargo.lock`: `tauri 2.10.2`, `tauri-build 2.5.5`, `tauri-plugin-opener 2.5.3`, `tauri-plugin-store 2.4.2`
- tauri-cli v2.11.4 source: `crates/tauri-cli/src/info/plugins.rs` (`mismatched()` compares major+minor; `check_mismatched_packages` returns `Err(GenericError(...))`), called from `setup()` in `crates/tauri-cli/src/build.rs` → hard failure in ~1s, before any compile.
- All 3 publish runs fail at the same step on all platforms (platform-independent ⇒ config/code-level, not toolchain).
