import os
import json
import pandas as pd
import requests
import io
import numpy as np

# Google Sheet ID
SHEET_ID = "1FD-7SNZuzI15c4hf2vzIoY5M12HUnUM9GVXl0fjQKMc"

# Map special sheet names to specific creator labels if needed, otherwise uses sheet name directly
CREATOR_MAP = {
    "CA3D Models": "CA3D Studios",
    "Tanuki": "Tanuki Figures",
    "Bulkamancer": "Bulkamancer"
}

def clean_value(val):
    """Normalize cell values from pandas DataFrames.
    Returns ``None`` for missing/empty values and converts numeric types to native Python numbers.
    """
    if pd.isna(val) or val is None:
        return None
    # If it is numpy float/int, convert to native python types
    if isinstance(val, (np.integer, np.floating)):
        return val.item()
    if isinstance(val, (int, float)):
        return val
    val_str = str(val).strip()
    if val_str.lower() in ["nan", "null", "none", ""]:
        return None
    return val_str

def detect_layout_and_parse(sheet_name: str, df: pd.DataFrame) -> list:
    """Dynamically detects the column index positions and whether the sheet contains
    a sub‑header row. Parses and returns a list of normalized model dictionaries.
    """
    creator_name = CREATOR_MAP.get(sheet_name, sheet_name)
    num_cols = len(df.columns)
    
    # 1. Detect if row index 0 is a sub‑header row
    has_sub_header = False
    if len(df) > 0:
        first_row_values = [str(x).lower().strip() for x in df.iloc[0]]
        keywords = {"img url", "image", "model name", "model url", "bust", "spicy", "category", "file location"}
        matches = sum(1 for val in first_row_values if any(kw in val for kw in keywords))
        if matches >= 3:
            has_sub_header = True

    # 2. Establish column mapping defaults based on column count/format type
    if num_cols > 14:
        # Format 1: CA3D Models / Bulkamancer layout style (generally 16 or 20 columns)
        img_col = 0
        name_col = 4
        url_col = 6
        bust_col = 8
        spicy_col = 10
        cat_col = 12
        rank_col = 14
        loc_col = 15
    else:
        # Format 2: Tanuki layout style (generally 14 columns)
        img_col = 0
        name_col = 3
        url_col = 5
        bust_col = 7
        spicy_col = 9
        cat_col = 11
        rank_col = None
        loc_col = 13

    # 3. Refine column indexes dynamically by inspecting headers
    header_source = [str(x).lower().strip() for x in df.columns]
    if has_sub_header:
        header_source = [str(x).lower().strip() for x in df.iloc[0]]

    for idx, h in enumerate(header_source):
        # Ignore empty, formula columns, nan markers, or excessively long headers
        if not h or h == "nan" or "=" in h or len(h) > 40:
            continue

        # Check exact matches first, then fall back to robust contains checks
        if h in ["img url", "image url", "img_url", "image_url"]:
            img_col = idx
        elif h in ["image", "img"]:
            img_col = idx
        elif h in ["model name", "name", "model_name", "title"]:
            name_col = idx
        elif ("name" in h or "title" in h) and name_col is None:
            name_col = idx
        elif h in ["model url", "url", "model_url", "link"]:
            url_col = idx
        elif "url" in h and url_col is None:
            url_col = idx
        elif "bust" in h:
            bust_col = idx
        elif "spicy" in h or "nsfw" in h or "spicy_url" in h:
            spicy_col = idx
        elif "category" in h or h == "cat":
            cat_col = idx
        elif "rank" in h:
            rank_col = idx
        elif "file location" in h or "location" in h or "file" in h or "path" in h:
            loc_col = idx

    # 4. Parse rows
    start_row = 1 if has_sub_header else 0
    parsed_models = []
    
    for idx, row in df.iloc[start_row:].iterrows():
        img_url = clean_value(row.iloc[img_col]) if img_col < len(row) else None
        model_name = clean_value(row.iloc[name_col]) if name_col < len(row) else None
        model_url = clean_value(row.iloc[url_col]) if url_col < len(row) else None
        bust_url = clean_value(row.iloc[bust_col]) if bust_col < len(row) else None
        spicy_url = clean_value(row.iloc[spicy_col]) if spicy_col < len(row) else None
        category = clean_value(row.iloc[cat_col]) if cat_col < len(row) else None
        rank = clean_value(row.iloc[rank_col]) if (rank_col is not None and rank_col < len(row)) else None
        file_location = clean_value(row.iloc[loc_col]) if loc_col < len(row) else None

        if not model_name and not img_url:
            continue

        # Dynamic default category based on creator keywords
        default_cat = "Anime" if "tanuki" in creator_name.lower() else "Other"

        parsed_models.append({
            "creator": creator_name,
            "name": model_name or "Unnamed Model",
            "img_url": img_url,
            "url": model_url,
            "bust_url": bust_url,
            "spicy_url": spicy_url,
            "category": category or default_cat,
            "rank": rank,
            "file_location": file_location
        })

    return parsed_models

def parse_catalog():
    """Download the Google Sheets workbook as an Excel file, dynamically discover all
    sheets, detect their layouts, and compile the final databases (data.json and data.js).
    """
    print("==============================================================")
    print("Downloading entire Google Sheets workbook dynamically...")
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
    
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"\n[ERROR] Failed to download spreadsheet: {e}")
        raise

    print("Loading workbook pages and sheet structure...")
    try:
        xl = pd.ExcelFile(io.BytesIO(resp.content))
    except Exception as e:
        print(f"\n[ERROR] Failed to load spreadsheet as Excel workbook: {e}")
        raise

    all_models = []
    print(f"Discovered {len(xl.sheet_names)} sheet pages: {xl.sheet_names}\n")

    for sheet_name in xl.sheet_names:
        print(f"Processing sheet page: '{sheet_name}'...")
        try:
            df = xl.parse(sheet_name)
            sheet_models = detect_layout_and_parse(sheet_name, df)
            all_models.extend(sheet_models)
            print(f"  --> Successfully imported {len(sheet_models)} models for '{CREATOR_MAP.get(sheet_name, sheet_name)}'.")
        except Exception as e:
            print(f"  [WARNING] Failed to parse sheet page '{sheet_name}': {e}")
            continue

    # Path directories setup
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_json = os.path.join(script_dir, "data.json")
    output_js = os.path.join(script_dir, "data.js")
    
    # Write JSON output for backend consumption
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(all_models, f, indent=4, ensure_ascii=False)
        
    # Write JS output for local file previews (CORS bypass)
    with open(output_js, "w", encoding="utf-8") as f:
        f.write("// InnocentZombie Local Catalog Database (Automatically Generated)\n")
        f.write("window.catalogData = ")
        json.dump(all_models, f, indent=4, ensure_ascii=False)
        f.write(";\n")
        
    print("\n==============================================================")
    print(f"SUCCESS: Exported {len(all_models)} total models dynamically!")
    print(f"Web database synced successfully: {output_json} and {output_js}")
    print("==============================================================")

if __name__ == "__main__":
    parse_catalog()
