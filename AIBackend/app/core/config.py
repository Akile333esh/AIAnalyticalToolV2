import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    SQL_MODEL: str = os.getenv("SQL_MODEL", "sqlcoder:7b")
    EXPLAIN_MODEL: str = os.getenv("EXPLAIN_MODEL", "llama3.1:8b")
    ANALYZE_MODEL: str = os.getenv("ANALYZE_MODEL", "llama3.1:8b")
    CORE_METADATA_URL: str | None = os.getenv("CORE_METADATA_URL", None)
    PORT: int = int(os.getenv("PORT", "8001"))
    AI_REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "60"))

config = Config()
