import os
import sqlite3
import pandas as pd

DB_PATH = os.path.join("data", "processed", "financials.db")
RAW_DIR = os.path.join("data", "raw")

def setup_database():
    print("--- Initializing Structured SQLite Database ---")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Connect to SQLite
    conn = sqlite3.connect(DB_PATH)
    
    # 1. Load Main Financials & Operations Excel
    excel_path = os.path.join(RAW_DIR, "apple_financials_2022_2024.xlsx")
    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found. Run download_data.py first.")
        conn.close()
        return False
        
    try:
        print(f"Loading {excel_path} into SQLite...")
        # Income Statement sheet
        df_inc = pd.read_excel(excel_path, sheet_name="Income Statement")
        df_inc.columns = ["metric", "fy2024", "fy2023", "fy2022"]
        df_inc.to_sql("financials", conn, if_exists="replace", index=False)
        print("Table 'financials' created successfully!")
        
        # Operations sheet
        df_ops = pd.read_excel(excel_path, sheet_name="Operations & Headcount")
        df_ops.columns = ["metric", "fy2024", "fy2023", "fy2022"]
        df_ops.to_sql("operations", conn, if_exists="replace", index=False)
        print("Table 'operations' created successfully!")
        
    except Exception as e:
        print(f"Error loading financials spreadsheets to SQL: {e}")
        conn.close()
        return False
        
    # 2. Load Synthetic Restricted HR Compensation Excel
    hr_path = os.path.join(RAW_DIR, "synthetic_hr_compensation.xlsx")
    if not os.path.exists(hr_path):
        print(f"Error: {hr_path} not found. Run download_data.py first.")
        conn.close()
        return False
        
    try:
        print(f"Loading {hr_path} into SQLite...")
        df_hr = pd.read_excel(hr_path, sheet_name="Executive Compensation")
        df_hr.columns = ["name", "role", "base_salary", "stock_awards", "incentive_comp", "other_comp", "total_comp"]
        df_hr.to_sql("synthetic_hr_compensation", conn, if_exists="replace", index=False)
        print("Table 'synthetic_hr_compensation' created successfully!")
        
    except Exception as e:
        print(f"Error loading HR spreadsheet to SQL: {e}")
        conn.close()
        return False
        
    # 3. Create Feedback SQLite Table
    try:
        print("Creating table 'feedback' inside financials.db...")
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT UNIQUE,
                rating TEXT,
                correction TEXT,
                timestamp TEXT
            )
        """)
        conn.commit()
        print("Table 'feedback' verified successfully!")
    except Exception as e:
        print(f"Error creating feedback table: {e}")
        conn.close()
        return False
        
    # Verify tables
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Database setup complete. Loaded tables: {[t[0] for t in tables]}")
    
    conn.close()
    return True

if __name__ == "__main__":
    setup_database()
