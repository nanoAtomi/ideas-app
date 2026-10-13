# Ideas

A collecting point for app ideas. Runs as an app of the nicasso platform
(`https://ideas.nicasso.de`): sign-in through the portal's Keycloak, its own PostgreSQL,
deploys from this repository.

The decisions and phases are in [docs/plan.md](docs/plan.md).

## Stack

- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2, Alembic, PostgreSQL. Code in [backend/](backend/).
- **Frontend:** React 19, TypeScript, Vite, TanStack Query, React Router, Tailwind, i18next (DE/EN). Code in [frontend/](frontend/).
- **One container:** [Dockerfile](Dockerfile) builds the frontend and serves it from FastAPI.

## Admins

Admins see every idea (also private and deleted ones) on the admin board. Admin is the
app role `admin` (declared in `portal.yml`): Portal → Users → the person's apps → Ideas →
Admin. Locally, `AUTH_MODE=dev` makes the dev user an admin.

## Local development

Backend (SQLite, every request is the user `dev`):

```bash
cd backend
python -m pip install -r requirements-dev.txt
AUTH_MODE=dev uvicorn app.main:app --reload --port 8000
```

Frontend with hot reload (proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

Tests: `cd backend && python -m pytest -q` and `cd frontend && npm run typecheck && npm test`.

## Release

1. Push to `main` → **Build image** runs the tests and builds `ghcr.io/nanoatomi/ideas-app:sha-<commit>`.
2. Actions → **Deploy** → Run workflow (empty tag = latest commit, `sha-xxxxxxx` = rollback).

Repository secrets: `PORTAL_URL=https://api.nicasso.de` and `PORTAL_DEPLOY_TOKEN`
(portal → Admin → Apps → Ideas → Runtime → Create token).
