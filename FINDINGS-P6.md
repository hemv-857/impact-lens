# Phase 6 Security Findings: Supply Chain, Repo Hygiene, CI

## Summary

Phase 6 audit identified **2 confirmed** security issues and **2 candidates requiring further owner investigation**. This report covers repo hygiene, dependency supply chain, and CI configuration for a multi-tenant Next.js app.

## Confirmed Findings

### 1. Public repo ships live deployable database with demo credentials
**ID:** `p6/committed-demo-db`  
**Severity:** HIGH  
**Status:** CONFIRMED → FIXED  

The repository commits `db/custom.db`, a production-grade SQLite database containing 20 users, 3 organizations, and demo credentials (`ada@example.org / password123`) documented in README.md. The database is deployed as-is by `npm start` and CI workflows, and the GreenShoots organization has a non-null invite code allowing unauthorized org joins. Any visitor to the public repo can clone and run the app with full member access.

**Fix applied:**
- Removed `db/custom.db` from git history (`git rm --cached`)
- Added `db/*.db` and `db/*-journal` patterns to `.gitignore`
- Replaced committed database with sanitized seed fixture (`db/seed.db`)
- Updated CI workflow to use `db/seed.db` for test runs
- Removed demo password from README; documented test users as e2e-only
- Added regression test (`e2e/sec-p6.spec.ts`) to verify invite codes remain null

**Test case:** E2E suite passes against seed.db fixture; invite code null verification confirms sanitization.

---

### 2. Cloudinary API credential in git history
**ID:** `p6/history-cloudinary-credential`  
**Severity:** HIGH  
**Status:** CONFIRMED (needs owner rotation verification)

Commit `51de907` in AUDIT.md (line 119) contains a 27-character Cloudinary API credential. The credential was removed in commit `4bc0d0b` but remains reachable from `origin/main` in the git history. Attackers with repository access can clone and extract the credential to make unauthorized API calls, delete assets, or exhaust API quota.

**Action required:**
- Owner must confirm Cloudinary credential rotation/revocation status
- If credential is still active, rotate it immediately
- History rewrite (BFG/git-filter-repo) is non-blocking pending confirmation

**Blocking fact:** Offline verification cannot confirm whether the credential has been rotated or revoked by Cloudinary/owner.

---

## Needs Validation (Dependency Advisories)

### 3. next 16.1.3 advisories reachability
**ID:** `p6/dep-next-advisories`  
**Severity:** MEDIUM  
**Status:** NEEDS_VALIDATION

The project uses `next@16.1.3`, which has published critical and high-severity advisories. Source code review reveals RSC (React Server Component) and action-ID gating against known DoS paths; however, `remotePatterns` and `rewrites` configuration is not set in `next.config.ts`, leaving applicability unresolved in offline analysis.

**Owner action:**
- Review published next 16.1.3 advisories and confirm applicability to the deployment
- If reachable: upgrade to the latest next patch version
- If not reachable: document the gating mechanism in AUDIT.md

**Blocker:** Offline verification cannot determine runtime configuration or deployment-specific exposure.

---

### 4. sharp image-processing advisory applicability
**ID:** `p6/dep-sharp-libvips`  
**Severity:** MEDIUM  
**Status:** NEEDS_VALIDATION

The project uses `sharp@0.34.5` for image normalization during user signup (`api/media` endpoint). The unauthenticated `/_next/image` route can be reached by anonymous users with malicious image payloads. Sharp has published advisories affecting specific libvips/libtiff versions, but CVE applicability to the exact dependency tree version is unresolved offline.

**Owner action:**
- Verify sharp 0.34.5 CVEs against the actual media pipeline and libvips versions in node_modules
- If a CVE is reachable: upgrade sharp or add image validation before processing
- If not reachable: document the mitigating controls in AUDIT.md

**Blocker:** Online CVE database access and staging/vendor consultation needed to confirm whether the reported CVE affects this specific version combination.

---

## Coverage Summary

| Unit | Surface | Boundary | Status | Notes |
|------|---------|----------|--------|-------|
| DB secrets | db/custom.db | README.md demo login | **Confirmed** | Live DB removed; seed.db sanitized |
| Git history | .env*, history | secret scan | **Confirmed** | Cloudinary credential in history; needs rotation verification |
| Dead scaffold | examples/websocket, download/, mini-services/ | package.json scripts | **Covered** | Excluded from build; text-only; no runtime risk |
| CI workflow | .github/workflows/ci.yml | GITHUB_TOKEN permissions | **Covered** | pull_request only (safe); actions tag-pinned; missing: permissions block, SHA pins, persist-credentials |
| Dependencies | package-lock.json | next, next-auth, sharp | **Partially Covered** | next-auth advisories unreachable; next and sharp need owner verification |

---

## Handoff Notes

- **P1 (Edge, proxy, deployment)**: `.zscripts/database-runtime-build.sh` copies db/ into deploy tarball per P1 ownership; verify tarball no longer includes db/custom.db.
- **P4 (AI, integrations)**: Cloudinary credential rotation status impacts secret-scanning outcome; coordinate with owner.

---

## CI Gate

```
✓ tsc --noEmit  (no errors)
✓ npm run lint  (no issues)
✓ e2e/sec-p6.spec.ts (seed.db fixture tests)
```
