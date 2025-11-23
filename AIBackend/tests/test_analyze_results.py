from fastapi.testclient import TestClient
from app.main import app
from app.core import ollama_client as ollama_module


client = TestClient(app)


def test_analyze_results_basic(monkeypatch):
    async def fake_generate(model: str, prompt: str, timeout=None) -> str:
        return "CPU utilization is high on SRV-01. Consider scaling or investigating that host."

    monkeypatch.setattr(
        ollama_module.ollama_client,
        "generate",
        fake_generate,
        raising=True,
    )

    rows = [
        {"DeviceName": "SRV-01", "AvgCpu": 92.5},
        {"DeviceName": "SRV-02", "AvgCpu": 55.2},
    ]

    payload = {
        "rows": rows,
        "columns": ["DeviceName", "AvgCpu"],
        "query": "Which servers have the highest CPU?",
        "sql": "SELECT DeviceName, AVG(DataValue) AS AvgCpu FROM AnalyticsDB.dbo.CpuPerformance GROUP BY DeviceName;",
        "metadata": None,
    }

    resp = client.post("/v1/analyze_results", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "analysis" in data
    assert "srv-01" in data["analysis"].lower()
