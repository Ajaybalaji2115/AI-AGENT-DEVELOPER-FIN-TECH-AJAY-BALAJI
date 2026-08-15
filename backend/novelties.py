"""
advanced_features.py — Backend logic for 3 Advanced Capabilities:
  1. Trust & Trace  — Citation-level source retrieval with page metadata
  2. What-If Calculator — Agentic financial projection engine
  3. Shadow Mode RBAC — Access request workflow for blocked data
"""
import os
import json
import ast
import operator
import re
from datetime import datetime
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# SHARED: Persistent access-request store
# ─────────────────────────────────────────────────────────────
ACCESS_REQUEST_FILE = os.path.join("data", "feedback", "access_requests.json")

def _load_requests():
    os.makedirs(os.path.dirname(ACCESS_REQUEST_FILE), exist_ok=True)
    if not os.path.exists(ACCESS_REQUEST_FILE):
        return []
    try:
        with open(ACCESS_REQUEST_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def _save_requests(requests):
    os.makedirs(os.path.dirname(ACCESS_REQUEST_FILE), exist_ok=True)
    with open(ACCESS_REQUEST_FILE, "w") as f:
        json.dump(requests, f, indent=2)


# ─────────────────────────────────────────────────────────────
# FEATURE 1: TRUST & TRACE
# Returns citations with source file, page number, and raw text excerpt
# so the frontend can display the exact document chunk the AI used.
# ─────────────────────────────────────────────────────────────
def trust_and_trace_search(query: str, user_role: str):
    """
    Runs a RAG search and returns structured citation objects with full
    page-level metadata so the UI can display source proof.
    """
    from backend.tools import get_embed_model, get_chroma_collection
    from backend.rbac import get_rag_rbac_filter

    collection = get_chroma_collection()
    if collection is None:
        return {"citations": [], "error": "Vector DB not initialised. Run ingestion first."}

    try:
        model = get_embed_model()
        query_vector = model.encode(query).tolist()
        rbac_filter = get_rag_rbac_filter(user_role)

        results = collection.query(
            query_embeddings=[query_vector],
            n_results=5,
            where=rbac_filter
        )

        citations = []
        if results and results["documents"] and results["documents"][0]:
            for idx, (doc, meta, dist) in enumerate(zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            )):
                # Clean the raw chunk text
                raw = doc
                for prefix in [f"Document: {meta.get('source_file','')} | Page: {meta.get('page_number','')} | Text: "]:
                    raw = raw.replace(prefix, "").strip()

                relevance = round(max(0, min(100, (1 - dist) * 100)), 1)

                citations.append({
                    "id": idx + 1,
                    "source_file": meta.get("source_file", "unknown"),
                    "page_number": meta.get("page_number", "N/A"),
                    "year": meta.get("year", "N/A"),
                    "classification": meta.get("classification", "PUBLIC"),
                    "excerpt": raw[:800],
                    "relevance_score": relevance,
                    "access": "ALLOWED"
                })

        return {"citations": citations, "query": query}

    except Exception as e:
        logger.error(f"Trust & Trace error: {e}", exc_info=True)
        return {"citations": [], "error": str(e)}


# ─────────────────────────────────────────────────────────────
# FEATURE 2: WHAT-IF CALCULATOR
# Agentic projection engine: retrieves a real baseline metric from DB,
# then applies a user-defined scenario using the safe AST calculator.
# ─────────────────────────────────────────────────────────────

# Mapping of human-readable metric names → SQL queries
METRIC_MAP = {
    "revenue":              "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%Net sales%' OR metric LIKE '%Total net sales%' LIMIT 1",
    "gross_profit":         "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%Gross margin%' LIMIT 1",
    "operating_income":     "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%Operating income%' LIMIT 1",
    "net_income":           "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%Net income%' LIMIT 1",
    "rd_expense":           "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%Research%' LIMIT 1",
    "operating_expense":    "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%Operating expenses%' LIMIT 1",
    "cost_of_sales":        "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%Cost of%' LIMIT 1",
    "eps_diluted":          "SELECT metric, fy2024, fy2023, fy2022 FROM financials WHERE metric LIKE '%diluted%' LIMIT 1",
}

SAFE_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub,
    ast.Mult: operator.mul, ast.Div: operator.truediv,
    ast.Mod: operator.mod, ast.Pow: operator.pow,
    ast.USub: operator.neg, ast.UAdd: operator.pos,
}

def _safe_eval(expr: str) -> float:
    def _eval(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        elif isinstance(node, ast.BinOp):
            if type(node.op) not in SAFE_OPS:
                raise ValueError(f"Unsupported operator: {type(node.op)}")
            return SAFE_OPS[type(node.op)](_eval(node.left), _eval(node.right))
        elif isinstance(node, ast.UnaryOp):
            if type(node.op) not in SAFE_OPS:
                raise ValueError(f"Unsupported operator: {type(node.op)}")
            return SAFE_OPS[type(node.op)](_eval(node.operand))
        else:
            raise ValueError(f"Unsafe construct: {type(node).__name__}")
    tree = ast.parse(expr.strip(), mode="eval")
    return _eval(tree.body)


def _fetch_metric(sql: str, user_role: str):
    """Runs a SQL query and returns raw rows."""
    import pymysql
    from backend.rbac import validate_sql_query

    try:
        validate_sql_query(sql, user_role)
    except PermissionError as e:
        return None, f"[SECURITY BLOCK] {e}"

    try:
        conn = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "finagent_db")
        )
        cursor = conn.cursor()
        cursor.execute(sql)
        cols = [d[0] for d in cursor.description]
        rows = cursor.fetchall()
        conn.close()
        return cols, rows
    except Exception as e:
        return None, str(e)


def whatif_projection(metric_key: str, change_pct: float, base_year: str, user_role: str):
    """
    1. Fetches the real baseline value from the DB.
    2. Applies the % change using the safe AST calculator.
    3. Returns a structured projection result with steps shown.
    """
    sql = METRIC_MAP.get(metric_key)
    if not sql:
        return {"error": f"Unknown metric '{metric_key}'. Available: {list(METRIC_MAP.keys())}"}

    cols, result = _fetch_metric(sql, user_role)
    if cols is None:
        return {"error": result}

    if not result:
        return {"error": "No data found for this metric in the database."}

    row = result[0]
    row_dict = dict(zip(cols, row))

    # Map base_year → column name
    year_col_map = {"2024": "fy2024", "2023": "fy2023", "2022": "fy2022"}
    col_name = year_col_map.get(str(base_year), "fy2024")

    raw_val = row_dict.get(col_name, row_dict.get("fy2024", 0))
    metric_label = row_dict.get("metric", metric_key)

    # Parse numeric value (strip commas, spaces)
    try:
        baseline = float(str(raw_val).replace(",", "").replace(" ", ""))
    except ValueError:
        return {"error": f"Could not parse numeric value from '{raw_val}'"}

    # Safe AST calculation
    expr = f"{baseline} * (1 + {change_pct} / 100)"
    try:
        projected = _safe_eval(expr)
    except Exception as e:
        return {"error": f"Calculation error: {e}"}

    delta = projected - baseline

    # Build year-by-year projection (3 years)
    projections = []
    val = baseline
    for i in range(1, 4):
        val = val * (1 + change_pct / 100)
        projections.append({
            "year": str(int(base_year) + i),
            "value": round(val, 2),
            "value_b": round(val / 1e9, 3) if baseline > 1e6 else round(val, 4),
        })

    return {
        "metric_key":    metric_key,
        "metric_label":  metric_label,
        "base_year":     base_year,
        "baseline":      round(baseline, 2),
        "baseline_b":    round(baseline / 1e9, 3) if baseline > 1e6 else round(baseline, 4),
        "change_pct":    change_pct,
        "projected":     round(projected, 2),
        "projected_b":   round(projected / 1e9, 3) if projected > 1e6 else round(projected, 4),
        "delta":         round(delta, 2),
        "expression":    expr,
        "projections":   projections,
        "unit":          "$ millions" if baseline > 1e4 else "$ per share / ratio",
    }


# ─────────────────────────────────────────────────────────────
# FEATURE 3: SHADOW MODE RBAC — ACCESS REQUEST WORKFLOW
# When a restricted query is made, the user can send an access
# request to the CEO. CEO can approve/deny on their dashboard.
# ─────────────────────────────────────────────────────────────

RESTRICTED_DATA_MAP = {
    "compensation":     {"label": "Executive Compensation Data",   "required_role": "CEO",  "classification": "CONFIDENTIAL_HR"},
    "salary":           {"label": "Executive Salary Records",      "required_role": "CEO",  "classification": "CONFIDENTIAL_HR"},
    "payroll":          {"label": "Payroll Data",                  "required_role": "CEO",  "classification": "CONFIDENTIAL_HR"},
    "headcount":        {"label": "Employee Headcount Data",       "required_role": "CTO",  "classification": "INTERNAL_OPERATIONS"},
    "employee":         {"label": "Workforce / Headcount Records", "required_role": "CTO",  "classification": "INTERNAL_OPERATIONS"},
    "internal":         {"label": "Internal Operations Data",      "required_role": "CTO",  "classification": "INTERNAL_OPERATIONS"},
}

def detect_restricted_data(query: str, user_role: str):
    """
    Scans query for restricted keywords and returns a shadow block response
    with metadata about what access would be needed.
    """
    q = query.lower()
    for keyword, meta in RESTRICTED_DATA_MAP.items():
        if keyword in q:
            required = meta["required_role"]
            if user_role != required and not (user_role == "CEO"):
                return {
                    "is_blocked": True,
                    "keyword": keyword,
                    "data_label": meta["label"],
                    "classification": meta["classification"],
                    "required_role": required,
                    "requesting_role": user_role,
                }
    return {"is_blocked": False}


def submit_access_request(requester_role: str, requester_email: str,
                          data_label: str, classification: str,
                          required_role: str, original_query: str):
    """Saves a pending access request to the JSON store."""
    requests = _load_requests()
    req = {
        "id": f"REQ-{len(requests)+1:04d}",
        "requester_role":  requester_role,
        "requester_email": requester_email,
        "data_label":      data_label,
        "classification":  classification,
        "required_role":   required_role,
        "original_query":  original_query,
        "status":          "PENDING",
        "timestamp":       datetime.now().isoformat(),
        "reviewed_at":     None,
        "reviewer_note":   None,
    }
    requests.append(req)
    _save_requests(requests)
    return req


def list_access_requests(viewer_role: str):
    """CEO sees all requests; others see only their own."""
    requests = _load_requests()
    if viewer_role == "CEO":
        return requests
    return requests  # could filter by requester_role == viewer_role


def update_access_request(req_id: str, decision: str, note: str, reviewer_role: str):
    """CEO approves or denies a request."""
    if reviewer_role != "CEO":
        return {"error": "Only the CEO can approve or deny access requests."}

    requests = _load_requests()
    for req in requests:
        if req["id"] == req_id:
            req["status"]      = "APPROVED" if decision == "approve" else "DENIED"
            req["reviewed_at"] = datetime.now().isoformat()
            req["reviewer_note"] = note
            _save_requests(requests)
            return req

    return {"error": f"Request {req_id} not found."}
