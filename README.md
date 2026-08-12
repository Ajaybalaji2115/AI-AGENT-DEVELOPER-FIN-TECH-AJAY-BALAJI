<div align="center">
  <h1>🤖 Ajay Agentic AI</h1>
  <p><b>Agentic AI Intelligence, Forged for Apple Inc. Financials</b></p>
  <p><i>Zero-Leakage Security • Deterministic Math • Deep Semantic Understanding</i></p>
</div>

<br/>

Ajay Agentic AI isn't just a chatbot—it is a **multi-tool autonomous agent** built from the ground up to query, calculate, and analyze Apple Inc.'s most sensitive financial data. It bridges the gap between unstructured PDF narratives and rigid Excel spreadsheets, all while being guarded by a mathematically strict security matrix.

---

## ⚡ The Core Pillars

| 🧠 **Agentic Brain** | 🛡️ **Ironclad Security** | 📈 **Deterministic Math** | 🔄 **Continuous Memory** |
| :--- | :--- | :--- | :--- |
| Dynamically selects between SQL queries, RAG search, or arithmetic based on your prompt. | 3 layers of security ensure unauthorized users (like a Junior Analyst) can never access restricted data (like Executive Comp). | AI doesn't do math. SphereFinance safely parses equations into an AST and computes them in pure Python. | It learns. Every correction you make is persisted to SQLite and injected into future reasoning. |

---

## 🛤️ The Journey of a Prompt

When you ask Ajay Agentic AI a question, it doesn't just guess an answer. It goes through a rigorous gauntlet:

1. 🚨 **The Interceptor (Pre-Query Guard):** Scans the raw English text. If a junior employee asks about restricted topics, the query dies here.
2. 🧰 **The Armory (Tool Selection):** The agent decides whether it needs the `SQL Tool` (for exact numbers), the `RAG Tool` (for reading PDFs), or the `Calculator Tool` (for ratios).
3. 🛂 **The Vault (Database Security):** Before any data leaves the storage layer, custom SQLite and ChromaDB guards verify the user's role against the exact row or vector they are trying to read.
4. 🎙️ **The Synthesizer:** Only authorized facts are handed to the LLM to write a natural, human-friendly response.

---

## 🧬 Inside the Vault (Repository Layout)

We keep things organized. Here is where the magic happens:

```text
e:\AZENTIO/
 ├── 📊 data/processed/     # The brains: financials.db & Chroma Vector Store
 ├── 🧠 understanding/      # The reflexes: Precomputed schemas, facts, and outlines
 ├── ⚙️ backend/            # The engine: Flask API, Agentic loop, RBAC logic
 ├── 🎨 frontend/           # The face: Beautiful, responsive web UI
 └── 🧪 test_system.py      # The proving grounds: Strict automated benchmark suite
```

---

## 🚦 Role-Based Access Control (RBAC)

Security isn't a suggestion; it's hardcoded at the database layer.

*   🟢 **PUBLIC** (Press Releases, Overviews) — Accessible to **Everyone**
*   🟡 **FINANCIAL** (Revenue, EPS, Balance Sheet) — Accessible to **Analyst, CTO, CEO**
*   🟠 **HEADCOUNT** (Employee count, HR metrics) — Accessible to **CTO, CEO**
*   🔴 **EXECUTIVE_COMPENSATION** (Tim Cook's Salary, RSUs) — Accessible to **CEO Only**

---

## 🚀 Liftoff: Running Ajay Agentic AI Locally

Want to spin up the agent on your own machine? Follow these exact steps:

### Step 1: Gear Up (Dependencies)
Make sure you have Python and Node.js installed, then grab the required libraries:
```bash
# Backend dependencies
pip install Flask flask-cors pandas openpyxl pdfplumber requests sentence-transformers chromadb reportlab python-dotenv

# Frontend dependencies
cd frontend-react
npm install
```

### Step 2: The Keys to the Kingdom (Configuration)
Create a `.env` file in the root folder and add your database configuration:
```ini
DB_ENGINE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=finagent_db
```

### Step 3: Feed the Machine (Ingestion)
We need to parse the raw PDFs and Excel files into our vector and SQL databases. Run these sequentially:
```bash
python download_data.py
python backend/setup_sqlite.py
python backend/ingestion.py
python backend/understanding.py
```

### Step 4: Awaken the Agent (Server Start)
Fire up both the backend and frontend servers:

**Terminal 1 (Backend):**
```bash
python -m backend.app
```

**Terminal 2 (Frontend):**
```bash
cd frontend-react
npm run dev
```
🎉 **Success!** Open your browser and navigate to the frontend URL (typically **[http://localhost:5173](http://localhost:5173)**) to interact with Ajay Agentic AI.

---

## 🏛️ System Architecture

Ajay Agentic AI follows a strict, modular architecture designed for security and intelligence:
- **Frontend Layer (React/Vite):** A dynamic, responsive interface offering interactive learning and secure access panels.
- **API & Routing (Flask):** The backend serves as the orchestration layer, connecting the user with the agentic loop.
- **Agentic Engine:** At the core lies a routing mechanism that decides whether to query unstructured data (RAG via ChromaDB), structured data (SQL), or perform deterministic computations.
- **Security & Data Layer (MySQL/SQLite + Vector DB):** Data access is strictly controlled via Role-Based Access Control (RBAC). Data retrieval is segregated so that sensitive documents are mathematically invisible to unauthorized roles.

---

## ✨ Creativity & Unique Innovations

1. **Deterministic AI Math:** Instead of relying on LLMs to perform arithmetic (which they frequently hallucinate), the system translates natural language queries into an Abstract Syntax Tree (AST) to compute verifiable mathematical answers natively in Python.
2. **Zero-Leakage Security Matrix:** Security isn't just an app-layer afterthought. Our system employs database-level guards and pre-query interceptors that proactively neutralize requests for restricted data before they ever hit the semantic engine.
3. **Continuous Feedback Loop:** The AI possesses an evolving memory. User corrections and domain-specific terminology are ingested, persisted, and injected into the agent's context, making it smarter with every interaction.

---

## 📈 Scaling to 100x & Solutions

**What happens if we scale to 100x?**
- **Vector Database Bottlenecks:** Local ChromaDB and SQLite might struggle with massive concurrent I/O operations and vector similarity searches across millions of chunks.
- **LLM API Rate Limits:** Relying on a single API key or local models can quickly exhaust rate limits or compute capacity when subjected to high-throughput requests.
- **Compute Overhead:** Performing AST evaluations and semantic understanding on large datasets simultaneously for thousands of users will spike CPU utilization, slowing response times.

**Solutions to Overcome:**
1. **Distributed Databases:** Migrate from SQLite/local ChromaDB to managed cloud vector stores (like Pinecone or Milvus) and scalable relational databases (like PostgreSQL on Amazon RDS).
2. **Load Balancing & Microservices:** Decouple the monolithic Flask backend into distinct microservices (Agent Routing, Query Execution, Document Ingestion). Use Kubernetes to auto-scale individual components based on traffic.
3. **Caching Layers:** Implement Redis or Memcached to store frequent query results, drastically reducing vector lookups and LLM calls for common questions like "What was Apple's Q3 revenue?".
4. **Model Pooling:** Implement round-robin routing across multiple LLM endpoints or deploy optimized open-source models (like Llama 3) via vLLM for high-throughput localized inference.

---

## 🧪 The Proving Grounds (Automated Testing)

We don't trust the LLM; we verify it. Run our comprehensive test suite to watch the system actively defend against prompt injections and data leaks:

```bash
python test_system.py
```

**What it tests:**
*   **Destruction Blocks:** Tries (and fails) to run `DROP TABLE` via SQL injection.
*   **Role Enforcement:** Ensures the CTO gets a hard `Access Denied` when asking for headcount.
*   **Math Sandbox:** Verifies that the AST calculator can do math, but throws errors if it tries to execute malicious Python code.
*   **Feedback Loops:** Submits a correction and proves the agent remembers it on the next query.

---

<div align="center">
  <p>Built for the future of secure, autonomous financial intelligence.</p>
</div>
