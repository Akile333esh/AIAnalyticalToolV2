from __future__ import annotations

import textwrap
from typing import List

from app.core.config import config
from app.core.ollama_client import ollama_client


async def explain_sql(sql: str) -> str:
    """
    Use llama3.1 to explain a SQL query in plain English.
    """
    system_instructions = textwrap.dedent(
        """
        You are an expert SQL Server database engineer.
        Explain the following SQL query in clear, concise plain English.

        Requirements:
        - Describe what the query does overall.
        - Mention key filters, joins, and aggregations.
        - Mention important ORDER BY / TOP behavior.
        - Avoid excessive technical jargon.
        - Do NOT restate the entire SQL.
        """
    ).strip()

    prompt = system_instructions + "\n\nSQL query:\n" + sql.strip()

    explanation = await ollama_client.generate(
        model=config.EXPLAIN_MODEL,
        prompt=prompt,
    )

    return explanation.strip()
