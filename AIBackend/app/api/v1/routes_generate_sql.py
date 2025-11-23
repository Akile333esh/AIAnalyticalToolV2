from fastapi import APIRouter, HTTPException
from app.models.schemas import SQLGenRequest, SQLGenResponse
from app.services.sql_generation_service import generate_sql

router = APIRouter()

@router.post("/generate_sql", response_model=SQLGenResponse)
async def generate_sql_endpoint(request: SQLGenRequest):
    try:
        # The service now returns the full SQLGenResponse object
        response = await generate_sql(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))