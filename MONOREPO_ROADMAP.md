# NitroBerry → Multi-Product Platform: Monorepo Migration Roadmap

> **Objective**: Transform the current NitroBerry monolithic Next.js app into a Microsoft 365-style multi-product platform using a Git Monorepo architecture — starting with **Vault** and **Social** as standalone products.

---

## Table of Contents

1. [What Is a Monorepo and Why Use It](#1-what-is-a-monorepo-and-why-use-it)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Tooling Decision: Turborepo + pnpm Workspaces](#4-tooling-decision-turborepo--pnpm-workspaces)
5. [Phase-by-Phase Roadmap](#5-phase-by-phase-roadmap)
6. [Key Factors to Remember](#6-key-factors-to-remember)
7. [Risks and Mitigations](#7-risks-and-mitigations)
8. [Time Estimates](#8-time-estimates)
9. [Decision Checklist Before Starting](#9-decision-checklist-before-starting)

---

## 1. What Is a Monorepo and Why Use It

### Single Repo vs Monorepo vs Polyrepo

| Approach     | Description                                    | Example                 |
| ------------ | ---------------------------------------------- | ----------------------- |
| **Monolith** | One repo, one app, all code together           | Current NitroBerry      |
| **Polyrepo** | One repo per product (vault-repo, social-repo) | Separate GitHub repos   |
| **Monorepo** | One repo, multiple packages/apps inside it     | Microsoft, Google, Meta |

### Why Monorepo (not Polyrepo)

- **Shared code** (UI kit, auth, API client) lives in one place — no copy-pasting or npm publishing overhead
- **Atomic commits** — one PR can change shared UI + vault + social at the same time
- **Consistent tooling** — one ESLint config, one TypeScript config, one CI pipeline
- **Code discoverability** — engineers see the full picture
- **No version hell** — no `@nitroberry/ui@1.2.3` vs `@nitroberry/ui@1.2.1` drift across repos

---

## 2. Current State Analysis

### App Scale

| Category                | Count                              |
| ----------------------- | ---------------------------------- |
| TypeScript/TSX files    | ~247                               |
| Components              | 64 (30 UI primitives + 34 feature) |
| API endpoints defined   | 103                                |
| API service files       | 13                                 |
| Context providers       | 6                                  |
| Custom hooks            | 9                                  |
| Estimated lines of code | ~35,000+                           |

### Feature Inventory & Isolation Score

| Feature     | Route                    | Components       | Hooks       | Contexts    | Isolation Difficulty |
| ----------- | ------------------------ | ---------------- | ----------- | ----------- | -------------------- |
| **Vault**   | `/dashboard/vault`       | 0 dedicated      | 0 dedicated | 0 dedicated | 🟢 Easy              |
| **Social**  | `/dashboard/social/*`    | 11 dedicated     | 4 dedicated | 1 dedicated | 🟢 Easy              |
| Tasks       | `/dashboard/task`        | 0 dedicated      | 0 dedicated | 0 dedicated | 🟡 Medium            |
| Workflow    | `/dashboard/workflow/*`  | 0 dedicated      | 0 dedicated | 0 dedicated | 🟡 Medium            |
| FMS Indents | `/dashboard/fms-indents` | 2 (kanban)       | 0 dedicated | 0 dedicated | 🟡 Medium            |
| Analytics   | `/dashboard/analytics`   | 0 dedicated      | 0 dedicated | 0 dedicated | 🔴 Hard              |
| Setup       | `/dashboard/setup`       | 0 dedicated      | 0 dedicated | 0 dedicated | 🔴 Hard              |
| Dashboard   | `/dashboard`             | layout + sidebar | —           | 1 dedicated | 🔴 Hard              |

### What Is Shared (Must Become Shared Packages)

```
Shared across ALL products:
├── src/api/client.ts          → @nitroberry/api-client
├── src/api/token.ts           → @nitroberry/auth
├── src/api/apiFunction.ts     → @nitroberry/api-client
├── src/context/AuthProvider   → @nitroberry/auth
├── src/context/TanstackProvider → @nitroberry/react-query
├── src/context/PermissionsContext → @nitroberry/permissions
├── src/hooks/useApi.ts        → @nitroberry/api-client
├── src/components/ui/*        → @nitroberry/ui
├── src/lib/utils.ts           → @nitroberry/utils
├── src/lib/enums/*            → @nitroberry/shared
├── src/lib/interfaces/*       → @nitroberry/shared
└── src/shared/*               → @nitroberry/shared
```

---

## 3. Target Architecture

### Final Folder Structure (Inside One Git Repo)

```
nitroberry-platform/          ← One GitHub repository
├── apps/
│   ├── main/                 ← Core FMS app (Dashboard, Tasks, Workflow, Setup, Analytics)
│   ├── vault/                ← Vault standalone product  [PHASE 2]
│   ├── social/               ← Social standalone product [PHASE 2]
│   └── hub/                  ← Product launcher/home (like office.com) [PHASE 4]
│
├── packages/
│   ├── ui/                   ← @nitroberry/ui (Radix + Tailwind components)
│   ├── auth/                 ← @nitroberry/auth (NextAuth config, token mgmt)
│   ├── api-client/           ← @nitroberry/api-client (Axios, React Query hooks)
│   ├── permissions/          ← @nitroberry/permissions (RBAC context, guard)
│   ├── shared/               ← @nitroberry/shared (enums, utils, interfaces, countries)
│   └── config/               ← @nitroberry/config (Tailwind config, ESLint, TypeScript)
│
├── turbo.json                ← Turborepo pipeline config
├── pnpm-workspace.yaml       ← Workspace definition
├── package.json              ← Root dev scripts
└── .github/
    └── workflows/            ← CI — only build/test affected apps
```

### How Products Relate

```
                    ┌─────────────────────────────────┐
                    │         One Git Repository       │
                    └─────────────────────────────────┘
                              │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
    apps/main           apps/vault          apps/social
  (fms.nitrob.com)  (vault.nitrob.com)  (connect.nitrob.com)
        │                    │                    │
        └────────────────────┴────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        packages/ui    packages/auth   packages/shared
        packages/api-client    packages/permissions
```

Each `apps/*` is a **separate Next.js app** deployed independently. They share code from `packages/*` but are **completely separate deployments** (separate URLs, separate builds).

---

## 4. Tooling Decision: Turborepo + pnpm Workspaces

### Recommended Stack

| Tool                | Role                | Why                                                      |
| ------------------- | ------------------- | -------------------------------------------------------- |
| **Turborepo**       | Build orchestration | Caches builds, only rebuilds affected packages           |
| **pnpm workspaces** | Package linking     | Faster than npm/yarn, native workspace linking           |
| **Changesets**      | Versioning          | Manages changelog + semver for shared packages           |
| **GitHub Actions**  | CI/CD               | Path-based triggers (only deploy vault if vault changed) |

### Why Not Nx or Lerna?

- **Turborepo**: Zero config, faster, built by Vercel (perfect for Next.js), best DX
- **Nx**: More powerful but heavier — overkill for current scale
- **Lerna**: Legacy tooling, Turborepo replaces it

---

## 5. Phase-by-Phase Roadmap

---

### PHASE 0 — Preparation (Before Any Migration)

**Duration: 1–2 weeks**
**Goal: Set foundation without breaking anything**

#### 0.1 — Decisions to Lock In First

- [ ] Final subdomain plan: `vault.nitrob.com`? `social.nitrob.com`? `app.nitrob.com`?
- [ ] Authentication: Will all products share the same NextAuth session/cookie domain?
- [ ] Backend: Are Vault/Social APIs already separate on the backend, or does one backend serve all?
- [ ] Deployment: Vercel (recommended — supports monorepo natively) or self-hosted?

#### 0.2 — Code Cleanup (Do Before Migration)

- [ ] Move all Vault-specific code into `src/app/dashboard/vault/` (it's mostly there already)
- [ ] Move all Social-specific code into `src/app/dashboard/social/` (already well organized)
- [ ] Audit `src/api/endpoints.ts` — tag each endpoint with its product (vault, social, core)
- [ ] Remove any direct cross-feature imports (e.g., social component importing task utility)
- [ ] Ensure `src/components/ui/*` has zero feature-specific imports (pure UI only)

#### 0.3 — Freeze Feature Work

- [ ] Create a `migration/monorepo` branch
- [ ] Communicate to team: no new features during migration, only bug fixes on main

---

### PHASE 1 — Bootstrap the Monorepo Shell

**Duration: 1 week**
**Goal: Create the new repo structure, move existing app in as `apps/main`**

#### Steps

**1.1 — Initialize new monorepo**

```bash
mkdir nitroberry-platform
cd nitroberry-platform
git init
pnpm init
```

**1.2 — Create workspace config**

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

**1.3 — Move existing NitroBerry app**

```bash
mkdir apps
cp -r ../NitroBerry-App apps/main
# Keep git history by using git subtree or filter-branch
```

> **Critical**: Use `git subtree` or `git filter-repo` to preserve commit history when moving files. Do NOT copy-paste (you lose blame/history).

**1.4 — Install Turborepo**

```bash
pnpm add -D turbo -w
```

**1.5 — Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "type-check": {}
  }
}
```

**At the end of Phase 1**: Everything still works. `apps/main` is just the current app in a new folder. Nothing is broken.

---

### PHASE 2 — Extract Shared Packages

**Duration: 2–3 weeks**
**Goal: Create `packages/*` that apps/main depends on**

> This is the most technically complex phase. Extract one package at a time. Test after each extraction.

#### 2.1 — `packages/shared` (Start here — zero risk)

Contents:

- `src/lib/enums/*`
- `src/lib/interfaces/*`
- `src/lib/utils.ts`
- `src/shared/*`
- `countries.json`

```
packages/shared/
├── src/
│   ├── enums/
│   ├── interfaces/
│   ├── utils.ts
│   └── countries.json
├── package.json          → name: "@nitroberry/shared"
├── tsconfig.json
└── index.ts              → exports everything
```

#### 2.2 — `packages/ui` (High value, medium risk)

Contents:

- All of `src/components/ui/*`
- Tailwind config, CSS variables
- Radix UI dependencies

> **Important**: `packages/ui` must use Tailwind but NOT bundle it — each consuming app handles CSS compilation.

#### 2.3 — `packages/auth`

Contents:

- `src/app/api/auth/[...nextauth]/route.ts` logic (not the route itself)
- `src/api/token.ts`
- `src/context/AuthProvider.tsx`
- Auth-related types

#### 2.4 — `packages/api-client`

Contents:

- `src/api/client.ts` (Axios instance)
- `src/api/apiFunction.ts`
- `src/api/methods.ts`
- `src/api/queryClient.ts`
- `src/hooks/useApi.ts`
- `src/context/TanstackProvider.tsx`

> **Note**: `endpoints.ts` stays in each app — each product has its own endpoints file.

#### 2.5 — `packages/permissions`

Contents:

- `src/context/PermissionsContext.tsx`
- `src/hooks/usePermissions.ts`
- `src/components/PermissionGuard.tsx`

**After Phase 2**: `apps/main` imports from `@nitroberry/shared`, `@nitroberry/ui`, etc. App works exactly the same — just with internal packages.

---

### PHASE 3 — Extract Vault as Standalone App

**Duration: 2–3 weeks**
**Goal: `apps/vault` — a separate Next.js app at `{{base url}}/vault`** here base url is our old app domain

#### What Goes Into apps/vault

```
apps/vault/
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← Vault-specific layout (different sidebar/nav)
│   │   ├── page.tsx           ← Vault home
│   │   ├── (auth)/            ← Shared login flow (or redirect to main login)
│   │   └── api/auth/          ← NextAuth config (shared cookie domain)
│   ├── api/
│   │   ├── client.ts          ← Re-exports from @nitroberry/api-client
│   │   └── endpoints.ts       ← VAULT_* endpoints only
│   └── components/            ← Vault-specific components (currently none, good)
├── package.json               ← depends on @nitroberry/ui, @nitroberry/auth, etc.
└── next.config.ts
```

#### Authentication Across Products

Since both `apps/vault` and `apps/main` need the same login session, you have two options:

**Option A — Shared Cookie Domain** (Recommended)

- Set `NEXTAUTH_URL` for each app
- Use `.nitrob.com` as cookie domain so cookie works across subdomains
- User logs in once on `app.nitrob.com`, Vault at `vault.nitrob.com` reads same session

**Option B — SSO Redirect**

- Vault redirects unauthenticated users to main app login
- After login, redirects back with token

#### Vault-Specific Endpoints to Isolate

```
VAULT_SECURITY_SETUP, VAULT_SECURITY_STATUS,
VAULT, VAULT_USERS, VAULT_SHARE, VAULT_DETAIL, VAULT_RESET_SECURITY
```

---

### PHASE 4 — Extract Social as Standalone App

**Duration: 2–3 weeks**
**Goal: `apps/social` — a separate Next.js app at `social.domain.com` or `connect.domain.com`**

Social is already the **best organized feature** in the codebase — it has:

- 11 dedicated components in `src/components/social/`
- 4 dedicated hooks in `src/hooks/use-social-*.ts`
- 3 dedicated API files in `src/api/social-*.ts`
- 1 dedicated context `social-favorites-context.tsx`
- Full sub-routing: home, bookmarks, communities, discover, ama, storylines, profile

#### What Goes Into apps/social

```
apps/social/
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← Social-specific layout
│   │   ├── home/page.tsx
│   │   ├── bookmarks/page.tsx
│   │   ├── communities/
│   │   ├── discover/
│   │   ├── storylines/
│   │   ├── ama/
│   │   └── profile/
│   ├── api/
│   │   ├── social-posts.ts
│   │   ├── social-communities.ts
│   │   ├── social-interactions.ts
│   │   └── endpoints.ts       ← SOCIAL_* endpoints only
│   ├── components/
│   │   └── [all 11 social components]
│   ├── hooks/
│   │   └── [all 4 social hooks]
│   └── context/
│       └── social-favorites-context.tsx
└── package.json
```

---

### PHASE 5 — Product Hub (Optional, Future)

**Duration: 1–2 weeks**
**Goal: `apps/hub` — the "office.com" equivalent**

A lightweight app at `nitrob.com` that:

- Shows all available products the user's company has subscribed to
- Provides unified notifications/activity feed
- Acts as the entry point for all NitroBerry products

---

### PHASE 6 — Future Product Extractions

Following the same pattern from Phases 3 and 4:

| Future Product        | Complexity               | Estimated Time |
| --------------------- | ------------------------ | -------------- |
| Tasks                 | Medium                   | 2 weeks        |
| Workflow / FMS        | High (many sub-features) | 3–4 weeks      |
| Analytics + Reports   | Medium                   | 2 weeks        |
| Setup (Admin Console) | Medium                   | 2 weeks        |

---

## 6. Key Factors to Remember

### Git & Version Control

1. **Never copy-paste files when migrating** — use `git mv` or `git subtree` to preserve history
2. **One migration PR per phase** — avoid giant PRs that are impossible to review
3. **Branch strategy**:

   ```
   main (stable)
   └── dev
       └── migration/monorepo-shell     (Phase 1)
       └── migration/extract-shared     (Phase 2)
       └── migration/vault-app          (Phase 3)
       └── migration/social-app         (Phase 4)
   ```

4. **Tag the last monolith commit**: `git tag v1-monolith` before migration starts — easy rollback reference

### Authentication

5. **Session sharing is the #1 risk** — plan the cookie domain strategy before writing any code
6. **NextAuth secret must be the same** across all apps if sharing sessions
7. **NEXTAUTH_URL** must be set correctly per deployment environment

### API & Backend

8. **Coordinate with backend team** — the backend needs to support CORS for multiple frontend origins
9. **Environment variables multiply** — each `apps/*` needs its own `.env.local`; plan a secrets management strategy early
10. **API endpoint files stay per-app** — do NOT put `endpoints.ts` in a shared package (tight coupling, hard to version independently)

### Shared Packages

11. **`packages/ui` must NOT import from `packages/auth` or `packages/api-client`** — keep it pure UI
12. **Circular dependencies will break the build** — `packages/shared` must have zero internal package dependencies
13. **TypeScript path aliases (`@/*`)** must be reconfigured in each app's `tsconfig.json` — they don't auto-inherit
14. **Tailwind CSS**: in a monorepo, each app runs its own Tailwind compiler. `packages/ui` exports class strings — this just works.

### Deployment

15. **Vercel monorepo support is excellent** — set `Root Directory` per project in Vercel dashboard
16. **CI must use path filters** — only build `apps/vault` when files in `apps/vault/**` or `packages/**` change
17. **Deploy order matters**: shared packages → apps (Turborepo handles this automatically)

### Team & Process

18. **Freeze new features during Phase 1 and 2** — migration and new features conflict badly
19. **One engineer owns the migration** — too many cooks break the monorepo
20. **Test every package extraction** before moving to the next — build + lint + run in dev
21. **Document the package API** (what each `packages/*/index.ts` exports) — other engineers need to find things

---

## 7. Risks and Mitigations

| Risk                                         | Likelihood | Impact   | Mitigation                                                                 |
| -------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------- |
| Session auth breaks across products          | High       | Critical | Decide cookie domain strategy in Phase 0; test thoroughly                  |
| Circular package dependencies                | Medium     | High     | Draw the dependency graph before coding; enforce with ESLint rules         |
| Build times increase                         | Medium     | Medium   | Turborepo caching solves this; remote caching available                    |
| Team merges features during migration        | High       | Medium   | Branch freeze policy; communicate timeline                                 |
| Tailwind styles not working in packages      | Medium     | Medium   | Follow Tailwind monorepo guide; content paths must include package sources |
| History loss during file moves               | Low        | Medium   | Use `git mv` exclusively; never copy-paste                                 |
| `.env` sprawl across apps                    | High       | Medium   | Use Vercel environment groups or a `.env` inheritance pattern              |
| NextAuth version incompatibility across apps | Low        | High     | Pin exact versions; upgrade as a single atomic change                      |

---

## 8. Time Estimates

| Phase       | Description                    | Optimistic    | Realistic     | If Issues Arise |
| ----------- | ------------------------------ | ------------- | ------------- | --------------- |
| **Phase 0** | Prep, cleanup, decisions       | 1 week        | 1.5 weeks     | 2 weeks         |
| **Phase 1** | Bootstrap monorepo shell       | 3 days        | 1 week        | 1.5 weeks       |
| **Phase 2** | Extract shared packages        | 2 weeks       | 3 weeks       | 4 weeks         |
| **Phase 3** | Vault standalone app           | 1.5 weeks     | 2.5 weeks     | 3 weeks         |
| **Phase 4** | Social standalone app          | 1.5 weeks     | 2 weeks       | 3 weeks         |
| **Phase 5** | Hub app (optional)             | 1 week        | 1.5 weeks     | 2 weeks         |
| **Buffer**  | Testing, bug fixes, deployment | 1 week        | 2 weeks       | 3 weeks         |
| **TOTAL**   |                                | **~10 weeks** | **~14 weeks** | **~18 weeks**   |

> **Realistic estimate: 3–4 months** for a 1-2 engineer team doing this alongside normal work.
> **Full-time dedicated engineer: 8–10 weeks**.

---

## 9. Decision Checklist Before Starting

Answer these before writing a single line of migration code:

### Business

- [ ] Is the client okay with a temporary feature freeze during migration?
- [ ] What is the release deadline for Vault standalone and Social standalone?
- [ ] Will each product have separate billing/subscription, or shared?

### Technical

- [ ] What will the subdomain/URL structure be? (`vault.x.com`? `x.com/vault`?)
- [ ] Will all products share the same backend API or separate backends?
- [ ] What is the deployment platform? (Vercel recommended)
- [ ] Will products share the same login page or have separate auth flows?
- [ ] Package manager decision: pnpm (recommended) or yarn/npm?

### Team

- [ ] Who is the migration owner (one person)?
- [ ] Is there a QA process for each phase before moving to the next?
- [ ] How will the team communicate the new folder structure to all contributors?

---

## Quick Reference: Package Dependency Map

```
@nitroberry/shared      ← no internal deps (pure types/utils)
@nitroberry/config      ← no internal deps (pure config files)
@nitroberry/ui          ← depends on: @nitroberry/shared, @nitroberry/config
@nitroberry/auth        ← depends on: @nitroberry/shared
@nitroberry/api-client  ← depends on: @nitroberry/shared, @nitroberry/auth
@nitroberry/permissions ← depends on: @nitroberry/shared, @nitroberry/api-client

apps/main               ← depends on all packages
apps/vault              ← depends on: ui, auth, api-client, permissions, shared
apps/social             ← depends on: ui, auth, api-client, permissions, shared
apps/hub                ← depends on: ui, auth, shared
```

**Rule**: packages can only depend on packages below them in this list. Never upward.

---

## Suggested Learning Resources

- [Turborepo Getting Started](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Next.js Monorepo Example](https://github.com/vercel/next.js/tree/canary/examples/with-turborepo)
- [Changesets for versioning](https://github.com/changesets/changesets)
- [git subtree for history-preserving file moves](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging#_subtree_merge)

---

_Document prepared: April 2026 | NitroBerry Platform v2 Planning_
