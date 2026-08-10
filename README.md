<div align="center">
  <h1>🍏 SphereFinance</h1>
  <p><b>Agentic AI Intelligence, Forged for Apple Inc. Financials</b></p>
  <p><i>Zero-Leakage Security • Deterministic Math • Deep Semantic Understanding</i></p>
</div>

<br/>

SphereFinance isn't just a chatbot—it is a **multi-tool autonomous agent** built from the ground up to query, calculate, and analyze Apple Inc.'s most sensitive financial data. It bridges the gap between unstructured PDF narratives and rigid Excel spreadsheets, all while being guarded by a mathematically strict security matrix.

---

## ⚡ The Core Pillars

| 🧠 **Agentic Brain** | 🛡️ **Ironclad Security** | 📈 **Deterministic Math** | 🔄 **Continuous Memory** |
| :--- | :--- | :--- | :--- |
| Dynamically selects between SQL queries, RAG search, or arithmetic based on your prompt. | 3 layers of security ensure unauthorized users (like a Junior Analyst) can never access restricted data (like Executive Comp). | AI doesn't do math. SphereFinance safely parses equations into an AST and computes them in pure Python. | It learns. Every correction you make is persisted to SQLite and injected into future reasoning. |

---

## 🛤️ The Journey of a Prompt

When you ask SphereFinance a question, it doesn't just guess an answer. It goes through a rigorous gauntlet:

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

## 🚀 Liftoff: Running SphereFinance Locally

Want to spin up the agent on your own machine? Follow these exact steps:

### Step 1: Gear Up (Dependencies)
Make sure you have Python installed, then grab the required libraries:
```bash
pip install Flask flask-cors pandas openpyxl pdfplumber requests sentence-transformers chromadb reportlab python-dotenv
```

### Step 2: The Keys to the Kingdom (Configuration)
Create a `.env` file in the root folder. Paste your Gemini API key inside:
```ini
GEMINI_API_KEY=your_super_secret_google_key_here
```
*(No key? No problem. The system will automatically fall back to an offline Agent Simulation mode!)*

### Step 3: Feed the Machine (Ingestion)
We need to parse the raw PDFs and Excel files into our vector and SQL databases. Run these sequentially:
```bash
python download_data.py
python backend/setup_sqlite.py
python backend/ingestion.py
python backend/understanding.py
```

### Step 4: Awaken the Agent (Server Start)
Fire up the backend Flask server:
```bash
python -m backend.app
```
🎉 **Success!** Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** to interact with SphereFinance.

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
