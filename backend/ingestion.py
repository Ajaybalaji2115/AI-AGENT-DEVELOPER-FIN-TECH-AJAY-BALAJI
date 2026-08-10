import os
import json
import pdfplumber

def parse_pdf_file(filepath):
    """
    Parses a PDF file page by page and splits it into semantic text paragraphs.
    Only PDF documents (like Apple 10-K reports) are processed for the RAG vector index.
    """
    filename = os.path.basename(filepath)
    chunks = []
    classification = "PUBLIC" # Standard annual filings are public

    try:
        with pdfplumber.open(filepath) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text_content = page.extract_text()
                if not text_content:
                    continue
                
                # Split page text into blocks by double newlines (paragraphs)
                paragraphs = [p.strip() for p in text_content.split("\n\n") if p.strip()]
                
                for idx, paragraph in enumerate(paragraphs):
                    if len(paragraph) < 30:
                        continue
                    
                    text = f"Document: {filename} | Page: {page_num+1} | Text: {paragraph}"
                    chunks.append({
                        "text": text,
                        "metadata": {
                            "source_file": filename,
                            "doc_type": "pdf",
                            "page_number": page_num + 1,
                            "paragraph_index": idx + 1,
                            "classification": classification
                        }
                    })
        print(f"Parsed PDF: {filename} (Generated {len(chunks)} chunks)")
    except Exception as e:
        print(f"Error parsing PDF file {filepath}: {e}")
        
    return chunks

def ingest_all_raw_files(raw_dir, processed_dir):
    """
    Scans raw data folder for PDFs and dumps parsed text chunks to a JSON file.
    Spreadsheets are ignored here since they are handled via SQLite.
    """
    all_chunks = []
    os.makedirs(processed_dir, exist_ok=True)
    
    if not os.path.exists(raw_dir):
        print(f"Raw data directory {raw_dir} does not exist. Run download_data.py first.")
        return
        
    files = sorted(os.listdir(raw_dir))
    for filename in files:
        # Only process standardised apple_10k_YEAR.pdf files; skip originals/duplicates
        if filename.startswith("apple_10k_") and filename.endswith(".pdf"):
            filepath = os.path.join(raw_dir, filename)
            all_chunks.extend(parse_pdf_file(filepath))
            
    output_path = os.path.join(processed_dir, "ingested_chunks.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)
        
    print(f"\nPDF Ingestion Complete! Extracted {len(all_chunks)} chunks from reports. Saved to {output_path}")

if __name__ == "__main__":
    RAW_DIR = os.path.join("data", "raw")
    PROCESSED_DIR = os.path.join("data", "processed")
    ingest_all_raw_files(RAW_DIR, PROCESSED_DIR)
