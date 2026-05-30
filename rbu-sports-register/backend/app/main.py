from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, equipment, students, issuances, qr, bookings
from datetime import datetime, timezone

app = FastAPI(
    title="RBU Sports Facility & Issuance Register",
    description="High performance admin-controlled registry supporting checkouts, facility reservations and secured expirable scans.",
    version="1.0.0",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json"
)

# CORS Config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Multi-origin support
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check route
@app.get("/health", tags=["System Integration Services"])
async def check_health():
    return {
        "status": "ok",
        "service": "rbu_sports_api",
        "time_utc": datetime.now(timezone.utc).isoformat()
    }

# Mount sub-routers with modern prefixing
app.include_router(auth.router, prefix="/api/v1")
app.include_router(equipment.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(issuances.router, prefix="/api/v1")
app.include_router(qr.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
