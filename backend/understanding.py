import os
import json
from sentence_transformers import SentenceTransformer
import chromadb

# Paths
UNDERSTANDING_DIR = "understanding"
PROCESSED_DIR = os.path.join("data", "processed")
CHROMA_DB_PATH = os.path.join(PROCESSED_DIR, "chroma_db")
CHUNKS_FILE = os.path.join(PROCESSED_DIR, "ingested_chunks.json")

# 1. Document Metadata Registry
METADATA_DATA = {
    "apple_10k_2024.pdf": {
        "doc_type": "pdf",
        "company": "Apple",
        "year": 2024,
        "classification": "PUBLIC"
    },
    "apple_10k_2023.pdf": {
        "doc_type": "pdf",
        "company": "Apple",
        "year": 2023,
        "classification": "PUBLIC"
    },
    "apple_10k_2022.pdf": {
        "doc_type": "pdf",
        "company": "Apple",
        "year": 2022,
        "classification": "PUBLIC"
    },
    "apple_financials_2022_2024.xlsx": {
        "doc_type": "xlsx",
        "company": "Apple",
        "year": "2022-2024",
        "classification": "PUBLIC"
    },
    "synthetic_hr_compensation.xlsx": {
        "doc_type": "xlsx",
        "company": "Apple",
        "year": 2024,
        "classification": "CONFIDENTIAL_HR"
    }
}

# 2. Database & RAG Schema Definition
SCHEMA_DATA = {
    "financials": {
        "description": "Structured Income Statement data for Apple Inc. (FY 22 - FY 24). Values are in Millions of USD, except Diluted EPS.",
        "columns": {
            "metric": "TEXT - Name of financial metric",
            "fy2024": "REAL - Value for fiscal year 2024",
            "fy2023": "REAL - Value for fiscal year 2023",
            "fy2022": "REAL - Value for fiscal year 2022"
        }
    },
    "operations": {
        "description": "Structured operational statistics (Retail stores count, total employees).",
        "columns": {
            "metric": "TEXT - Name of operational metric",
            "fy2024": "REAL - Value for fiscal year 2024",
            "fy2023": "REAL - Value for fiscal year 2023",
            "fy2022": "REAL - Value for fiscal year 2022"
        }
    },
    "synthetic_hr_compensation": {
        "description": "RESTRICTED executive payroll records (Synthetic dataset for RBAC demonstration). Role CEO required.",
        "columns": {
            "name": "TEXT - Executive name",
            "role": "TEXT - VP/Officer role",
            "base_salary": "REAL - Annual salary in USD",
            "stock_awards": "REAL - Granted stock rewards in USD",
            "incentive_comp": "REAL - Performance incentive bonus in USD",
            "other_comp": "REAL - Other secondary compensation in USD",
            "total_comp": "REAL - Combined total annual compensation in USD"
        }
    }
}

# 3. Document Summaries
SUMMARIES_DATA = {
    "apple_10k_2024.pdf": {
        "title": "Apple Inc. FY2024 Form 10-K Annual Report",
        "period": "Fiscal Year Ended September 28, 2024",
        "description": "Apple's annual report detailing business performance, risk factors, and financial results. Shows robust revenue growth driven by services, while product revenues remained steady. R&D investments reached record highs.",
        "key_metrics": {
            "Total Net Sales (Revenue)": "$391,035M",
            "Gross Margin": "$181,262M (46.35%)",
            "Net Income": "$93,736M",
            "Diluted EPS": "$6.08",
            "Headcount": "164,000 employees"
        }
    },
    "apple_10k_2023.pdf": {
        "title": "Apple Inc. FY2023 Form 10-K Annual Report",
        "period": "Fiscal Year Ended September 30, 2023",
        "description": "Apple's annual report detailing a year of high net income and expansion in hardware and software ecosystems. Service revenues grew, offsetting minor declines in hardware sales.",
        "key_metrics": {
            "Total Net Sales (Revenue)": "$383,285M",
            "Gross Margin": "$169,148M (44.13%)",
            "Net Income": "$96,995M",
            "Diluted EPS": "$6.13",
            "Headcount": "161,000 employees"
        }
    },
    "apple_10k_2022.pdf": {
        "title": "Apple Inc. FY2022 Form 10-K Annual Report",
        "period": "Fiscal Year Ended September 24, 2022",
        "description": "Apple's annual report showing strong performance in smartphone sales, post-pandemic demand stability, and sustained global logistics optimizations.",
        "key_metrics": {
            "Total Net Sales (Revenue)": "$394,328M",
            "Gross Margin": "$170,782M (43.31%)",
            "Net Income": "$99,803M",
            "Diluted EPS": "$6.11",
            "Headcount": "164,000 employees"
        }
    },
    "apple_financials_2022_2024.xlsx": {
        "title": "Apple Financial & Operational Spreadsheets",
        "period": "FY 2022 - FY 2024 Summary",
        "description": "Contains sheets: 'Income Statement' and 'Operations & Headcount'. Tracks detailed sales summaries, operating margins, EPS, retail stores count, and headcount.",
        "key_metrics": {
            "Data Sheets Included": "Income Statement, Operations & Headcount",
            "FY24 Store Count": "535 stores",
            "FY24 Revenue per Employee": "$2,384,359.76"
        }
    },
    "synthetic_hr_compensation.xlsx": {
        "title": "[CONFIDENTIAL] Synthetic Executive Payroll & Compensation Sheet",
        "period": "FY 2024 Payroll Logs",
        "description": "RESTRICTED DOCUMENT (Synthetic demonstration data). Lists salaries, stock awards, and total compensation for top-tier executives.",
        "key_metrics": {
            "CEO Tim Cook FY24 Total Compensation": "$60,300,000",
            "CFO Luca Maestri FY24 Total Compensation": "$20,200,000",
            "Access Classification": "CONFIDENTIAL_HR (CEO Only)"
        }
    }
}

# 4. Core Pre-Extracted Metrics Cache
METRICS_DATA = {
    "revenue": {
        "2024": 391035000000,
        "2023": 383285000000,
        "2022": 394328000000
    },
    "net_income": {
        "2024": 93736000000,
        "2023": 96995000000,
        "2022": 99803000000
    },
    "gross_margin_pct": {
        "2024": 46.35,
        "2023": 44.13,
        "2022": 43.31
    },
    "gross_margin": {
        "2024": 181262000000,
        "2023": 169148000000,
        "2022": 170782000000
    },
    "rd_expenses": {
        "2024": 31357000000,
        "2023": 29915000000,
        "2022": 26251000000
    },
    "headcount": {
        "2024": 164000,
        "2023": 161000,
        "2022": 164000
    },
    "ceo_compensation": {
        "2024": 60300000,
        "2023": 63200000,
        "2022": 99400000
    }
}

def generate_understanding_files():
    """Generates the structured JSON files inside the understanding directory."""
    os.makedirs(UNDERSTANDING_DIR, exist_ok=True)
    
    files_to_write = {
        "document_metadata.json": METADATA_DATA,
        "financial_schema.json": SCHEMA_DATA,
        "metrics.json": METRICS_DATA,
        "summaries.json": SUMMARIES_DATA
    }
    
    for filename, data in files_to_write.items():
        filepath = os.path.join(UNDERSTANDING_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Generated understanding layer file: {filepath}")

def index_chunks_to_vector_db():
    """Generates embeddings for PDF chunks and stores them in ChromaDB."""
    if not os.path.exists(CHUNKS_FILE):
        print(f"Error: {CHUNKS_FILE} not found. Run ingestion first.")
        return
        
    print(f"Loading PDF chunks from {CHUNKS_FILE}...")
    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)
        
    if not chunks:
        print("No PDF text chunks found. Indexing skipped.")
        return
        
    print(f"Loaded {len(chunks)} chunks. Initializing SentenceTransformer Model...")
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    
    print("Generating embeddings for text chunks...")
    texts = [c["text"] for c in chunks]
    embeddings = embed_model.encode(texts, show_progress_bar=True).tolist()
    
    print(f"Initializing local ChromaDB client at {CHROMA_DB_PATH}...")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    try:
        client.delete_collection("financial_data")
    except:
        pass
        
    collection = client.get_or_create_collection(
        name="financial_data",
        metadata={"hnsw:space": "cosine"}
    )
    
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    metadatas = [c["metadata"] for c in chunks]
    
    # Store page-level parameters for RAG citations
    for m in metadatas:
        m["company"] = "Apple"
        m["year"] = int(m.get("source_file", "2024").replace("apple_10k_", "").replace(".pdf", ""))
    
    print("Uploading indexed text to ChromaDB...")
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        end = min(i + batch_size, len(chunks))
        collection.add(
            ids=ids[i:end],
            embeddings=embeddings[i:end],
            documents=texts[i:end],
            metadatas=metadatas[i:end]
        )
        
    print(f"Successfully indexed {len(chunks)} PDF page chunks in ChromaDB!")

def run_understanding_pipeline():
    print("--- Starting Understanding & Indexing Layer Pipeline ---")
    generate_understanding_files()
    index_chunks_to_vector_db()
    print("--- Understanding & Indexing Layer Pipeline Complete! ---\n")

if __name__ == "__main__":
    run_understanding_pipeline()
