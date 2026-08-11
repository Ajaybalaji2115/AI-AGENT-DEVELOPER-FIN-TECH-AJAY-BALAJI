import os
import pandas as pd
import pymysql
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

RAW_DIR = os.path.join("data", "raw")

def get_mysql_engine():
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    host = os.getenv("MYSQL_HOST", "localhost")
    port = os.getenv("MYSQL_PORT", "3306")
    db = os.getenv("MYSQL_DATABASE", "finagent_db")
    return create_engine(f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}")

def setup_database():
    print("--- Initializing Structured MySQL Database ---")
    
    # Connect to MySQL to ensure database exists
    try:
        conn = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", "")
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {os.getenv('MYSQL_DATABASE', 'finagent_db')}")
        conn.close()
    except Exception as e:
        print(f"Error creating MySQL database: {e}")
        return False
        
    engine = get_mysql_engine()
    
    # 1. Load Main Financials & Operations Excel
    excel_path = os.path.join(RAW_DIR, "apple_financials_2022_2024.xlsx")
    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found. Run download_data.py first.")
        return False
        
    try:
        print(f"Loading {excel_path} into MySQL...")
        # Income Statement sheet
        df_inc = pd.read_excel(excel_path, sheet_name="Income Statement")
        df_inc.columns = ["metric", "fy2024", "fy2023", "fy2022"]
        df_inc.to_sql("financials", engine, if_exists="replace", index=False)
        print("Table 'financials' created successfully!")
        
        # Operations sheet
        df_ops = pd.read_excel(excel_path, sheet_name="Operations & Headcount")
        df_ops.columns = ["metric", "fy2024", "fy2023", "fy2022"]
        df_ops.to_sql("operations", engine, if_exists="replace", index=False)
        print("Table 'operations' created successfully!")
        
    except Exception as e:
        print(f"Error loading financials spreadsheets to SQL: {e}")
        return False
        
    # 2. Load Synthetic Restricted HR Compensation Excel
    hr_path = os.path.join(RAW_DIR, "synthetic_hr_compensation.xlsx")
    if not os.path.exists(hr_path):
        print(f"Error: {hr_path} not found. Run download_data.py first.")
        return False
        
    try:
        print(f"Loading {hr_path} into MySQL...")
        df_hr = pd.read_excel(hr_path, sheet_name="Executive Compensation")
        df_hr.columns = ["name", "role", "base_salary", "stock_awards", "incentive_comp", "other_comp", "total_comp"]
        df_hr.to_sql("synthetic_hr_compensation", engine, if_exists="replace", index=False)
        print("Table 'synthetic_hr_compensation' created successfully!")
        
    except Exception as e:
        print(f"Error loading HR spreadsheet to SQL: {e}")
        return False
        
    # 3. Create Feedback MySQL Table
    try:
        print("Creating table 'feedback' inside MySQL...")
        with engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE IF NOT EXISTS feedback ("
                "id INT AUTO_INCREMENT PRIMARY KEY,"
                "query VARCHAR(500) UNIQUE,"
                "rating VARCHAR(50),"
                "correction TEXT,"
                "timestamp VARCHAR(100)"
                ")"
            ))
        print("Table 'feedback' verified successfully!")
    except Exception as e:
        print(f"Error creating feedback table: {e}")
        return False
        
    print(f"Database setup complete on MySQL.")
    
    return True

if __name__ == "__main__":
    setup_database()
