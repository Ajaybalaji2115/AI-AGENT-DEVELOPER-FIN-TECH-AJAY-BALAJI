import os
import sys
import threading
import json

# Reconfigure stdout/stderr encoding to prevent Windows cp1252 crash with emojis
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Import our backend modules
from backend.agent import query_financial_assistant
from backend.feedback_loop import add_feedback, load_feedback
from backend.ingestion import ingest_all_raw_files
from backend.setup_mysql import setup_database
from backend.understanding import run_understanding_pipeline

# Initialize Flask app
app = Flask(__name__, static_folder=os.path.join("..", "frontend"), static_url_path="")
CORS(app)

# Lock for ingestion thread safety
ingestion_lock = threading.Lock()
ingestion_status = {"status": "idle", "message": "System ready"}

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/login')
def serve_login():
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/api/query', methods=['POST'])
def handle_query():
    data = request.get_json() or {}
    query = data.get("query", "").strip()
    role = data.get("role", "Analyst").strip()
    history = data.get("history", [])
    
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
        
    try:
        response = query_financial_assistant(query, role, history)
        return jsonify(response)
    except Exception as e:
        logger.error(f"Error handling query: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/feedback', methods=['POST'])
def handle_feedback():
    data = request.get_json() or {}
    query = data.get("query", "").strip()
    rating = data.get("rating", "").strip()
    correction = data.get("correction", "").strip()
    
    if not query or not rating:
        return jsonify({"error": "Query and rating are required"}), 400
        
    try:
        add_feedback(query, rating, correction if correction else None)
        return jsonify({"status": "success", "message": "Feedback submitted successfully"})
    except Exception as e:
        logger.error(f"Error handling feedback: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/status', methods=['GET'])
def handle_status():
    raw_dir = os.path.join("data", "raw")
    processed_dir = os.path.join("data", "processed")
    understanding_dir = "understanding"
    
    raw_files = []
    if os.path.exists(raw_dir):
        for f in os.listdir(raw_dir):
            if f.endswith(('.pdf', '.xlsx')):
                size = os.path.getsize(os.path.join(raw_dir, f))
                if "synthetic" in f.lower() or "hr" in f.lower():
                    classification = "CONFIDENTIAL_HR"
                elif "internal" in f.lower() or "operations" in f.lower():
                    classification = "INTERNAL_OPERATIONS"
                else:
                    classification = "PUBLIC"
                raw_files.append({"filename": f, "size_kb": round(size/1024, 1), "classification": classification})
                
    # Load summaries from understanding directory
    summaries = {}
    summaries_file = os.path.join(understanding_dir, "summaries.json")
    if os.path.exists(summaries_file):
        try:
            with open(summaries_file, "r") as sf:
                summaries = json.load(sf)
        except:
            pass
            
    # Load feedback count
    feedbacks = load_feedback()
    
    # Check if vector DB initialized
    db_exists = os.path.exists(os.path.join(processed_dir, "chroma_db"))
    
    # Check if LLM API key configured
    api_key_configured = bool(os.getenv("GEMINI_API_KEY"))
    
    import pymysql
    try:
        conn = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "finagent_db")
        )
        conn.close()
        mysql_connected = True
    except:
        mysql_connected = False
        
    return jsonify({
        "files": raw_files,
        "summaries": summaries,
        "feedback_count": len(feedbacks),
        "vector_db_initialized": db_exists,
        "api_key_configured": api_key_configured,
        "mysql_connected": mysql_connected,
        "ingestion_state": ingestion_status
    })

def async_ingestion():
    global ingestion_status
    with ingestion_lock:
        ingestion_status = {"status": "running", "message": "Processing spreadsheets and RAG files..."}
        try:
            # 1. Download & generate datasets
            import download_data
            download_data.main()
            
            # 2. SQLite Ingest
            setup_database()
            
            # 3. PDF Ingest
            ingest_all_raw_files(os.path.join("data", "raw"), os.path.join("data", "processed"))
            
            # 4. Vector DB Indexing & Understanding layer generation
            run_understanding_pipeline()
            
            ingestion_status = {"status": "success", "message": "Data ingestion and structured indexing completed successfully!"}
        except Exception as e:
            ingestion_status = {"status": "error", "message": f"Ingestion failed: {str(e)}"}

@app.route('/api/ingest', methods=['POST'])
def trigger_ingest():
    global ingestion_status
    if ingestion_lock.locked():
        return jsonify({"error": "Ingestion pipeline is already running"}), 429
        
    threading.Thread(target=async_ingestion).start()
    return jsonify({"status": "running", "message": "Ingestion triggered in the background"})

if __name__ == "__main__":
    os.makedirs(os.path.join("data", "raw"), exist_ok=True)
    os.makedirs(os.path.join("data", "processed"), exist_ok=True)
    os.makedirs(os.path.join("data", "feedback"), exist_ok=True)
    
    logger.info("Starting Financial Agent Server...")
    app.run(host="127.0.0.1", port=5000, debug=True)
