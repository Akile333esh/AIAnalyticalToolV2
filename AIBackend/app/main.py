from fastapi import FastAPI
from app.api.v1.routes_generate_sql import router as sql_router
from app.api.v1.routes_explain_sql import router as explain_router
from app.api.v1.routes_analyze_results import router as analyze_router
from app.core.logging_config import configure_logging

configure_logging()

app = FastAPI(
    title="AIBackend",
    description="LLM-powered SQL Generation, Explanation, and Analysis Service",
    version="1.0.0",
)

# Register API routes under /v1
app.include_router(sql_router, prefix="/v1")
app.include_router(explain_router, prefix="/v1")
app.include_router(analyze_router, prefix="/v1")


@app.get("/", tags=["health"])
async def root():
    return {"status": "AIBackend running"}
