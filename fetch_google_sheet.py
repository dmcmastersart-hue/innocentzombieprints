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
        keywords = {"img url", "image", "model name", "model url", "bust", "spicy", "category", "file location", "franchise"}
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
        fran_col = 9 # Default to Column J (index 9) for CA3DModels style
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
        fran_col = None

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
        elif "franchise" in h or h == "fran":
            fran_col = idx

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
        franchise = clean_value(row.iloc[fran_col]) if (fran_col is not None and fran_col < len(row)) else None

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
            "file_location": file_location,
            "franchise": franchise or "undefined"
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
    images_dir = os.path.join(script_dir, "images")

    # Clean, download, and organize remote preview photos locally
    download_local_images(all_models, images_dir)
    
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

def slugify(s):
    """Normalize string, convert to lowercase, remove non-alphanumeric chars."""
    import re
    s = str(s).lower().strip()
    s = re.sub(r'[^a-z0-9\-_]', '_', s)
    return re.sub(r'_+', '_', s).strip('_')

def compress_and_save_image(img_data, save_path):
    """Resizes and compresses raw image binary data to a web-optimized JPEG format (<100KB)."""
    from PIL import Image
    try:
        img = Image.open(io.BytesIO(img_data))
        
        # Convert RGBA/Palette transparent modes to standard RGB with a white background
        if img.mode in ("RGBA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                bg.paste(img, mask=img.split()[3])
            else:
                bg.paste(img)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
            
        # Resize down if either dimension exceeds 1000px
        max_size = 1000
        width, height = img.size
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
        img.save(save_path, "JPEG", quality=80, optimize=True)
        return True
    except Exception as e:
        print(f"  [WARNING] Compression failed: {e}")
        return False

def download_local_images(models, base_images_dir):
    """Downloads remote images locally, organized in partitioned directories by creator dynamically.
    Each directory will hold at most 98 images to support drag-and-drop uploads on GitHub.
    Compresses all images to under 100KB and auto-reorganizes existing files on disk dynamically.
    """
    import re
    if not os.path.exists(base_images_dir):
        os.makedirs(base_images_dir, exist_ok=True)

    print("\n--------------------------------------------------------------")
    print("Checking, compressing, and downloading remote model preview photos locally...")
    print("This runs incrementally: already downloaded images will be skipped.")
    print("Each creator folder is partitioned to hold at most 98 files.")
    print("--------------------------------------------------------------")

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36"
    })

    downloaded = 0
    skipped = 0
    failed = 0
    
    # Tracks the assigned file counts per partition for this run
    partition_file_counts = {}
    
    # Tracks seen model slugs globally across all creators to prevent duplicate naming conflicts
    seen_slugs = {}

    for idx, model in enumerate(models):
        img_url = model.get("img_url")
        if not img_url:
            continue

        # Check if this is a local file path that exists on disk (outside our images directory)
        is_local_file = False
        if img_url and not img_url.startswith("http") and os.path.exists(img_url):
            is_local_file = True

        # If it is already a local path inside our images directory, skip download
        if img_url and not img_url.startswith("http") and not is_local_file:
            skipped += 1
            continue

        # Dynamic Creator & Model naming slugification (future-proof, no hardcoding)
        creator_name = model.get("creator") or "Other"
        creator_slug = slugify(creator_name)
        model_slug = slugify(model.get("name", "model"))
        
        # Track seen slugs globally to avoid naming conflicts on duplicates (cross-creator and cross-page)
        if model_slug not in seen_slugs:
            seen_slugs[model_slug] = 0
            unique_model_slug = model_slug
        else:
            seen_slugs[model_slug] += 1
            unique_model_slug = f"{model_slug}_{seen_slugs[model_slug]}"
        
        # Force all compiled extensions to be standard web-optimized .jpg
        filename = f"{unique_model_slug}.jpg"
        
        # 1. Determine the designated partition name (max 98 files per folder)
        part_idx = 0
        allocated_partition = creator_slug
        while True:
            part_name = creator_slug if part_idx == 0 else f"{creator_slug}_{part_idx}"
            if partition_file_counts.get(part_name, 0) < 98:
                partition_file_counts[part_name] = partition_file_counts.get(part_name, 0) + 1
                allocated_partition = part_name
                break
            part_idx += 1
            
        creator_dir = os.path.join(base_images_dir, allocated_partition)
        local_path = os.path.join(creator_dir, filename)
        relative_path = f"images/{allocated_partition}/{filename}"

        # Ensure selected partition directory exists
        if not os.path.exists(creator_dir):
            os.makedirs(creator_dir, exist_ok=True)

        # 2. Check if the file already exists and is already compressed (< 120KB) at designated path
        if os.path.exists(local_path) and os.path.getsize(local_path) < 120 * 1024:
            model["img_url"] = relative_path
            skipped += 1
            continue

        # 3. Check if the file exists in ANY other partition folder or with ANY other extension (.png, .webp, .jpeg, etc.)
        # to avoid redownloading, and compress/convert/move it to the designated partition as a .jpg!
        found_and_reorganized = False
        extensions_to_check = [".jpg", ".png", ".webp", ".jpeg", ".JPG", ".PNG"]
        other_part_idx = 0
        while True:
            other_part_name = creator_slug if other_part_idx == 0 else f"{creator_slug}_{other_part_idx}"
            other_part_dir = os.path.join(base_images_dir, other_part_name)
            
            # Check all possible extensions in this other directory
            for check_ext in extensions_to_check:
                other_filename = f"{unique_model_slug}{check_ext}"
                other_path = os.path.join(other_part_dir, other_filename)
                if os.path.exists(other_path):
                    # Found the file on disk! Let's compress and save it as a .jpg in the allocated partition
                    try:
                        from PIL import Image
                        with Image.open(other_path) as img:
                            # Convert transparent modes to standard RGB
                            if img.mode in ("RGBA", "P"):
                                bg = Image.new("RGB", img.size, (255, 255, 255))
                                if img.mode == "RGBA":
                                    bg.paste(img, mask=img.split()[3])
                                else:
                                    bg.paste(img)
                                img = bg
                            elif img.mode != "RGB":
                                img = img.convert("RGB")
                            
                            # Resize down if either dimension exceeds 1000px
                            max_size = 1000
                            width, height = img.size
                            if width > max_size or height > max_size:
                                if width > height:
                                    new_width = max_size
                                    new_height = int(height * (max_size / width))
                                else:
                                    new_height = max_size
                                    new_width = int(width * (max_size / height))
                                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                            
                            img.save(local_path, "JPEG", quality=80, optimize=True)
                        
                        # Delete the old file if it was in a different path or had a different extension
                        if other_path != local_path:
                            os.remove(other_path)
                            print(f"  [COMPRESSED & MOVED] Optimized '{other_filename}' from '{other_part_name}' to '{allocated_partition}/{filename}' ({os.path.getsize(local_path) // 1024} KB)")
                        else:
                            print(f"  [COMPRESSED] Optimized '{filename}' in-place ({os.path.getsize(local_path) // 1024} KB)")
                        
                        model["img_url"] = relative_path
                        skipped += 1
                        found_and_reorganized = True
                    except Exception as e:
                        print(f"  [WARNING] Failed to compress existing file {other_filename}: {e}")
                    break
            
            if found_and_reorganized:
                break
                
            # If the directory doesn't exist, we stop checking further increments
            if not os.path.exists(other_part_dir):
                break
            other_part_idx += 1

        if found_and_reorganized:
            continue

        # 4. If file is not found anywhere on disk, fetch, compress, and download/import it
        try:
            if is_local_file:
                with open(img_url, "rb") as lf:
                    img_data = lf.read()
                success = compress_and_save_image(img_data, local_path)
                if success:
                    model["img_url"] = relative_path
                    downloaded += 1
                    print(f"  [{downloaded}] Imported & Compressed Local Image: {allocated_partition}/{filename} ({os.path.getsize(local_path) // 1024} KB)")
                else:
                    failed += 1
            else:
                resp = session.get(img_url, timeout=15)
                if resp.status_code == 200:
                    success = compress_and_save_image(resp.content, local_path)
                    if success:
                        model["img_url"] = relative_path
                        downloaded += 1
                        print(f"  [{downloaded}] Downloaded & Compressed: {allocated_partition}/{filename} ({os.path.getsize(local_path) // 1024} KB)")
                    else:
                        failed += 1
                else:
                    print(f"  [WARNING] Failed status {resp.status_code} for: {model['name']}")
                    failed += 1
        except Exception as e:
            if is_local_file:
                print(f"  [WARNING] Error reading local file {img_url}: {e}")
            else:
                print(f"  [WARNING] Error downloading {model['name']}: {e}")
            failed += 1

    # Clean up empty partition directories
    for part_name in list(partition_file_counts.keys()):
        part_dir = os.path.join(base_images_dir, part_name)
        if os.path.exists(part_dir) and not os.listdir(part_dir):
            try:
                os.rmdir(part_dir)
                print(f"  [CLEANUP] Removed empty directory: '{part_name}'")
            except Exception:
                pass

    # Clean up orphaned/unused files in the images directory to keep the repository pristine
    active_paths = set(model["img_url"] for model in models if model.get("img_url") and not model["img_url"].startswith("http"))
    
    print("\n--------------------------------------------------------------")
    print("Performing workspace housecleaning: removing orphaned images...")
    print("--------------------------------------------------------------")
    
    removed_count = 0
    for root, dirs, files in os.walk(base_images_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # Calculate the relative path from the root of the workspace (one level above base_images_dir)
            rel_file_path = os.path.relpath(file_path, os.path.dirname(base_images_dir)).replace("\\", "/")
            if rel_file_path not in active_paths:
                try:
                    os.remove(file_path)
                    print(f"  [CLEANUP] Deleted orphaned image: '{rel_file_path}'")
                    removed_count += 1
                except Exception:
                    pass
                    
    print(f"Housecleaning complete: {removed_count} orphaned files deleted.")
    print("--------------------------------------------------------------\n")

    print("--------------------------------------------------------------")
    print(f"Local Image sync complete: {downloaded} downloaded, {skipped} skipped, {failed} failed.")
    print("--------------------------------------------------------------\n")

if __name__ == "__main__":
    parse_catalog()
