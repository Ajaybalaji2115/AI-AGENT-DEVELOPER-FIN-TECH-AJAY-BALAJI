import re

# Define classification levels
PUBLIC = "PUBLIC"
INTERNAL_OPERATIONS = "INTERNAL_OPERATIONS"
CONFIDENTIAL_HR = "CONFIDENTIAL_HR"

# Define permission mapping
ROLE_PERMISSIONS = {
    "CEO": [PUBLIC, INTERNAL_OPERATIONS, CONFIDENTIAL_HR],
    "CTO": [PUBLIC, INTERNAL_OPERATIONS],
    "Analyst": [PUBLIC]
}

# Restricted keywords to block indirect access leakages
RESTRICTED_HR_KEYWORDS = ["compensation", "salary", "salaries", "payroll", "wage", "wages", "pay", "bonus", "bonuses"]
RESTRICTED_HEADCOUNT_KEYWORDS = ["headcount", "employee", "employees", "staff", "workforce", "headcounts"]
RESTRICTED_OPS_KEYWORDS = ["retail store", "stores count", "operational stats", "stores", "store count"]

def check_indirect_access_in_query(query_text, user_role):
    """
    Scans raw user queries for restricted concepts.
    Prevents indirect access leakage (e.g., CTO asking 'calculate revenue per employee')
    by raising a PermissionError before tool execution.
    """
    q_lower = query_text.lower()
    
    # CEO has full authorization
    if user_role == "CEO":
        return True
        
    # CTO is restricted from HR/Compensation AND Headcount data
    if user_role == "CTO":
        # Check HR/Comp keywords
        for kw in RESTRICTED_HR_KEYWORDS:
            if re.search(r'\b' + kw + r'\b', q_lower):
                raise PermissionError("Access Denied: The requested calculation or question refers to compensation data, which is restricted for your role.")
        # Check Headcount keywords
        for kw in RESTRICTED_HEADCOUNT_KEYWORDS:
            if re.search(r'\b' + kw + r'\b', q_lower):
                raise PermissionError("Access Denied: The requested calculation or question refers to headcount data, which is restricted for your role.")
                
    # Analyst is restricted from HR/Compensation, Headcount, AND internal Operations statistics
    if user_role == "Analyst":
        # Check HR/Comp keywords
        for kw in RESTRICTED_HR_KEYWORDS:
            if re.search(r'\b' + kw + r'\b', q_lower):
                raise PermissionError("Access Denied: The requested question refers to compensation data, which is restricted for your role.")
        # Check Headcount keywords
        for kw in RESTRICTED_HEADCOUNT_KEYWORDS:
            if re.search(r'\b' + kw + r'\b', q_lower):
                raise PermissionError("Access Denied: The requested question refers to headcount data, which is restricted for your role.")
        # Check Ops keywords
        for kw in RESTRICTED_OPS_KEYWORDS:
            if re.search(r'\b' + kw + r'\b', q_lower):
                raise PermissionError("Access Denied: The requested question refers to internal store operations, which is restricted for your role.")
                
    return True

def get_allowed_classifications(user_role):
    normalized_role = user_role if user_role in ROLE_PERMISSIONS else "Analyst"
    return ROLE_PERMISSIONS[normalized_role]

def get_rag_rbac_filter(user_role):
    """
    Creates a pre-retrieval metadata filter dictionary for Chroma DB.
    Ensures restricted items never enter the RAG retrieval pipeline.
    """
    allowed_classes = get_allowed_classifications(user_role)
    return {
        "classification": {
            "$in": allowed_classes
        }
    }

def validate_sql_query(sql_query, user_role):
    """
    Validates SQL query parameters before SQLite execution.
    Enforces read-only SELECT rules, checks table allowlists, and stops
    CTO from pulling headcount rows from operational tables.
    """
    query_clean = sql_query.strip().lower()
    
    # 1. Enforce SELECT queries only
    modifying_keywords = ["insert", "update", "delete", "drop", "create", "alter", "replace", "truncate", "rename", "attach", "exec"]
    for keyword in modifying_keywords:
        if re.search(r'\b' + keyword + r'\b', query_clean):
            raise PermissionError(f"Access Denied: Modifying statement '{keyword}' is prohibited. Only SELECT queries are permitted.")
            
    # 2. Table-level RBAC check
    allowed_classes = get_allowed_classifications(user_role)
    
    # Table synthetic_hr_compensation requires CONFIDENTIAL_HR
    if "synthetic_hr_compensation" in query_clean:
        if CONFIDENTIAL_HR not in allowed_classes:
            raise PermissionError(f"Access Denied: Role '{user_role}' is not authorized to query table 'synthetic_hr_compensation'.")
            
    # Table operations requires INTERNAL_OPERATIONS
    if "operations" in query_clean:
        if INTERNAL_OPERATIONS not in allowed_classes:
            raise PermissionError(f"Access Denied: Role '{user_role}' is not authorized to query table 'operations'.")
        
        # Table content check: CTO has access to 'operations' (for store count)
        # but headcount rows are restricted! We block queries attempting to select employee rows.
        if user_role == "CTO":
            if "employee" in query_clean or "headcount" in query_clean or "staff" in query_clean:
                raise PermissionError("Access Denied: Role 'CTO' is restricted from querying employee headcount metrics in operations.")
                
    return True
