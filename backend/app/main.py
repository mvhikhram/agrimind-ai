"""
SmartFarm-AI FastAPI Server Application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="SmartFarm-AI Agronomic Engine",
    description="Intelligent precision agriculture API for real-time telemetry, crop recommendations, vision diagnosis, and automated irrigation.",
    version="1.0.0"
)

# Enable CORS for local web dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "platform": "SmartFarm-AI",
        "status": "online",
        "docs_url": "/docs",
        "endpoints": [
            "/api/zones",
            "/api/sensors/current",
            "/api/ai/crop-recommendation",
            "/api/ai/diagnose-leaf",
            "/api/irrigation/schedule"
        ]
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SmartFarm-AI Engine"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
