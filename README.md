# Recipe community (diploma)

Full-stack app for publishing and discovering recipes: **Next.js** frontend, **NestJS** API, **PostgreSQL** via **Prisma**, **Clerk** auth, optional **Stripe**, **S3** storage, and **OpenAI** / OpenRouter for AI recipe generation.

## Repository layout

| Path                 | Role                                         |
| -------------------- | -------------------------------------------- |
| `frontend/`          | Next.js app (port **5173** in dev)           |
| `backend/`           | NestJS API (default port **3000**)           |
| `docker-compose.yml` | Postgres + optional full stack in containers |

## Prerequisites

- Node.js 20+ (recommended)
- PostgreSQL 16+ (or use Docker for the database only)
- Clerk application (publishable + secret keys)
- For AI recipes: `OPENAI_API_KEY` and/or OpenRouter variables (see `backend/.env.example`)
- For uploads / avatars: AWS S3 bucket and credentials (see `backend/.env.example`)

## Local development

### 1. Database

Start Postgres and create a database, or:

```bash
docker compose up db -d
```

Use a URL like `postgresql://recipe:recipe@localhost:5432/recipe` when matching `docker-compose.yml` defaults.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, CLERK_SECRET_KEY, FRONTEND_URL, S3 and AI keys as needed

npm install
npm run start:dev
```

`npm run start:dev` runs `prisma migrate deploy` first (`prestart:dev`), so the schema stays in sync with Postgres. You can still run `npx prisma migrate deploy` manually if you prefer.

API listens on **http://localhost:3000** by default.

**Optional demo data:** after `npm run db:seed` (users + recipes), you can sprinkle comments on every recipe with `npm run db:seed-comments`. Each run **adds** more comments (it does not clear old ones).

### 3. Frontend

```bash
cd frontend
npm install
```

Create `.env.local` as needed, for example:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:3000
```

```bash
npm run dev
```

App: **http://localhost:5173**

## Docker (full stack)

From the repo root, optional root `.env` can supply `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `OPENAI_API_KEY` for compose substitution (see comments in `docker-compose.yml`).

```bash
docker compose up --build
```

- API: http://localhost:3000
- UI: http://localhost:5173

## Feed API (filters)

`GET /recipes` supports query parameters such as `q`, `tag`, `category`, `diet` (exact diet style), `restriction` (comma-separated — each term must match a stored dietary label on the recipe), `includeIng` (comma-separated, all must match ingredient lines), and `excludeIng` (comma-separated, any match excludes the recipe). See `backend/src/recipes/recipes.controller.ts`.

## Recipe comments

- `GET /recipes/:id/comments` — list comments (newest first) if the recipe is published (anonymous OK) or you are the author viewing a draft.
- `POST /recipes/:id/comments` — add a comment (auth); body `{ "body": "…" }` (1–2000 characters).
- `DELETE /recipes/:id/comments/:commentId` — remove a comment if you wrote it or you own the recipe.

## Testing

From the **repo root**:

```bash
npm run test
```

This runs **NestJS Jest** (`backend/`) and **Vitest** (`frontend/`). Individual packages:

```bash
cd backend && npm test
cd frontend && npm test        # CI-style: exits after one run

cd backend && npm run test:cov # Jest coverage
cd frontend && npm run test:watch
```

Continuous integration-friendly run (backend with coverage flags, frontend single run):

```bash
npm run test:ci
```

## CI/CD (GitHub Actions)

Automation lives in [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml).

### Branch model (suggested)

| Branch   | Role |
| -------- | ---- |
| `main`   | Production line: every push runs **CI** and, if it passes, **CD** (Docker images published). |
| `dev`    | Integration branch: push or open a PR into `main` / `dev` to run **CI only** (tests + builds). |

Create `dev` once and push it to GitHub:

```bash
git checkout main
git pull
git checkout -b dev
git push -u origin dev
```

Typical flow: develop on `dev` (or feature branches), open **pull requests** into `main`; merge when green. That merge counts as a push to `main` and triggers **CD** as well as CI.

### What runs when

1. **Triggers**  
   The workflow runs on **pushes** and **pull requests** that target `main` or `dev`.

2. **CI (always for those triggers)**  
   Two jobs run in parallel on GitHub-hosted runners (Ubuntu, Node 22 — aligned with the Dockerfiles):
   - **Backend:** `npm ci` → `npm run test:ci` (Jest with coverage) → `npm run build` (Nest compile).
   - **Frontend:** `npm ci` → `npm test` (Vitest) → `npm run build` (Next.js).

3. **CD (only on `main` pushes)**  
   After both CI jobs succeed, a third job runs **only** if the event is a **push** to **`main`** (not on PRs, and not on `dev`):
   - Logs in to **GitHub Container Registry** (`ghcr.io`) using the automatic `GITHUB_TOKEN`.
   - Builds and pushes two images from the repo `Dockerfile`s:
     - `ghcr.io/<owner>/<repo>-backend:latest` and `:<git-sha>`
     - `ghcr.io/<owner>/<repo>-frontend:latest` and `:<git-sha>`  
   (`<owner>/<repo>` is lowercased to satisfy registry rules.)

So: **`dev` (and PRs) = verify code. `main` = verify + publish container images.**

### Optional GitHub configuration

- **Repository variables** (Settings → Secrets and variables → Actions → **Variables**): set `NEXT_PUBLIC_API_URL` to your real public API base URL for production-like frontend builds in CI/CD. If unset, CI uses `http://localhost:3000`.
- **Actions secrets**: set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` if you want Clerk env baked into CI and into the published frontend image the same way as local Docker builds. If unset, the Dockerfile still builds with an empty key (fine for smoke builds; not for a real production site).
- **Packages**: The first push creates packages under the repo owner; you may need to mark them **public** or grant your host access to pull private images.
- **Branch protection** (optional): require the “CI / CD” workflow to pass before merging into `main`.

### What this is *not*

The workflow does **not** SSH into a VPS or auto-deploy to Vercel/Fly/Heroku. After CD, **you** (or a follow-up workflow) pull `ghcr.io/.../...-backend:latest` and `...-frontend:latest` on a server, or wire the same images into `docker compose` / Kubernetes. That keeps the pipeline safe and provider-agnostic.

## Further reading

- Backend env template: `backend/.env.example`
- NestJS starter notes: `backend/README.md`
- Next.js template notes: `frontend/README.md`
