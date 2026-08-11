import pymysql
import os
import re
import ast
import operator

# Custom imports and dependencies
from backend.rbac import validate_sql_query, get_rag_rbac_filter

# Paths
# DB connection variables are loaded from the environment later
CHROMA_DB_PATH = os.path.join("data", "processed", "chroma_db")

# Global instances
_embed_model = None
_chroma_client = None

def get_embed_model():
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model

def get_chroma_collection():
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    try:
        return _chroma_client.get_collection(name="financial_data")
    except Exception as e:
        print(f"Error fetching Chroma collection: {e}")
        return None

# ==========================================
# TOOL 1: SQL TOOL
# ==========================================
def sql_tool(sql_query, user_role):
    """
    Executes a read-only SELECT SQL query on financials.db after checking RBAC guards.
    """
    print(f"[Tool: SQL] Running query '{sql_query}' for role '{user_role}'...")
    
    # 1. Enforce RBAC screening before SQL execution
    try:
        validate_sql_query(sql_query, user_role)
    except PermissionError as e:
        print(f"[SQL Tool Security Block]: {e}")
        return f"[SECURITY BLOCK] {str(e)}"
        
    # 2. Open DB in read-only mode if possible, execute SELECT
    try:
        conn = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "finagent_db")
        )
        cursor = conn.cursor()
        cursor.execute(sql_query)
        description = cursor.description
        if description is None:
            conn.close()
            return "Query executed successfully. (No output columns)"
            
        columns = [d[0] for d in description]
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            return "Query completed. No records matched."
            
        # Format output as a CSV table representation
        result = [", ".join(columns)]
        for row in rows:
            result.append(", ".join([str(val) for val in row]))
        
        # Source citation metadata formatted cleanly
        return "\n".join(result)
        
    except Exception as e:
        return f"[MySQL SQL Error] Failed to execute query: {e}"

# ==========================================
# TOOL 2: RAG TOOL
# ==========================================
def rag_tool(search_query, user_role):
    """
    Queries ChromaDB vector collection using pre-retrieval metadata filter.
    """
    print(f"[Tool: RAG] Searching vector store for '{search_query}' (Role: '{user_role}')...")
    
    collection = get_chroma_collection()
    if collection is None:
        return "[Error] Chroma collection not initialized. Run indexing first."
        
    try:
        # Embed search query
        model = get_embed_model()
        query_vector = model.encode(search_query).tolist()
        
        # Pre-retrieval metadata filter
        rbac_filter = get_rag_rbac_filter(user_role)
        
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=4,
            where=rbac_filter
        )
        
        chunks = []
        if results and results["documents"] and len(results["documents"][0]) > 0:
            for idx in range(len(results["documents"][0])):
                doc = results["documents"][0][idx]
                meta = results["metadatas"][0][idx]
                # Page citation details
                chunks.append(
                    f"Source: {meta['source_file']}\n"
                    f"Company: {meta.get('company', 'Apple')}\n"
                    f"Year: {meta.get('year', '2024')}\n"
                    f"Page: {meta.get('page_number', '1')}\n"
                    f"Excerpt: {doc.replace('Document: ' + meta['source_file'] + ' | Page: ' + str(meta['page_number']) + ' | Text: ', '')}"
                )
                
        if not chunks:
            return "RAG Search executed. No matching authorized text chunks found."
            
        return "\n\n---\n\n".join(chunks)
        
    except Exception as e:
        return f"[ChromaDB RAG Error] Search query failed: {e}"

# ==========================================
# TOOL 3: CALCULATOR TOOL (AST SAFE EVALUATOR)
# ==========================================
# Allowlist of arithmetic operators
SUPPORTED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos
}

def evaluate_ast_node(node):
    """Recursively evaluates AST nodes checking against the operator allowlist."""
    if isinstance(node, ast.Constant): # For modern Python versions (3.8+)
        if isinstance(node.value, (int, float)):
            return node.value
        raise TypeError(f"Unsupported constant type: {type(node.value)}")
    elif isinstance(node, ast.BinOp): # Binary operations (e.g. A + B)
        op_type = type(node.op)
        if op_type not in SUPPORTED_OPERATORS:
            raise TypeError(f"Unsupported binary operator: {op_type}")
        return SUPPORTED_OPERATORS[op_type](evaluate_ast_node(node.left), evaluate_ast_node(node.right))
    elif isinstance(node, ast.UnaryOp): # Unary operations (e.g. -A)
        op_type = type(node.op)
        if op_type not in SUPPORTED_OPERATORS:
            raise TypeError(f"Unsupported unary operator: {op_type}")
        return SUPPORTED_OPERATORS[op_type](evaluate_ast_node(node.operand))
    else:
        raise TypeError(f"Access Denied: Unsafe code construct detected ({type(node).__name__}). Only basic math equations are permitted.")

def calculator_tool(expression):
    """
    Evaluates mathematical expressions safely using Python AST node allowlisting.
    """
    print(f"[Tool: Calculator] Evaluating expression '{expression}'...")
    
    # Strip spaces
    expr_clean = expression.strip()
    if not expr_clean:
        return "[Calculator Error] Empty expression."
        
    try:
        # Parse expression to an AST tree in 'eval' mode
        tree = ast.parse(expr_clean, mode='eval')
        
        # Evaluate root node
        val = evaluate_ast_node(tree.body)
        return str(val)
        
    except Exception as e:
        return f"[Calculator Error] {str(e)}"
