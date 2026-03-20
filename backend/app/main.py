import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes.hawkers import router as hawkers_router

load_dotenv()

app = FastAPI(
    title="Hawker Centre Explorer API",
    description="REST API for the Singapore Hawker Centre Explorer.",
    version="1.0.0",
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(hawkers_router)


@app.get("/health", tags=["meta"])
async def health_check():
    return {"status": "ok"}