import os
import json
import pandas as pd
import numpy as np

def clean_value(val):
    if pd.isna(val) or val is None:
        return None
    # If it is numpy float/int, convert to python native
    if isinstance(val, (np.integer, np.floating)):
        return val.item()
    val_str = str(val).strip()
    if val_str.lower() in ['nan', 'null', 'none', '']:
        return None
    # Clean up double equals or excel artifacts if any
    return val_str

def parse_catalog():
    xlsx_path = r"D:\User\Document\Ai\InnocentZombie website\3D Printing Model Catalog (2).xlsx"
    if not os.path.exists(xlsx_path):
        print(f"Error: {xlsx_path} not found.")
        return
        
    print("Reading spreadsheet...")
    
    # 1. Parse CA3D Models
    # Row 0 of sheet 'CA3D Models' is actually:
    # ['IMG URL', nan, 'Image', nan, 'Model Name', nan, 'Model URL', nan, 'Bust', nan, 'Spicy', nan, 'Category', nan, 'Rank', 'File Location', nan, nan, nan, 'Formula...']
    # Let's read it.
    df_ca3d = pd.read_excel(xlsx_path, sheet_name="CA3D Models")
    
    # Let's find the headers
    # Row 0 contains: IMG URL, Model Name, Model URL, Bust, Spicy, Category, Rank, File Location
    # Let's write a parser that maps these.
    # Looking at the sample:
    # Column 0: IMG URL (CA3D Model Catalog)
    # Column 4: Model Name (Unnamed: 4)
    # Column 6: Model URL (Unnamed: 6)
    # Column 8: Bust (Unnamed: 8)
    # Column 10: Spicy (Unnamed: 10)
    # Column 12: Category (Unnamed: 12)
    # Column 14: Rank (Unnamed: 14)
    # Column 15: File Location (Unnamed: 15)
    
    models = []
    
    # Iterate through rows starting from index 1 (since index 0 has the sub-headers)
    for idx, row in df_ca3d.iloc[1:].iterrows():
        # Get values using position or raw column names
        img_url = clean_value(row.iloc[0])
        model_name = clean_value(row.iloc[4])
        model_url = clean_value(row.iloc[6])
        bust_url = clean_value(row.iloc[8])
        spicy_url = clean_value(row.iloc[10])
        category = clean_value(row.iloc[12])
        rank = clean_value(row.iloc[14])
        file_location = clean_value(row.iloc[15])
        
        # We need at least a model name or an image to consider it a valid entry
        if not model_name and not img_url:
            continue
            
        models.append({
            "creator": "CA3D Studios",
            "name": model_name or "Unnamed Model",
            "img_url": img_url,
            "url": model_url,
            "bust_url": bust_url,
            "spicy_url": spicy_url,
            "category": category or "Other",
            "rank": rank,
            "file_location": file_location
        })
        
    print(f"Parsed {len(models)} models from CA3D Models.")
    
    # 2. Parse Tanuki
    # Columns in sheet 'Tanuki' are:
    # ['Image', 'Unnamed: 1', 'Unnamed: 2', 'Model Name', 'Unnamed: 4', 'Model URL', 'Unnamed: 6', 'Bust', 'Unnamed: 8', 'Spicy', 'Unnamed: 10', 'Category', 'Unnamed: 12', 'File Location']
    df_tanuki = pd.read_excel(xlsx_path, sheet_name="Tanuki")
    
    tanuki_count = 0
    for idx, row in df_tanuki.iterrows():
        # Let's inspect the column indices based on sheet structure
        # 'Image' -> index 0
        # 'Model Name' -> index 3
        # 'Model URL' -> index 5
        # 'Bust' -> index 7
        # 'Spicy' -> index 9
        # 'Category' -> index 11
        # 'File Location' -> index 13
        
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
            "creator": "Tanuki Figures",
            "name": model_name or "Unnamed Model",
            "img_url": img_url,
            "url": model_url,
            "bust_url": bust_url,
            "spicy_url": spicy_url,
            "category": category or "Anime",  # Default category for Tanuki since it's empty
            "rank": None,
            "file_location": file_location
        })
        tanuki_count += 1
        
    print(f"Parsed {tanuki_count} models from Tanuki.")
    
    # Export to JSON
    output_json = r"D:\User\Document\Ai\InnocentZombie website\data.json"
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(models, f, indent=4, ensure_ascii=False)
        
    # Export to JS for local file preview (CORS bypass)
    output_js = r"D:\User\Document\Ai\InnocentZombie website\data.js"
    with open(output_js, "w", encoding="utf-8") as f:
        f.write("// InnocentZombie Local Catalog Database (Automatically Generated)\n")
        f.write("window.catalogData = ")
        json.dump(models, f, indent=4, ensure_ascii=False)
        f.write(";\n")
        
    print(f"Total parsed: {len(models)} models. Exported to {output_json} and {output_js}.")

if __name__ == "__main__":
    parse_catalog()
