import os
import requests
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Configuration
RAW_DIR = os.path.join("data", "raw")
USER_AGENT = "Research/1.0 (financial_assistant@company.com)"

# Apple Inc. Actual Financial Figures (FY 2022 - 2024)
APPLE_DATA = {
    "FY2024": {
        "Revenue": 391035,
        "Cost_Of_Sales": 209773,
        "Gross_Margin": 181262,
        "RD_Expenses": 31357,
        "SGA_Expenses": 24198,
        "Operating_Income": 125707,
        "Net_Income": 93736,
        "EPS_Diluted": 6.08,
        "Headcount": 164000,
        "Tim_Cook_Comp": 60300000
    },
    "FY2023": {
        "Revenue": 383285,
        "Cost_Of_Sales": 214137,
        "Gross_Margin": 169148,
        "RD_Expenses": 29915,
        "SGA_Expenses": 24938,
        "Operating_Income": 114301,
        "Net_Income": 96995,
        "EPS_Diluted": 6.13,
        "Headcount": 161000,
        "Tim_Cook_Comp": 63200000
    },
    "FY2022": {
        "Revenue": 394328,
        "Cost_Of_Sales": 223546,
        "Gross_Margin": 170782,
        "RD_Expenses": 26251,
        "SGA_Expenses": 25094,
        "Operating_Income": 119437,
        "Net_Income": 99803,
        "EPS_Diluted": 6.11,
        "Headcount": 164000,
        "Tim_Cook_Comp": 99400000
    }
}

def create_folders():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(os.path.join("data", "processed"), exist_ok=True)
    os.makedirs(os.path.join("data", "feedback"), exist_ok=True)

def download_file(url, filename):
    filepath = os.path.join(RAW_DIR, filename)
    headers = {"User-Agent": USER_AGENT}
    try:
        print(f"Attempting to download {filename} from {url}...")
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"Successfully downloaded {filename}!")
            return True
        else:
            print(f"Download failed for {filename} with HTTP code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Network error downloading {filename}: {e}")
        return False

def generate_mock_excel():
    excel_path = os.path.join(RAW_DIR, "apple_financials_2022_2024.xlsx")
    print(f"Generating local structured Excel sheet at {excel_path}...")
    
    # Sheet 1: Income Statement Summary
    inc_data = {
        "Metric (in millions USD, except EPS)": [
            "Total Net Sales (Revenue)",
            "Cost of Sales",
            "Gross Margin",
            "Research and Development (R&D)",
            "Selling, General and Administrative (SG&A)",
            "Total Operating Expenses",
            "Operating Income",
            "Net Income",
            "Diluted Earnings Per Share (USD)"
        ],
        "FY2024": [
            APPLE_DATA["FY2024"]["Revenue"],
            APPLE_DATA["FY2024"]["Cost_Of_Sales"],
            APPLE_DATA["FY2024"]["Gross_Margin"],
            APPLE_DATA["FY2024"]["RD_Expenses"],
            APPLE_DATA["FY2024"]["SGA_Expenses"],
            APPLE_DATA["FY2024"]["RD_Expenses"] + APPLE_DATA["FY2024"]["SGA_Expenses"],
            APPLE_DATA["FY2024"]["Operating_Income"],
            APPLE_DATA["FY2024"]["Net_Income"],
            APPLE_DATA["FY2024"]["EPS_Diluted"]
        ],
        "FY2023": [
            APPLE_DATA["FY2023"]["Revenue"],
            APPLE_DATA["FY2023"]["Cost_Of_Sales"],
            APPLE_DATA["FY2023"]["Gross_Margin"],
            APPLE_DATA["FY2023"]["RD_Expenses"],
            APPLE_DATA["FY2023"]["SGA_Expenses"],
            APPLE_DATA["FY2023"]["RD_Expenses"] + APPLE_DATA["FY2023"]["SGA_Expenses"],
            APPLE_DATA["FY2023"]["Operating_Income"],
            APPLE_DATA["FY2023"]["Net_Income"],
            APPLE_DATA["FY2023"]["EPS_Diluted"]
        ],
        "FY2022": [
            APPLE_DATA["FY2022"]["Revenue"],
            APPLE_DATA["FY2022"]["Cost_Of_Sales"],
            APPLE_DATA["FY2022"]["Gross_Margin"],
            APPLE_DATA["FY2022"]["RD_Expenses"],
            APPLE_DATA["FY2022"]["SGA_Expenses"],
            APPLE_DATA["FY2022"]["RD_Expenses"] + APPLE_DATA["FY2022"]["SGA_Expenses"],
            APPLE_DATA["FY2022"]["Operating_Income"],
            APPLE_DATA["FY2022"]["Net_Income"],
            APPLE_DATA["FY2022"]["EPS_Diluted"]
        ]
    }
    df_inc = pd.DataFrame(inc_data)

    # Sheet 2: Operational Statistics
    ops_data = {
        "Metric": ["Retail Stores Count", "Total Full-Time Equivalent Employees", "Average Revenue per Employee (USD)"],
        "FY2024": [535, APPLE_DATA["FY2024"]["Headcount"], round((APPLE_DATA["FY2024"]["Revenue"]*1000000)/APPLE_DATA["FY2024"]["Headcount"], 2)],
        "FY2023": [528, APPLE_DATA["FY2023"]["Headcount"], round((APPLE_DATA["FY2023"]["Revenue"]*1000000)/APPLE_DATA["FY2023"]["Headcount"], 2)],
        "FY2022": [520, APPLE_DATA["FY2022"]["Headcount"], round((APPLE_DATA["FY2022"]["Revenue"]*1000000)/APPLE_DATA["FY2022"]["Headcount"], 2)],
    }
    df_ops = pd.DataFrame(ops_data)

    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        df_inc.to_excel(writer, sheet_name="Income Statement", index=False)
        df_ops.to_excel(writer, sheet_name="Operations & Headcount", index=False)

    print("Structured Excel generated successfully!")

def generate_synthetic_hr_excel():
    excel_path = os.path.join(RAW_DIR, "synthetic_hr_compensation.xlsx")
    print(f"Generating synthetic restricted HR payroll spreadsheet at {excel_path}...")
    
    hr_data = {
        "Name": ["Tim Cook", "Luca Maestri", "Jeff Williams", "Deirdre O'Brien", "Kate Adams"],
        "Role": ["Chief Executive Officer (CEO)", "Chief Financial Officer (CFO)", "Chief Operating Officer (COO)", "Senior VP Retail + People", "Senior VP & General Counsel"],
        "Base Salary (USD)": [3000000, 1000000, 1000000, 1000000, 1000000],
        "Stock Awards (USD)": [40000000, 15000000, 15000000, 15000000, 15000000],
        "Non-Equity Incentive Plan Comp (USD)": [15000000, 4000000, 4000000, 4000000, 4000000],
        "All Other Comp (USD)": [2300000, 200000, 200000, 200000, 200000],
        "Total FY2024 Compensation (USD)": [
            APPLE_DATA["FY2024"]["Tim_Cook_Comp"], 
            20200000, 
            20200000, 
            20200000, 
            20200000
        ]
    }
    df_hr = pd.DataFrame(hr_data)
    
    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        df_hr.to_excel(writer, sheet_name="Executive Compensation", index=False)
        
    print("Synthetic HR Excel generated successfully!")

def generate_mock_pdf(filename, year, data):
    pdf_path = os.path.join(RAW_DIR, filename)
    print(f"Generating Apple 10-K PDF report at {pdf_path}...")
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#000000'),
        spaceAfter=15
    )
    
    h2_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#1d1d1f'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=10
    )

    story = []
    
    # Title
    story.append(Paragraph(f"Apple Inc. Form 10-K Annual Report (FY {year})", title_style))
    story.append(Paragraph("<b>UNITED STATES SECURITIES AND EXCHANGE COMMISSION</b><br/>Washington, D.C. 20549", body_style))
    story.append(Spacer(1, 10))
    
    # Section 1: Business Overview
    story.append(Paragraph("PART I", h2_style))
    story.append(Paragraph("<b>Item 1. Business Overview</b>", h2_style))
    story.append(Paragraph(
        "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, "
        "and accessories, and sells a variety of related services. The Company's principal products include "
        "iPhone, Mac, iPad, and Wearables, Home and Accessories. Services include Advertising, AppleCare, "
        "Cloud Services, Digital Content (Music, TV+, Arcade, Fitness+), and Payment Services.",
        body_style
    ))
    
    # Human Capital (Headcount)
    story.append(Paragraph("<b>Human Capital Resources and Employees</b>", h2_style))
    story.append(Paragraph(
        f"As of the end of fiscal year {year}, the Company had approximately {data['Headcount']:,} full-time equivalent "
        "employees worldwide. The Company recruits, retains, and supports employees by offering competitive compensation, "
        "comprehensive benefits, and growth opportunities. Our workplace culture values innovation, diversity, and collaboration.",
        body_style
    ))
    
    # Section 2: Management Discussion & Analysis
    story.append(Paragraph("<b>Item 7. Management's Discussion and Analysis of Financial Condition</b>", h2_style))
    story.append(Paragraph(
        f"In fiscal year {year}, Apple's total net sales were ${data['Revenue']:,} million. Gross margin was ${data['Gross_Margin']:,} million, "
        f"representing a gross margin percentage of {round((data['Gross_Margin']/data['Revenue'])*100, 2)}%. Operating income "
        f"was ${data['Operating_Income']:,} million, and net income was ${data['Net_Income']:,} million. Research and development "
        f"expenses increased to ${data['RD_Expenses']:,} million, reflecting continuous investments in new technologies and product platforms.",
        body_style
    ))
    
    # Table of Core Figures
    table_data = [
        ['Financial Metric', 'Value (in Millions)', 'Per Share (USD)'],
        ['Total Net Sales', f"${data['Revenue']:,}", '-'],
        ['Cost of Sales', f"${data['Cost_Of_Sales']:,}", '-'],
        ['Gross Margin', f"${data['Gross_Margin']:,}", '-'],
        ['Operating Income', f"${data['Operating_Income']:,}", '-'],
        ['Net Income', f"${data['Net_Income']:,}", '-'],
        ['Diluted EPS', '-', f"${data['EPS_Diluted']:.2f}"]
    ]
    t = Table(table_data, colWidths=[200, 150, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f5f5f7')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d2d2d7')),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))
    
    # Build PDF
    doc.build(story)
    print(f"PDF {filename} generated successfully!")

def generate_pdf_if_needed(filename, year, data):
    """Only generate a mock PDF if no real filing exists (file missing or tiny mock < 50 KB)."""
    pdf_path = os.path.join(RAW_DIR, filename)
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 50_000:
        print(f"Skipping {filename} — real filing already present ({round(os.path.getsize(pdf_path)/1024, 0)} KB)")
        return
    generate_mock_pdf(filename, year, data)

def main():
    create_folders()
    
    # Attempt EDGAR downloads for Excel reports
    download_urls = {
        "apple_10k_24_raw.xlsx": "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/Financial_Report.xlsx",
        "apple_10k_23_raw.xlsx": "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/Financial_Report.xlsx",
        "apple_10k_22_raw.xlsx": "https://www.sec.gov/Archives/edgar/data/320193/000032019322000108/Financial_Report.xlsx"
    }
    
    download_success = True
    for filename, url in download_urls.items():
        success = download_file(url, filename)
        if not success:
            download_success = False

    # Generate offline structured datasets (Excel + HR)
    generate_mock_excel()
    generate_synthetic_hr_excel()
    
    # Generate PDFs only if real filings are NOT already present
    generate_pdf_if_needed("apple_10k_2024.pdf", "2024", APPLE_DATA["FY2024"])
    generate_pdf_if_needed("apple_10k_2023.pdf", "2023", APPLE_DATA["FY2023"])
    generate_pdf_if_needed("apple_10k_2022.pdf", "2022", APPLE_DATA["FY2022"])
    # Note: apple_10k_2025.pdf must be placed in data/raw/ (from SEC filing)
    
    print("\n--- Data Setup Complete! ---")

if __name__ == "__main__":
    main()
