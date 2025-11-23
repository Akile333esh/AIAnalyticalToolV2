from fastapi.testclient import TestClient
from app.main import app
from app.core import ollama_client as ollama_module


client = TestClient(app)


def test_generate_sql_basic(monkeypatch):
    async def fake_generate(model: str, prompt: str, timeout=None) -> str:
        # pretend the LLM returned a valid T-SQL
        return "SELECT TOP 10 * FROM AnalyticsDB.dbo.CpuPerformance;"

    # Patch the Ollama client's generate method
    monkeypatch.setattr(
        ollama_module.ollama_client,
        "generate",
        fake_generate,
        raising=True,
    )

    payload = {
        "natural_language": "Show top 10 servers by CPU",
        "time_range": "last_7_days",
        "metric_type": "cpu",
        "filters": {"min_avg_cpu": 80},
        "metadata": None,
    }

    resp = client.post("/v1/generate_sql", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "generated_sql" in data
    assert "SELECT" in data["generated_sql"].upper()
    assert "CpuPerformance".lower() in data["generated_sql"].lower()
