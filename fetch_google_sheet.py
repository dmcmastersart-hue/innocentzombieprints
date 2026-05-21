import os
import json
import pandas as pd
import requests
from io import StringIO

# Google Sheet ID (replace with your sheet ID)
SHEET_ID = "1FD-7SNZuzI15c4hf2vzIoY5M12HUnUM9GVXl0fjQKMc"

# Mapping of sheet names to their GID values (update if they change)
SHEETS = {
    "CA3D Models": "49256567",
    "Tanuki": "116308953",
    "Bulkamancer": "321997128"
}

# Map sheet name to creator label
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
    if isinstance(val, (int, float)):
        return val
    val_str = str(val).strip()
    if val_str.lower() in ["nan", "null", "none", ""]:
        return None
    return val_str

def fetch_sheet_csv(sheet_name: str, gid: str) -> pd.DataFrame:
    """Download a CSV export of a specific sheet and return it as a DataFrame.
    Raises ``requests.HTTPError`` on failure.
    """
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}"
    resp = requests.get(url)
    resp.raise_for_status()
    return pd.read_csv(StringIO(resp.text))

def parse_catalog():
    """Fetch each configured sheet, normalize rows, and emit JSON/JS files used by the web app."""
    models = []
    for sheet_name, gid in SHEETS.items():
        print(f"Fetching '{sheet_name}' from Google Sheets...")
        df = fetch_sheet_csv(sheet_name, gid)
        creator = CREATOR_MAP.get(sheet_name, sheet_name)

        # Determine column layout per sheet type
        if sheet_name in ("CA3D Models", "Bulkamancer"):
            # Layout: IMG URL, (skip), Model Name, (skip), Model URL, (skip), Bust, (skip), Spicy, (skip), Category, (skip), Rank, File Location
            for idx, row in df.iloc[1:].iterrows():  # skip header row that contains sub‑headers
                img_url = clean_value(row.iloc[0])
                model_name = clean_value(row.iloc[4])
                model_url = clean_value(row.iloc[6])
                bust_url = clean_value(row.iloc[8])
                spicy_url = clean_value(row.iloc[10])
                category = clean_value(row.iloc[12])
                rank = clean_value(row.iloc[14])
                file_location = clean_value(row.iloc[15])
                if not model_name and not img_url:
                    continue
                models.append({
                    "creator": creator,
                    "name": model_name or "Unnamed Model",
                    "img_url": img_url,
                    "url": model_url,
                    "bust_url": bust_url,
                    "spicy_url": spicy_url,
                    "category": category or "Other",
                    "rank": rank,
                    "file_location": file_location
                })
        elif sheet_name == "Tanuki":
            # Layout: Image, (skip), (skip), Model Name, (skip), Model URL, (skip), Bust, (skip), Spicy, (skip), Category, (skip), File Location
            for idx, row in df.iterrows():
                img_url = clean_value(row.iloc[0])
                model_name = clean_value(row.iloc[3])
                model_url = clean_value(row.iloc[5])
                bust_url = clean_value(row.iloc[7])
                spicy_url = clean_value(row.iloc[9])
                category = clean_value(row.iloc[11])
                file_location = clean_value(row.iloc[13])
                if not model_name and not img_url:
                    continue
                models.append({
                    "creator": creator,
                    "name": model_name or "Unnamed Model",
                    "img_url": img_url,
                    "url": model_url,
                    "bust_url": bust_url,
                    "spicy_url": spicy_url,
                    "category": category or "Anime",
                    "rank": None,
                    "file_location": file_location
                })
        else:
            # Fallback: attempt generic parsing based on column positions used in previous sheets
            print(f"Warning: No parsing rules for sheet '{sheet_name}'. Skipping.")
            continue

    # Write JSON output for backend consumption
    output_json = r"D:\\User\\Document\\Ai\\InnocentZombie website\\data.json"
    output_js = r"D:\\User\\Document\\Ai\\InnocentZombie website\\data.js"
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(models, f, indent=4, ensure_ascii=False)
    with open(output_js, "w", encoding="utf-8") as f:
        f.write("// InnocentZombie Local Catalog Database (Automatically Generated)\n")
        f.write("window.catalogData = ")
        json.dump(models, f, indent=4, ensure_ascii=False)
        f.write(";\n")
    print(f"Exported {len(models)} models to data.json and data.js.")

if __name__ == "__main__":
    parse_catalog()
