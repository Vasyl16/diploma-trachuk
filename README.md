# Recipe community (diploma)

Full-stack app for publishing and discovering recipes: **Next.js** frontend, **NestJS** API, **PostgreSQL** via **Prisma**, **Clerk** auth, optional **Stripe**, **S3** storage, and **OpenAI** / OpenRouter for AI recipe generation.

## Repository layout

| Path | Role |
|------|------|
| `frontend/` | Next.js app (port **5173** in dev) |
| `backend/` | NestJS API (default port **3000**) |
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
npx prisma migrate deploy
npm run start:dev
```

API listens on **http://localhost:3000** by default.

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

`GET /recipes` supports query parameters such as `q`, `tag`, `category`, `includeIng` (comma-separated, all must match ingredient lines), and `excludeIng` (comma-separated, any match excludes the recipe). See `backend/src/recipes/recipes.controller.ts`.

## Further reading

- Backend env template: `backend/.env.example`
- NestJS starter notes: `backend/README.md`
- Next.js template notes: `frontend/README.md`
