# Workflows Setup — Manual Step Required

Due to GitHub App permissions, `.github/workflows/*.yml` files cannot be pushed via the arena agent.

**Manual steps after merging to main:**

1. Copy files from `docs/workflows-manual/` to `.github/workflows/`:
   ```bash
   cp docs/workflows-manual/ci.yml .github/workflows/ci.yml
   cp docs/workflows-manual/publish.yml .github/workflows/publish.yml
   git add .github/workflows/
   git commit -m "Add CI + Publish workflows (production)"
   git push origin main
   ```

2. Or via GitHub UI:
   - Go to https://github.com/AISACTECH/droidkitv1/tree/main/.github/workflows
   - Create/update `ci.yml` with contents from `docs/workflows-manual/ci.yml`
   - Update `publish.yml` with contents from `docs/workflows-manual/publish.yml`

## What ci.yml does
- Node 20 + npm ci + tsc noEmit + build
- Checks real components presence (22 core files)
- Runs production-audit.js
- Quick simulation 1k+1k
- Bundle size check
- Security: CSP not null, version aligned

## What publish.yml does (updated)
- Previously bun-based, now npm ci
- Added TS check + audit step
- Enriched release notes with production highlights

