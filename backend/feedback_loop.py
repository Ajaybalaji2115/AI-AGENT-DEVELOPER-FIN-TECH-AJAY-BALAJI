import os
import sqlite3
import numpy as np
from datetime import datetime

DB_PATH = os.path.join("data", "processed", "financials.db")
_model_cache = None

def get_embed_model():
    """Lazy loads sentence transformer model."""
    global _model_cache
    if _model_cache is None:
        from sentence_transformers import SentenceTransformer
        _model_cache = SentenceTransformer("all-MiniLM-L6-v2")
    return _model_cache

def load_feedback_from_db():
    """Retrieves all feedback rows from the SQLite database."""
    if not os.path.exists(DB_PATH):
        return []
    
    feedbacks = []
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Verify table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'")
        if not cursor.fetchone():
            conn.close()
            return []
            
        cursor.execute("SELECT query, rating, correction, timestamp FROM feedback")
        rows = cursor.fetchall()
        for r in rows:
            feedbacks.append({
                "query": r[0],
                "rating": r[1],
                "correction": r[2],
                "timestamp": r[3]
            })
        conn.close()
    except Exception as e:
        print(f"Error loading feedback from SQLite: {e}")
    return feedbacks

def add_feedback(query, rating, correction=None):
    """
    Saves user feedback to the SQLite 'feedback' table.
    """
    if not os.path.exists(DB_PATH):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Ensure feedback table is created
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT UNIQUE,
                rating TEXT,
                correction TEXT,
                timestamp TEXT
            )
        """)
        
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        # Use INSERT OR REPLACE to overwrite feedback for the same query
        cursor.execute("""
            INSERT OR REPLACE INTO feedback (query, rating, correction, timestamp)
            VALUES (?, ?, ?, ?)
        """, (query, rating, correction, timestamp))
        
        conn.commit()
        conn.close()
        print(f"[Feedback Saved to SQL]: Query: '{query}' (Rating: {rating}, Correction: {correction})")
    except Exception as e:
        print(f"Error saving feedback to SQLite: {e}")

def get_relevant_correction(query, threshold=0.75):
    """
    Performs semantic search on SQLite feedback table using local embeddings.
    If a matched query with rating 'down' is found, returns it.
    """
    feedback_list = load_feedback_from_db()
    corrections = [f for f in feedback_list if f.get("correction") and f.get("rating") == "down"]
    
    if not corrections:
        return None, 0.0
        
    try:
        model = get_embed_model()
        past_queries = [c["query"] for c in corrections]
        
        query_emb = model.encode(query, convert_to_tensor=True)
        past_embs = model.encode(past_queries, convert_to_tensor=True)
        
        import torch
        cos_scores = torch.nn.functional.cosine_similarity(query_emb.unsqueeze(0), past_embs, dim=1)
        cos_scores = cos_scores.cpu().numpy()
        
        best_idx = np.argmax(cos_scores)
        best_score = cos_scores[best_idx]
        
        if best_score >= threshold:
            matched_correction = corrections[best_idx]
            print(f"[Feedback Memory Hit] Query: '{matched_correction['query']}' (Sim: {best_score:.2f}) -> Correction: '{matched_correction['correction']}'")
            return matched_correction, float(best_score)
            
    except Exception as e:
        print(f"Error querying semantic feedback SQLite records: {e}")
        # Keyword overlap fallback
        query_words = set(query.lower().split())
        for c in corrections:
            overlap = len(query_words.intersection(set(c["query"].lower().split())))
            score = overlap / max(len(query_words), 1)
            if score >= 0.5:
                return c, score
                
    return None, 0.0

# Function mapping for backward compatibility if needed
def load_feedback():
    return load_feedback_from_db()
