import pymysql
import os
import numpy as np
from datetime import datetime

# DB_PATH is no longer used for MySQL
_model_cache = None

def get_embed_model():
    """Lazy loads sentence transformer model."""
    global _model_cache
    if _model_cache is None:
        from sentence_transformers import SentenceTransformer
        _model_cache = SentenceTransformer("all-MiniLM-L6-v2")
    return _model_cache

def load_feedback_from_db():
    """Retrieves all feedback rows from the MySQL database."""
    feedbacks = []
    try:
        conn = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "finagent_db")
        )
        cursor = conn.cursor()
        
        # Verify table exists
        cursor.execute("SHOW TABLES LIKE 'feedback'")
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
        print(f"Error loading feedback from MySQL: {e}")
    return feedbacks

def add_feedback(query, rating, correction=None):
    """
    Saves user feedback to the MySQL 'feedback' table.
    """
    try:
        conn = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "finagent_db")
        )
        cursor = conn.cursor()
        
        # Ensure feedback table is created
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                query VARCHAR(500) UNIQUE,
                rating VARCHAR(50),
                correction TEXT,
                timestamp VARCHAR(100)
            )
        """)
        
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        # Use REPLACE INTO for MySQL
        cursor.execute("""
            REPLACE INTO feedback (query, rating, correction, timestamp)
            VALUES (%s, %s, %s, %s)
        """, (query, rating, correction, timestamp))
        
        conn.commit()
        conn.close()
        print(f"[Feedback Saved to SQL]: Query: '{query}' (Rating: {rating}, Correction: {correction})")
    except Exception as e:
        print(f"Error saving feedback to MySQL: {e}")

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
