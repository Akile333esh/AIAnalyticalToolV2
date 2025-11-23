from fastapi import APIRouter, HTTPException
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analysis_service import analyze_results

router = APIRouter(tags=["analysis"])

@router.post("/analyze_results", response_model=AnalyzeResponse)
async def analyze_results_endpoint(payload: AnalyzeRequest):
    """
    Analyze tabular results and return a summary, anomalies, and recommendations.
    """
    try:
        # ✅ FIX: Return the service result directly (it is already an AnalyzeResponse object)
        result = await analyze_results(payload)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))