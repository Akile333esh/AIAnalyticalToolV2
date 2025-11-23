from __future__ import annotations

import re
import textwrap
import json
from typing import List, Dict, Any, Set

from httpx import ConnectError, TimeoutException
from app.core.config import config
from app.core.ollama_client import ollama_client
from app.models.schemas import SQLGenRequest, RAGMetadata, SQLGenResponse


def _get_schema_name(t: Any) -> str:
    return getattr(t, 'schema_name', getattr(t, 'schema', 'dbo'))


def _filter_metadata_by_query(metadata: RAGMetadata | None, nl_query: str) -> RAGMetadata | None:
    """
    Intelligently filters schema to reduce hallucinations.
    Prioritizes specific tags (cpu, memory) over generic ones (server, usage).
    """
    if not metadata or not metadata.tags:
        return metadata

    nl_lower = nl_query.lower()
    relevant_tables: Set[str] = set()
    
    # Define generic tags that shouldn't trigger inclusion if specific tags exist
    GENERIC_TAGS = {'server', 'host', 'machine', 'device', 'usage', 'utilization', 'load', 'stats'}
    
    # Check for specific matches first
    has_specific_match = False
    for tag_obj in metadata.tags:
        if tag_obj.tag.lower() not in GENERIC_TAGS and tag_obj.tag.lower() in nl_lower:
            has_specific_match = True
            break

    for tag_obj in metadata.tags:
        is_generic = tag_obj.tag.lower() in GENERIC_TAGS
        # If we found specific matches (e.g. "memory"), ignore generic tags (e.g. "server")
        # Otherwise, if query is vague ("show server stats"), allow generics.
        if tag_obj.tag.lower() in nl_lower:
            if has_specific_match and is_generic:
                continue # Skip adding this table based on a generic tag
            
            if tag_obj.target_type == 'table':
                relevant_tables.add(tag_obj.target.lower())

    # Fallback: If no tables matched, return everything
    if not relevant_tables:
        return metadata

    # Filter tables
    filtered_tables = []
    if metadata.tables:
        for t in metadata.tables:
            s_name = _get_schema_name(t)
            full_name = f"{s_name}.{t.name}".lower()
            if full_name in relevant_tables:
                filtered_tables.append(t)

    if not filtered_tables:
        return metadata

    # Filter columns
    filtered_columns = []
    if metadata.columns:
        for c in metadata.columns:
            full_table_name = f"{c.table_schema}.{c.table_name}".lower()
            if full_table_name in relevant_tables:
                filtered_columns.append(c)

    # Filter joins (Strict: Only if BOTH sides are relevant)
    filtered_joins = []
    if metadata.joins:
        for j in metadata.joins:
            from_tab = f"{j.from_table_schema}.{j.from_table_name}".lower()
            to_tab = f"{j.to_table_schema}.{j.to_table_name}".lower()
            if from_tab in relevant_tables and to_tab in relevant_tables:
                filtered_joins.append(j)

    return RAGMetadata(
        tables=filtered_tables,
        columns=filtered_columns,
        joins=filtered_joins,
        tags=metadata.tags,
        examples=metadata.examples
    )


def _format_metadata(metadata: RAGMetadata | None) -> str:
    if metadata is None:
        return "No explicit metadata provided."
    parts: List[str] = []
    if metadata.tables:
        parts.append("Tables:")
        for t in metadata.tables:
            s_name = _get_schema_name(t)
            parts.append(f"- {s_name}.{t.name}: {t.description or ''}")
    if metadata.columns:
        parts.append("\nColumns:")
        for c in metadata.columns:
            parts.append(f"- {c.table_schema}.{c.table_name}.{c.name} ({c.data_type or 'unknown'})")
    return "\n".join(parts)


def _parse_month_to_num(month_name: str) -> str:
    month_map = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    return month_map.get(month_name.lower()[:3], '01')


def _repair_sql(sql: str, nl_question: str, filters: Dict[str, Any] | None = None) -> str:
    """Aggressive Regex pipeline to fix syntax errors."""
    sql = sql.replace("`", "")
    sql = re.sub(r'=\s*"([^"]*?)"', r"= '\1'", sql)
    sql = re.sub(r'IN\s*\(\s*"([^"]*?)"', r"IN ('\1'", sql)
    
    # Date/Time Normalization
    sql = re.sub(r"(?i)\bCURRENT_DATE\b", "GETDATE()", sql)
    sql = re.sub(r"(?i)\bCURRENT_TIMESTAMP\b", "GETDATE()", sql)
    sql = re.sub(r"(?i)\bNOW\(\)", "GETDATE()", sql)
    sql = re.sub(r"(?i)GETDATE\(\)\s*([+-])\s*interval\s*'(\d+)\s*days?'", r"DATEADD(DAY, \1\2, GETDATE())", sql)

    # Fix Syntax
    if "LIMIT" in sql.upper():
        match = re.search(r"LIMIT\s+(\d+)", sql, re.IGNORECASE)
        if match:
            limit = match.group(1)
            sql = re.sub(r"LIMIT\s+\d+", "", sql, flags=re.IGNORECASE)
            if "TOP" not in sql.upper():
                sql = re.sub(r"(?i)SELECT\s+", f"SELECT TOP {limit} ", sql, count=1)

    sql = re.sub(r"(?i)\s+NULLS\s+(LAST|FIRST)", "", sql)
    sql = sql.replace(" ilike ", " LIKE ").replace(" ILIKE ", " LIKE ")

    # Remove Conflicting Defaults
    if "FORMAT(DataCollectionDate, 'yyyy-MM') IN" in sql:
        sql = re.sub(r"(?i)AND\s+(\w+\.)?DataCollectionDate\s*>=\s*DATEADD\(.*?\)", "", sql)
        sql = re.sub(r"(?i)AND\s+(\w+\.)?DataCollectionDate\s*>=\s*GETDATE\(.*?\)", "", sql)
        sql = sql.replace("WHERE AND", "WHERE").replace("AND AND", "AND")

    # Remove Unwanted TOP 1
    ranking_keywords = ['top', 'highest', 'lowest', 'best', 'peak', 'limit']
    if not any(kw in nl_question.lower() for kw in ranking_keywords):
        sql = re.sub(r"(?i)SELECT\s+TOP\s+\d+\s+", "SELECT ", sql)

    # Inject Missing Grouping Columns
    if "GROUP BY FORMAT(DataCollectionDate, 'yyyy-MM')" in sql:
        if "FORMAT(DataCollectionDate, 'yyyy-MM')" not in sql.split("FROM")[0]:
            sql = re.sub(r"(?i)SELECT\s+(TOP\s+\d+\s+)?", r"SELECT \1FORMAT(DataCollectionDate, 'yyyy-MM') AS [Month], ", sql)

    # Remove Hallucinated Columns/Aliases from SELECT
    sql = re.sub(r",\s*(?<!\[)\b(Month|Year|Day)\b\s*,", ",", sql, flags=re.IGNORECASE)
    sql = re.sub(r",\s*(?<!\[)\b(Month|Year|Day)\b\s+FROM", " FROM", sql, flags=re.IGNORECASE)
    sql = re.sub(r"SELECT\s+(?<!\[)\b(Month|Year|Day)\b\s*,", "SELECT ", sql, flags=re.IGNORECASE)

    # Filter Injection
    if filters:
        for col, val in filters.items():
            if col not in sql:
                val_str = f"'{val}'" if isinstance(val, str) else str(val)
                cond = f"{col} = {val_str}"
                if "WHERE" in sql.upper():
                    sql = re.sub(r"(?i)WHERE\s+", f"WHERE {cond} AND ", sql)
                elif "GROUP BY" in sql.upper():
                    sql = sql.replace("GROUP BY", f"WHERE {cond} GROUP BY")
                else:
                    sql += f" WHERE {cond}"

    return sql.rstrip(";")


async def generate_sql(request: SQLGenRequest) -> SQLGenResponse:
    # 1. Intelligent Schema Filtering
    filtered_metadata = _filter_metadata_by_query(request.metadata, request.natural_language)
    metadata_block = _format_metadata(filtered_metadata)
    
    nl_text = request.natural_language
    nl_lower = nl_text.lower()

    # 2. Logic Extraction
    time_hint = ""
    all_years = re.findall(r"\b(20[2-3]\d)\b", nl_text)
    all_months = re.findall(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b", nl_text, re.IGNORECASE)
    is_today = re.search(r"\b(today)\b", nl_lower)
    last_x = re.search(r"last\s+(\d+)\s+months?\s+(?:of\s+)?(\d{4})", nl_lower)

    if is_today:
        time_hint = "FILTER RULE: Use `DataCollectionDate >= CAST(GETDATE() AS DATE)`."
    elif last_x:
        c, y = int(last_x.group(1)), last_x.group(2)
        time_hint = f"FILTER RULE: Last {c} months of {y}. Use: `YEAR(DataCollectionDate)={y} AND MONTH(DataCollectionDate) >= {12-c+1}`."
    elif all_months and all_years:
        targets = sorted([f"'{all_years[0]}-{_parse_month_to_num(m)}'" for m in set(all_months)])
        time_hint = f"FILTER RULE: User wants specific months: {', '.join(targets)}. Use EXACTLY: `FORMAT(DataCollectionDate, 'yyyy-MM') IN ({', '.join(targets)})`."
    elif all_years:
        time_hint = f"FILTER RULE: Use `YEAR(DataCollectionDate) IN ({', '.join(list(set(all_years)))})`."
    elif request.time_range:
        time_hint = f"FILTER RULE: Context hint is '{request.time_range}'."
    else:
        time_hint = "FILTER RULE: Default to last 7 days: `DataCollectionDate >= DATEADD(DAY, -7, GETDATE())`."

    grouping_rule = "GROUPING RULE: None."
    if "monthly" in nl_lower:
        grouping_rule = "GROUPING RULE: GROUP BY `FORMAT(DataCollectionDate, 'yyyy-MM')`. SELECT this as [Month]."
    elif "daily" in nl_lower:
        grouping_rule = "GROUPING RULE: GROUP BY `FORMAT(DataCollectionDate, 'yyyy-MM-dd')`. SELECT this as [Day]."
    elif "hourly" in nl_lower:
        grouping_rule = "GROUPING RULE: GROUP BY `FORMAT(DataCollectionDate, 'dd HH')`. SELECT this as [Hour]."

    agg_hint = "AGGREGATION: Use AVG(DataValue)."
    if any(x in nl_lower for x in ["sum", "total"]): agg_hint = "AGGREGATION: Use SUM(DataValue)."
    elif any(x in nl_lower for x in ["max", "peak"]): agg_hint = "AGGREGATION: Use MAX(DataValue)."

    filter_inst = f"MANDATORY FILTER: {json.dumps(request.filters)}" if request.filters else "MANDATORY FILTER: Filter by DeviceName if mentioned."

    prompt = f"""### Instructions
Convert the user's question into a valid T-SQL query.

HARD REQUIREMENTS:
- **Schema:** ONLY use columns from the provided Schema.
- **No Joins:** Do NOT join tables unless explicitly asked for multiple metrics (e.g. "CPU and Memory").
- **No Aliases:** Use FULL table names (e.g. `dbo.MemoryPerformance.DataValue`). Do NOT use aliases like `t1` or `mp`.
- **No CTEs:** Do NOT use `WITH` clauses. Use standard SELECT.
- **Structure:** SELECT list must match GROUP BY.
- **Syntax:** Use `TOP n`, `DATEADD`, `GETDATE()`. NO `interval`.

### Schema
{metadata_block}

### Question
{request.natural_language}

### Execution Plan
1. {time_hint}
2. {grouping_rule}
3. {agg_hint}
4. {filter_inst}

### Query
SELECT"""

    # 3. Execution
    try:
        raw = await ollama_client.generate(model=config.SQL_MODEL, prompt=prompt)
    except (ConnectError, TimeoutException) as e:
        return SQLGenResponse(generated_sql="", reasoning="AI Service Unavailable", warnings=[str(e)])

    sql = raw.strip()
    if "```" in sql:
        parts = sql.split("```")
        if len(parts) >= 2: sql = parts[1].replace("sql", "", 1).strip()

    if not sql.upper().startswith("SELECT"):
        sql = "SELECT " + sql

    # 4. Repair & Flatten
    final_sql = _repair_sql(sql, request.natural_language, request.filters)
    
    # Final Flatten
    final_sql = re.sub(r'\s+', ' ', final_sql).strip()

    return SQLGenResponse(
        generated_sql=final_sql,
        reasoning=None,
        warnings=[]
    )