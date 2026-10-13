"""Ideas - API and the built frontend in one process (see the nicasso app blueprint)."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api import admin, ideas, me
from .config import settings
from .db import run_migrations

log = logging.getLogger(__name__)
MUTATING = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_HEADER_VALUE = "ideas"


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    if settings.auth_mode == "dev":
        log.warning("AUTH_MODE=dev - every request is user '%s'. Never use this on a server.", settings.dev_user)
    yield


app = FastAPI(title="Ideas", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)


@app.middleware("http")
async def guard(request: Request, call_next):
    """CSRF protection for the JSON API plus security and cache headers."""
    path = request.url.path
    if path.startswith("/api/") and request.method in MUTATING:
        # A custom header can't be sent cross-site without a CORS preflight, which this
        # app never allows - so its presence proves a same-origin request.
        if request.headers.get("x-requested-with") != CSRF_HEADER_VALUE:
            return JSONResponse({"detail": "CSRF check failed"}, status_code=403)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    if not path.startswith("/api/docs"):
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
            "connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'self'; "
            "base-uri 'none'; form-action 'self'",
        )
    if path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    elif path.startswith("/assets/"):
        response.headers.setdefault("Cache-Control", "public, max-age=31536000, immutable")
    else:
        response.headers.setdefault("Cache-Control", "no-cache")
    return response


@app.get("/api/health", include_in_schema=False)
def health() -> dict:
    return {"ok": True}


app.include_router(me.router)
app.include_router(ideas.router)
app.include_router(admin.router)


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
def api_not_found(path: str):
    return JSONResponse({"detail": "Not found"}, status_code=404)


class SpaStaticFiles(StaticFiles):
    """Serves the React build; unknown paths get index.html (client-side routing)."""

    async def get_response(self, path, scope):
        is_asset = path.replace("\\", "/").startswith("assets/")
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as e:
            if e.status_code != 404 or is_asset:
                raise
            return FileResponse(Path(self.directory) / "index.html")
        if response.status_code == 404 and not is_asset:
            return FileResponse(Path(self.directory) / "index.html")
        return response


if (settings.static_dir / "index.html").is_file():
    app.mount("/", SpaStaticFiles(directory=settings.static_dir, html=True), name="frontend")
else:
    log.warning("No frontend build at %s - API only (run 'npm run build' in frontend/).", settings.static_dir)
