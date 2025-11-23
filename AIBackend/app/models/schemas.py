from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# --------- Shared / RAG metadata models --------- #

class RAGTableMetadata(BaseModel):
    # ✅ FIX: Rename 'schema' to 'schema_name' and use alias to read input JSON
    schema_name: str = Field(..., alias="schema", description="SQL schema name, e.g. 'dbo'")
    name: str = Field(..., description="Table name, e.g. 'CpuPerformance'")
    description: Optional[str] = None


class RAGColumnMetadata(BaseModel):
    table_schema: str = Field(..., description="Parent table schema")
    table_name: str = Field(..., description="Parent table name")
    name: str = Field(..., description="Column name")
    data_type: Optional[str] = None
    is_nullable: Optional[bool] = None
    description: Optional[str] = None


class RAGJoinMetadata(BaseModel):
    from_table_schema: str
    from_table_name: str
    from_column: str
    to_table_schema: str
    to_table_name: str
    to_column: str
    join_type: str = Field("INNER", description="INNER, LEFT, etc.")


class RAGSemanticTag(BaseModel):
    target_type: str = Field(..., description="table or column")
    target: str = Field(..., description="logical target identifier, e.g. 'dbo.CpuPerformance'")
    tag: str
    weight: float = 1.0


class RAGExample(BaseModel):
    natural_language_query: str
    sql_example: str
    description: Optional[str] = None


class RAGMetadata(BaseModel):
    tables: Optional[List[RAGTableMetadata]] = None
    columns: Optional[List[RAGColumnMetadata]] = None
    joins: Optional[List[RAGJoinMetadata]] = None
    tags: Optional[List[RAGSemanticTag]] = None
    examples: Optional[List[RAGExample]] = None


# --------- SQL generation models --------- #

class SQLGenRequest(BaseModel):
    """
    Request from CoreBackend/worker to generate T-SQL for AnalyticsDB.
    """
    natural_language: str = Field(..., description="User's natural language query/question.")
    time_range: Optional[str] = Field(
        default=None,
        description="Optional time range hint, e.g. 'last_7_days', '24h', '30d'.",
    )
    metric_type: Optional[str] = Field(
        default=None,
        description="Optional metric hint: cpu, memory, disk, etc.",
    )
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional structured filters (deviceName, instance, etc.).",
    )
    metadata: Optional[RAGMetadata] = Field(
        default=None,
        description="RAG metadata context from RAGDB.",
    )
    user_id: Optional[int] = Field(
        default=None, description="Optional caller user id (for logging/audit)."
    )
    job_id: Optional[str] = Field(
        default=None, description="Optional job id for tracing."
    )


class SQLGenResponse(BaseModel):
    generated_sql: str = Field(..., description="Generated T-SQL query targeting AnalyticsDB.")
    reasoning: Optional[str] = Field(
        default=None,
        description="Optional natural language reasoning / explanation from the model.",
    )
    warnings: Optional[List[str]] = Field(
        default=None,
        description="Any warnings about the generated SQL (e.g., missing filters).",
    )


# --------- SQL explanation models --------- #

class ExplainSQLRequest(BaseModel):
    sql: str = Field(..., description="T-SQL query to explain in plain English.")
    dialect: Optional[str] = Field(
        default="tsql",
        description="SQL dialect hint, default 'tsql' for SQL Server.",
    )


class ExplainSQLResponse(BaseModel):
    explanation: str = Field(..., description="Plain-English explanation of what the query does.")
    key_points: Optional[List[str]] = Field(
        default=None,
        description="Optional bullet-point breakdown of important behaviors.",
    )


# --------- Result analysis models --------- #

class AnalyzeRequest(BaseModel):
    """
    Tabular query results + optional context for LLM-based analysis.
    """
    rows: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Result rows as list of dicts: {columnName: value}.",
    )
    columns: Optional[List[str]] = Field(
        default=None,
        description="Optional explicit list of columns (if rows may be partial).",
    )
    query: Optional[str] = Field(
        default=None,
        description="Original NL query, if available.",
    )
    sql: Optional[str] = Field(
        default=None,
        description="Actual SQL used to produce the results, if available.",
    )
    metadata: Optional[RAGMetadata] = Field(
        default=None,
        description="Optional RAG metadata context.",
    )


class AnalyzeResponse(BaseModel):
    analysis: str = Field(
        ...,
        description="Natural language summary of the results and capacity insights.",
    )
    anomalies: Optional[List[str]] = Field(
        default=None,
        description="Optional list of detected anomalies / outliers / issues.",
    )
    recommendations: Optional[List[str]] = Field(
        default=None,
        description="Optional recommended actions or follow-up questions.",
    )