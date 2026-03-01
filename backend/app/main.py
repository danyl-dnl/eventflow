from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.routes import events, registrations, stats, auth

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EventFlow API",
    description="Registration & Capacity Manager — REST API",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────
app.include_router(auth.router,          prefix="/api/v1")
app.include_router(events.router,        prefix="/api/v1")
app.include_router(registrations.router, prefix="/api/v1")
app.include_router(stats.router,         prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "EventFlow API is running"}