# ImpactLens — agent notes

AI media platform for impact/sustainability orgs. Read `PRD.md` for the product, `README.md` for setup, `AUDIT.md` for prior audit history, `SECURITY-PHASES.md` for the open security work.

## Stack
Next.js 16 App Router (standalone) · TypeScript · Prisma + SQLite (`db/custom.db`, gitignored) · NextAuth credentials (scrypt, JWT) · Tailwind + shadcn/ui · TanStack Query + Zustand · OpenAI-compatible AI client (`src/lib/ai.ts`) · Cloudinary with local `./uploads` fallback.

## Invariants — do not break
- **Every API route calls `getAuthContext()` itself** (`src/lib/auth.ts`). The middleware only guards pages.
- **Every DB read/write is scoped by `auth.orgId`.** Pattern: `findFirst({ where: { id, orgId } })` → 404, then write by id. Any `projectId` from a request body goes through `orgOwnsProject()`.
- Local files are resolved only through `publicFilePath()`: `/uploads/*` → `<cwd>/uploads` (private, org-checked route), everything else → `public/`.
- Never surface `err.message` from Prisma/providers to clients in new code.
- Secrets live in `.env.local` (gitignored). `.env` holds non-secret defaults only.

## Commands
```bash
npm run dev            # :3000
npm run lint
npx tsc --noEmit
npm run build && DATABASE_URL="file:$(pwd)/db/custom.db" NODE_ENV=production PORT=3002 node .next/standalone/server.js &
npm run test:e2e       # expects prod server on :3002 (3001 is taken by another project)
```
Demo data: `cp e2e/fixtures/seed.db db/custom.db` → `ada@example.org / password123`. Test-only; never use it in production.

## Conventions
- Code style is "ponytail": the smallest diff that works, stdlib first, `ponytail:` comments mark deliberate ceilings.
- Commits and PRs carry **no AI attribution** (see the user's global CLAUDE.md).
- Parallel work runs in separate git worktrees/branches. Stay inside the files your phase owns.
