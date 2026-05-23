import os
import re
import json
import ssl
import urllib.request
import urllib.parse
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

# Config file to store Google Apps Script Web App URL
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "add_model_config.json")

# Creator tab mapping (Cults3D username -> Spreadsheet Sheet Page Name)
CREATOR_TAB_MAP = {
    "carlose": "CA3D Models",
    "tanukifigures": "Tanuki",
    "bulkamancer": "Bulkamancer",
    "bulkamancer-3d": "Bulkamancer"
}

# Standard creator label map (Cults3D username -> Display Name)
CREATOR_DISPLAY_MAP = {
    "carlose": "CA3D Studios",
    "tanukifigures": "Tanuki Figures",
    "bulkamancer": "Bulkamancer",
    "bulkamancer-3d": "Bulkamancer"
}

# ANSI Console Colors for gorgeous terminal experience
COLOR_GREEN = "\033[92m"
COLOR_CYAN = "\033[96m"
COLOR_YELLOW = "\033[93m"
COLOR_RED = "\033[91m"
COLOR_MAGENTA = "\033[95m"
COLOR_BOLD = "\033[1m"
COLOR_RESET = "\033[0m"

def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    print(f"{COLOR_MAGENTA}{COLOR_BOLD}=============================================================={COLOR_RESET}")
    print(f"{COLOR_CYAN}{COLOR_BOLD}          InnocentZombiePrints - Cults3D Bulk Importer        {COLOR_RESET}")
    print(f"{COLOR_MAGENTA}{COLOR_BOLD}=============================================================={COLOR_RESET}\n")

def get_config():
    """Load configuration, prompt user for Apps Script URL if not set."""
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            pass

    web_app_url = config.get("web_app_url")
    if not web_app_url:
        print_header()
        print(f"{COLOR_YELLOW}Welcome! Let's set up your Google Sheets Apps Script URL first.{COLOR_RESET}")
        print("This is the URL you copied after deploying your Apps Script Web App.")
        print("It usually starts with: https://script.google.com/macros/s/.../exec\n")
        
        while True:
            url = input(f"{COLOR_BOLD}Paste Web App URL: {COLOR_RESET}").strip()
            if url.startswith("https://script.google.com/"):
                web_app_url = url
                config["web_app_url"] = web_app_url
                try:
                    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                        json.dump(config, f, indent=4)
                    print(f"\n{COLOR_GREEN}[SUCCESS] Web App URL saved to config!{COLOR_RESET}\n")
                    input("Press Enter to continue...")
                except Exception as e:
                    print(f"{COLOR_RED}Error saving config: {e}{COLOR_RESET}")
                break
            else:
                print(f"{COLOR_RED}Invalid URL. It must be a Google Script Web App URL.{COLOR_RESET}\n")
        clear_console()
    return web_app_url

def clean_base_name(name):
    """Strips common suffixes and formatting to extract the core model/character name."""
    # Clean case-insensitive mentions of 3d print, stl, bust, nsfw, spicy
    name = re.sub(r'(?i)\b3d\s*prints?\b', '', name)
    name = re.sub(r'(?i)\b3d\s*print\s*models?\b', '', name)
    name = re.sub(r'(?i)\bstl\s*models?\b', '', name)
    name = re.sub(r'(?i)\bbusts?\b', '', name)
    name = re.sub(r'(?i)\bnsfw\b', '', name)
    name = re.sub(r'(?i)\bspicy\b', '', name)
    name = re.sub(r'(?i)\bversion\b', '', name)
    # Remove parentheses containing keywords or empty parentheses
    name = re.sub(r'(?i)\(\s*(?:bust|nsfw|spicy|version|\s)*\)', '', name)
    # Remove trailing/leading hyphens, underscores, vertical bars, or spaces
    name = re.sub(r'[\s\-_|()]+$', '', name)
    name = re.sub(r'^[\s\-_|()]+', '', name)
    # Collapse multiple spaces to single space
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def scrape_cults_url(url):
    """Scrapes a single Cults3D URL and returns raw metadata dict or None."""
    if not url:
        return None
        
    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        if "cults3d.com" not in url:
            url = "https://cults3d.com/en/3d-model/" + url
        else:
            url = "https://" + url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context, timeout=12) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        # 1. Extract Raw Title
        title = "Unnamed Model"
        title_match = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', html)
        if not title_match:
            title_match = re.search(r'<meta\s+name=["\']og:title["\']\s+content=["\'](.*?)["\']', html)
        if title_match:
            title = title_match.group(1).strip()
            title = re.sub(r'\s*\|.*$', '', title).strip()

        # 2. Extract High-Res Image URL
        img_url = ""
        img_match = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']', html)
        if not img_match:
            img_match = re.search(r'<meta\s+name=["\']og:image["\']\s+content=["\'](.*?)["\']', html)
        if img_match:
            raw_img = img_match.group(1).strip()
            fbi_match = re.search(r'(https://fbi\.cults3d\.com/.*)', raw_img)
            if fbi_match:
                img_url = fbi_match.group(1)
            else:
                img_url = raw_img

        # 3. Extract Creator Username
        creator = "Unknown"
        creator_match = re.search(r'href=["\'](?:https://cults3d\.com)?/(?:[a-z]{2})/creators/([^"\'>/]+)["\']', html)
        if not creator_match:
            creator_match = re.search(r'href=["\'](?:https://cults3d\.com)?/(?:[a-z]{2})/users/([^"\'>/]+)["\']', html)
        if creator_match:
            creator = creator_match.group(1).strip()

        # 4. Classify Variant Type based on title and URL keywords
        url_lower = url.lower()
        title_lower = title.lower()
        
        is_bust = "bust" in url_lower or "bust" in title_lower
        is_spicy = "nsfw" in url_lower or "nsfw" in title_lower or "spicy" in url_lower or "spicy" in title_lower
        
        variant_type = "standard"
        if is_bust:
            variant_type = "bust"
        elif is_spicy:
            variant_type = "spicy"

        return {
            "raw_title": title,
            "img_url": img_url,
            "creator_user": creator,
            "url": url,
            "variant_type": variant_type
        }
    except Exception as e:
        return {"error": str(e), "url": url}

def build_row_array(sheet_name, data):
    """Formats raw values into the exact column list expected by the sheet template."""
    img_url = data.get("img_url", "") or ""
    name = data.get("name", "") or ""
    url = data.get("url", "") or ""
    bust_url = data.get("bust_url", "") or ""
    spicy_url = data.get("spicy_url", "") or ""
    category = "Uncategorized" # Hardcoded to Uncategorized as requested
    rank = data.get("rank", "") or ""
    file_location = data.get("file_location", "") or ""

    if sheet_name == "Tanuki":
        # 8 columns layout
        row = [""] * 8
        row[0] = img_url
        row[1] = "" # Handled by Apps Script
        row[2] = name
        row[3] = url
        row[4] = bust_url
        row[5] = spicy_url
        row[6] = category
        row[7] = file_location
    else:
        # CA3D Models / Bulkamancer (9 columns layout)
        row = [""] * 9
        row[0] = img_url
        row[1] = "" # Handled by Apps Script
        row[2] = name
        row[3] = url
        row[4] = bust_url
        row[5] = spicy_url
        row[6] = category
        row[7] = rank
        row[8] = file_location
    return row

def append_batch_to_google_sheet(web_app_url, sheet_name, rows):
    """Sends batch row data payload to Google Sheet Web App."""
    payload = {
        "sheetName": sheet_name,
        "rows": rows
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        data_json = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            web_app_url,
            data=data_json,
            headers=headers,
            method="POST"
        )
        context = ssl._create_unverified_context()
        # High timeout because Sheets =IMAGE() formulas sleep for 3s to render
        with urllib.request.urlopen(req, context=context, timeout=40) as response:
            resp_body = response.read().decode('utf-8')
            res = json.loads(resp_body)
            if res.get("status") == "success":
                return True, res.get("message")
            else:
                return False, res.get("message", "Unknown error")
    except Exception as e:
        return False, str(e)

def main():
    os.system("") 
    web_app_url = get_config()
    
    while True:
        clear_console()
        print_header()
        
        print(f"{COLOR_YELLOW}Paste all Cults3D URLs (one per line).{COLOR_RESET}")
        print("When you are finished pasting, press Enter on an empty line or press Ctrl+Z / Enter to submit:\n")
        
        lines = []
        while True:
            try:
                line = input().strip()
                if not line:
                    break
                lines.append(line)
            except EOFError:
                break
                
        # Clean and extract valid URLs
        raw_urls = []
        for line in lines:
            parts = line.split()
            for p in parts:
                p_clean = p.strip()
                if p_clean:
                    raw_urls.append(p_clean)
                    
        # Filter duplicates
        raw_urls = list(dict.fromkeys(raw_urls))
        
        if not raw_urls:
            print(f"\n{COLOR_RED}Error: No URLs pasted!{COLOR_RESET}")
            input("\nPress Enter to try again...")
            continue
            
        print(f"\n{COLOR_CYAN}Pasted {len(raw_urls)} unique URLs. Scraping pages concurrently using thread pool...{COLOR_RESET}")
        
        # Concurrently scrape Cults3D pages using ThreadPoolExecutor
        scraped_results = []
        errors = []
        completed_count = 0
        total_urls = len(raw_urls)
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_url = {executor.submit(scrape_cults_url, url): url for url in raw_urls}
            for future in as_completed(future_to_url):
                res = future.result()
                completed_count += 1
                percent = int((completed_count / total_urls) * 100)
                print(f"\rProgress: [{percent:3d}%] Scraped {completed_count}/{total_urls} URLs...", end="", flush=True)
                
                if res and "error" not in res:
                    scraped_results.append(res)
                else:
                    errors.append(res)
                    
        print(f"\n\n{COLOR_GREEN}[INFO] Scraping completed! Successful: {len(scraped_results)}, Failed: {len(errors)}{COLOR_RESET}")
        if errors:
            print(f"{COLOR_RED}Failed URLs:{COLOR_RESET}")
            for err in errors:
                print(f"  - {err.get('url')} ({err.get('error')})")
                
        if not scraped_results:
            print(f"\n{COLOR_RED}[ERROR] No URLs scraped successfully.{COLOR_RESET}")
            input("\nPress Enter to try again...")
            continue
            
        # Grouping and merging variants
        print(f"\n{COLOR_CYAN}Grouping and merging variants based on model base names...{COLOR_RESET}")
        
        merged_models = {}
        
        for item in scraped_results:
            raw_title = item["raw_title"]
            cleaned_name = clean_base_name(raw_title)
            creator_user = item["creator_user"].lower()
            
            group_key = (creator_user, cleaned_name)
            
            if group_key not in merged_models:
                sheet_name = CREATOR_TAB_MAP.get(creator_user)
                creator_display = CREATOR_DISPLAY_MAP.get(creator_user)
                
                if not sheet_name:
                    sheet_name = "CA3D Models" if "carlos" in creator_user else ("Tanuki" if "tanuki" in creator_user else "Bulkamancer")
                    creator_display = creator_user.title()
                
                merged_models[group_key] = {
                    "name": cleaned_name,
                    "creator": creator_display,
                    "creator_user": creator_user,
                    "sheet_name": sheet_name,
                    "img_url": item["img_url"],
                    "url": "",
                    "bust_url": "",
                    "spicy_url": "",
                    "category": "Uncategorized" # Fixed category as requested
                }
                
            model = merged_models[group_key]
            
            variant = item["variant_type"]
            if variant == "bust":
                model["bust_url"] = item["url"]
            elif variant == "spicy":
                model["spicy_url"] = item["url"]
            else:
                model["url"] = item["url"]
                if item["img_url"]:
                    model["img_url"] = item["img_url"]
                    
        final_models = list(merged_models.values())
        print(f"{COLOR_GREEN}Merged into {len(final_models)} unique model entries!{COLOR_RESET}")

        # Show preview and confirm
        clear_console()
        print_header()
        print(f"{COLOR_CYAN}{COLOR_BOLD}--- MODELS TO UPLOAD SUMMARY ({len(final_models)} items) ---{COLOR_RESET}")
        print(f"{COLOR_BOLD}{'Model Name':<22s} {'Creator':<16s} {'Category':<14s} {'Std':<3s} {'Bst':<3s} {'Spc':<3s}{COLOR_RESET}")
        print("-" * 70)
        for m in final_models:
            std_chk = "Yes" if m["url"] else "No"
            bust_chk = "Yes" if m["bust_url"] else "No"
            spicy_chk = "Yes" if m["spicy_url"] else "No"
            name_trunc = m["name"][:20] + ".." if len(m["name"]) > 21 else m["name"]
            print(f"{name_trunc:<22s} {m['creator'][:15]:<16s} {m['category'][:13]:<14s} {std_chk:<3s} {bust_chk:<3s} {spicy_chk:<3s}")
        print("-" * 70)
        
        confirm = input(f"\n{COLOR_YELLOW}{COLOR_BOLD}Upload all {len(final_models)} models to Google Sheets? (y/n): {COLOR_RESET}").strip().lower()
        
        if confirm == 'y' or confirm == 'yes':
            grouped_rows = {}
            for m in final_models:
                s_name = m["sheet_name"]
                if s_name not in grouped_rows:
                    grouped_rows[s_name] = []
                row_arr = build_row_array(s_name, m)
                grouped_rows[s_name].append(row_arr)
                
            print(f"\n{COLOR_CYAN}Uploading to Google Sheets in batches... Please wait (includes rendering delay)...{COLOR_RESET}")
            
            for tab_name, rows in grouped_rows.items():
                print(f"  Uploading {len(rows)} models to '{tab_name}' tab...", end="", flush=True)
                success, msg = append_batch_to_google_sheet(web_app_url, tab_name, rows)
                if success:
                    print(f" {COLOR_GREEN}✓ [SUCCESS]{COLOR_RESET}")
                else:
                    print(f" {COLOR_RED}✗ [ERROR: {msg}]{COLOR_RESET}")
                    
            print(f"\n{COLOR_GREEN}{COLOR_BOLD}[COMPLETE] Bulk upload process finished!{COLOR_RESET}")
            
            # Rebuild catalog database
            rebuild = input(f"\n{COLOR_YELLOW}Would you like to rebuild your web catalog database now? (y/n): {COLOR_RESET}").strip().lower()
            if rebuild == 'y' or rebuild == 'yes':
                print(f"\n{COLOR_CYAN}Running catalog compiler...{COLOR_RESET}")
                script_dir = os.path.dirname(os.path.abspath(__file__))
                fetch_script = os.path.join(script_dir, "fetch_google_sheet.py")
                try:
                    subprocess.run(["python", fetch_script], check=True)
                    print(f"\n{COLOR_GREEN}[SUCCESS] Web catalog database successfully compiled and synced!{COLOR_RESET}")
                except Exception as err:
                    print(f"\n{COLOR_RED}[ERROR] Failed to run catalog compiler: {err}{COLOR_RESET}")
        else:
            print(f"\n{COLOR_YELLOW}Addition cancelled.{COLOR_RESET}")
            
        input(f"\nPress Enter to start a new bulk import batch or Ctrl+C to exit...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{COLOR_YELLOW}Exiting InnocentZombie Importer. Goodbye!{COLOR_RESET}")
