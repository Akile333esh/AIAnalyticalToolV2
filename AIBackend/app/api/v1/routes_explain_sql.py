from fastapi import APIRouter, HTTPException
from app.models.schemas import ExplainSQLRequest, ExplainSQLResponse
from app.services.explanation_service import explain_sql

router = APIRouter(tags=["sql_explanation"])

@router.post("/explain_sql", response_model=ExplainSQLResponse)
async def explain_sql_endpoint(payload: ExplainSQLRequest):
    """
    Explain a SQL query in plain English.
    """
    try:
        explanation = await explain_sql(payload.sql)
        return ExplainSQLResponse(explanation=explanation)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
