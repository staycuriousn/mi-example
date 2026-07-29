"""Epson Korea MI Platform — FastAPI backend.

설계 단계: Salesforce 실연동 없이 data/sample/*.json을 서빙한다.
프론트엔드 빌드(frontend/dist)가 있으면 정적 서빙까지 담당한다.

실행:  uvicorn backend.main:app --reload --port 8000  (저장소 루트에서)
"""
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_DIR = ROOT / "data" / "sample"
DIST_DIR = ROOT / "frontend" / "dist"

app = FastAPI(title="Epson Korea MI Platform API", version="0.1.0")

# Vite dev 서버(5173)에서의 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _load(name: str):
    path = SAMPLE_DIR / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"sample data not found: {name}")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/opportunities")
def opportunities():
    return _load("opportunities")


@app.get("/api/accounts")
def accounts():
    return _load("accounts")


@app.get("/api/sales-plan")
def sales_plan():
    return _load("sales_plan")


@app.get("/api/sensing-events")
def sensing_events():
    return _load("sensing_events")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# 프론트엔드 빌드가 있으면 루트에서 정적 서빙 (SPA fallback 포함)
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
