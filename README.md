AI Analytical Tool V2
AI Analytical Tool V2 is a modular, AI-powered platform designed for capacity analytics, SQL generation, and automated data insights. It leverages a microservices architecture to provide a seamless interface for querying databases using natural language, visualizing results, and generating detailed reports.

🚀 Architecture Overview
The system consists of four main components:

Frontend (Next.js): A responsive web interface for users to view dashboards, generate reports, and interact with the AI.

Core Backend (Node.js/Express): The central API gateway handling authentication, user management, and job orchestration.

AI Backend (Python/FastAPI): A specialized service leveraging LLMs (via Ollama) for SQL generation, query explanation, and result analysis.

Worker Service (Node.js/BullMQ): A background worker for processing heavy asynchronous jobs (e.g., executing complex queries, generating reports) to ensure UI responsiveness.

🛠️ Tech Stack
Frontend: Next.js 14, React, Tailwind CSS, TypeScript.

Core Backend: Node.js, Express, TypeScript, MS SQL Server (mssql), Redis (bullmq).

AI Backend: Python 3.10+, FastAPI, Ollama (Llama 3, SQLCoder).

Worker: Node.js, BullMQ, Redis.

Infrastructure: Redis (Queue/Cache), MS SQL Server (Data storage).

📋 Prerequisites
Ensure you have the following installed:

Node.js (v18+ recommended)

Python (v3.10+)

Redis (running locally or accessible)

Ollama (running locally with required models)

MS SQL Server

⚙️ Installation & Setup
1. Database & Infrastructure
Ensure your Redis and MS SQL Server instances are running.

Ollama: Pull the necessary models:

Bash

ollama pull llama3.1:8b
ollama pull llama3.1:8b
2. Core Backend (Node.js)
Handles API requests and job dispatching.

Bash

cd CoreBackend
npm install
Configuration: Create a .env file in CoreBackend/ based on src/config/env.ts:

Code snippet

PORT=4000
# Database Configs
MASTER_DB_HOST=localhost
MASTER_DB_USER=sa
MASTER_DB_PASSWORD=your_password
MASTER_DB_NAME=MasterDB
ANALYTICS_DB_HOST=localhost
... (add other DB creds)

# Security
JWT_SECRET=your_super_secret
CORS_ORIGIN=http://localhost:3000

# Infrastructure
REDIS_HOST=localhost
AI_BACKEND_URL=http://localhost:8001
Run:

Bash

npm run dev
3. AI Backend (Python)
Provides LLM services.

Bash

cd AIBackend
pip install -r requirements.txt
Configuration: Create a .env file in AIBackend/:

Code snippet

PORT=8001
OLLAMA_BASE_URL=http://localhost:11434
SQL_MODEL=llama3.1:8b
EXPLAIN_MODEL=llama3.1:8b
ANALYZE_MODEL=llama3.1:8b
Run:

Bash

uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
4. Worker Service (Node.js)
Processes background jobs.

Bash

cd worker
npm install
Configuration: Create a .env file similar to CoreBackend (needs DB and Redis access).

Run:

Bash

npm run dev
5. Frontend (Next.js)
User interface.

Bash

cd frontend
npm install
Configuration: Create a .env.local file:

Code snippet

NEXT_PUBLIC_API_URL=http://localhost:4000
Run:

Bash

npm run dev
🔑 Key Features
Natural Language to SQL: Users can ask questions in plain English, and the AI Backend generates optimized SQL queries.

Query Explanation: Automatically explains complex SQL queries in human-readable format.

Automated Analysis: The AI analyzes query results to provide insights and summaries.

Dashboarding: Dynamic dashboard creation with customizable widgets.

Reporting: Generate and export detailed reports (PDF/Excel).

Role-Based Access: Secure authentication and admin management.

🧪 Testing
Core Backend: Run npm test to execute Jest tests.

AI Backend: Run pytest to execute Python tests.
