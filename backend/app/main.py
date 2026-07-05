from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.dict import router as dict_router
from app.api.routes.cost_centers import router as cost_centers_compat_router
from app.api.routes.forms import router as forms_router
from app.api.routes.admin_dict import router as admin_dict_router
from app.api.routes.admin_users import router as admin_users_router
from app.api.routes.collection_window import router as collection_window_router
from app.api.routes.admin_collection_window import router as admin_collection_window_router
from app.api.routes.admin_reports import router as admin_reports_router
from app.api.routes.admin_export_presets import router as admin_export_presets_router
from app.api.routes.training_proposals import router as training_proposals_router, notifications_router
from app.api.routes.mandatory_trainings import router as mandatory_trainings_router, admin_router as admin_mandatory_trainings_router
from app.api.routes.admin_mail import router as admin_mail_router
from app.api.routes.dashboard import router as dashboard_router
from app.core.config import settings

API_PREFIX = "/api"


def _parse_cors_origins() -> list[str]:
    """Read allowed frontend origins from CORS_ORIGINS."""
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    # Remove trailing slashes and empty entries.
    origins: list[str] = []
    for x in raw.split(","):
        o = x.strip().rstrip("/")
        if o:
            origins.append(o)
    return origins


app = FastAPI(
    title="Training Hub API",
    version=os.getenv("APP_VERSION", settings.APP_VERSION),
    openapi_url=f"{API_PREFIX}/openapi.json",
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
)

# -------------------------
# CORS for the Vite frontend
# -------------------------
cors_origins = _parse_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

media_root = Path(settings.MEDIA_ROOT)
media_root.mkdir(parents=True, exist_ok=True)
app.mount(settings.MEDIA_URL, StaticFiles(directory=media_root), name="media")

# -------------------------
# Public platform endpoints
# -------------------------
@app.get("/api", tags=["root"])
def api_root():
    # Useful when the backend API is opened directly in a browser.
    return {
        "name": "Training Hub API",
        "docs": f"{API_PREFIX}/docs",
        "openapi": f"{API_PREFIX}/openapi.json",
    }


@app.get("/health", tags=["health"])
def root_health():
    # Public root-level health check used by Docker, ECS and simple manual demos.
    return {"status": "ok"}


@app.get("/version", tags=["health"])
def root_version():
    return {"version": settings.APP_VERSION}


def training_process_payload():
    # Public business endpoint required by the DevOps course project.
    return {
        "name": "Training process",
        "company": "Betcloud",
        "status": "available",
        "modules": [
            "training requests",
            "mandatory trainings",
            "training proposals",
            "notifications",
        ],
    }


@app.get("/training-process", tags=["business"])
def root_training_process():
    return training_process_payload()


@app.get(f"{API_PREFIX}/training-process", tags=["business"])
def api_training_process():
    return training_process_payload()


# -------------------------
# Routes
# -------------------------
app.include_router(health_router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(dict_router, prefix=API_PREFIX)
app.include_router(cost_centers_compat_router, prefix=API_PREFIX)
app.include_router(forms_router, prefix=API_PREFIX)
app.include_router(admin_dict_router, prefix=API_PREFIX)
app.include_router(admin_users_router, prefix=API_PREFIX)
app.include_router(collection_window_router, prefix=API_PREFIX)
app.include_router(admin_collection_window_router, prefix=API_PREFIX)
app.include_router(admin_reports_router, prefix=API_PREFIX)
app.include_router(admin_export_presets_router, prefix=API_PREFIX)
app.include_router(admin_mail_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)

app.include_router(training_proposals_router, prefix=API_PREFIX)
app.include_router(notifications_router, prefix=API_PREFIX)
app.include_router(mandatory_trainings_router, prefix=API_PREFIX)
app.include_router(admin_mandatory_trainings_router, prefix=API_PREFIX)


# -------------------------
# Frontend static files
# -------------------------
frontend_dist = Path(__file__).resolve().parents[2] / "frontend_dist"
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        # Keep API and uploaded media paths owned by FastAPI routers/static mounts.
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("media/") or full_path == "media":
            raise HTTPException(status_code=404, detail="Not found")

        requested_file = frontend_dist / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(frontend_dist / "index.html")
