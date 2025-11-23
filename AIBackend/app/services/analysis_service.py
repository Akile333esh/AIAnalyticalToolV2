from __future__ import annotations

import json
import re
import textwrap
from typing import Any, Dict, List

from httpx import ConnectError, TimeoutException
from app.core.config import config
from app.core.ollama_client import ollama_client
from app.models.schemas import AnalyzeRequest, AnalyzeResponse


def _format_rows_for_llm(rows: List[Dict[str, Any]], max_rows: int = 30) -> str:
    if not rows:
        return "No rows returned."

    sample = rows[:max_rows]
    cols = list(sample[0].keys())

    lines: List[str] = []
    lines.append(" | ".join(cols))
    lines.append("-+-".join(["-" * len(c) for c in cols]))
    for r in sample:
        values = [str(r.get(c, "")) for c in cols]
        lines.append(" | ".join(values))

    if len(rows) > max_rows:
        lines.append(f"... ({len(rows) - max_rows} more rows not shown)")

    return "\n".join(lines)


async def analyze_results(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Use llama3.1 to analyze tabular query results and provide capacity insights.
    Returns a structured AnalyzeResponse object.
    """
    table_text = _format_rows_for_llm(request.rows)

    meta_lines: List[str] = []
    if request.query:
        meta_lines.append(f"User Question: {request.query}")
    if request.sql:
        # Truncate long SQL to save context window
        sql_display = request.sql.strip()
        if len(sql_display) > 500:
            sql_display = sql_display[:500] + "... [truncated]"
        meta_lines.append(f"SQL Query: {sql_display}")

    meta_block = "\n".join(meta_lines) if meta_lines else "No extra context."

    # ------------------------------------------------------------------
    # SYSTEM PROMPT (JSON Enforcement)
    # ------------------------------------------------------------------
    prompt = f"""
You are an expert SRE and Capacity Planner. 
Analyze the database query results below and provide structured insights.

### Context
{meta_block}

### Data (Tabular)
{table_text}

### Instructions
1. **Trend Analysis:** Look strictly at the Date/Month column. Note that data might be sorted DESC (newest first). Don't confuse "top of list" with "start of time".
2. **Anomalies:** Identify specific resources (Servers, Disks) exceeding safe thresholds (e.g. CPU > 80%, Disk < 10% free).
3. **Output Format:** You MUST return a valid JSON object.

### JSON Structure
{{
  "analysis": "A short executive summary of trends (e.g. 'Memory usage increased by 15% over Q3').",
  "anomalies": ["List of specific outliers or warnings (e.g. 'SRV-01 CPU spiked to 99% on Oct 12')."],
  "recommendations": ["2-4 actionable steps (e.g. 'Resize VM', 'Check cron jobs')."]
}}

### Response (JSON Only)
"""

    try:
        # Call AI
        raw_response = await ollama_client.generate(model=config.ANALYZE_MODEL, prompt=prompt)
        
        # ------------------------------------------------------------------
        # JSON PARSING LOGIC
        # ------------------------------------------------------------------
        cleaned_response = raw_response.strip()
        
        # Extract JSON if wrapped in markdown
        json_match = re.search(r"\{[\s\S]*\}", cleaned_response)
        if json_match:
            cleaned_response = json_match.group(0)

        data = json.loads(cleaned_response)
        
        return AnalyzeResponse(
            analysis=data.get("analysis", "No analysis provided."),
            anomalies=data.get("anomalies", []),
            recommendations=data.get("recommendations", [])
        )

    except (json.JSONDecodeError, AttributeError):
        # Fallback: Treat whole text as analysis if JSON fails
        print("⚠️ Llama 3.1 Analysis returned raw text. Returning as unstructured summary.")
        return AnalyzeResponse(
            analysis=raw_response.strip(),
            anomalies=[],
            recommendations=["Could not parse specific recommendations."]
        )

    except (ConnectError, TimeoutException) as e:
        return AnalyzeResponse(
            analysis="AI Service Unavailable. Could not analyze results.",
            anomalies=[],
            recommendations=[f"Check AI Service connection: {str(e)}"]
        )