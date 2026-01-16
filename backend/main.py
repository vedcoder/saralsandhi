import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers.contracts import router as contracts_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="SaralSandhi API",
    description="Contract Analysis Tool API",
    version="1.0.0"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"➡️  {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"⬅️  {request.method} {request.url.path} - Status: {response.status_code}")
    return response


app.include_router(contracts_router, prefix="/api", tags=["contracts"])


@app.get("/api/health")
async def health_check():
    logger.info("Health check requested")
    return {"status": "healthy"}
