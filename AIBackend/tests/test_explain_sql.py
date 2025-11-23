from fastapi.testclient import TestClient
from app.main import app
from app.core import ollama_client as ollama_module


client = TestClient(app)


def test_explain_sql_basic(monkeypatch):
    async def fake_generate(model: str, prompt: str, timeout=None) -> str:
        return "This query selects the top 10 servers by average CPU utilization."

    monkeypatch.setattr(
        ollama_module.ollama_client,
        "generate",
        fake_generate,
        raising=True,
    )

    payload = {
        "sql": "SELECT TOP 10 DeviceName, AVG(DataValue) FROM AnalyticsDB.dbo.CpuPerformance GROUP BY DeviceName ORDER BY AVG(DataValue) DESC;",
        "dialect": "tsql",
    }

    resp = client.post("/v1/explain_sql", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "explanation" in data
    assert "top 10 servers" in data["explanation"].lower()
