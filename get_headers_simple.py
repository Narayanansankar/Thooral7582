import os
import json
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
load_dotenv()

def get_headers():
    scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
    
    # Try env var first
    creds_json = os.environ.get('GSPREAD_SERVICE_ACCOUNT')
    if creds_json:
        print("Using Env Var Credentials")
        creds = Credentials.from_service_account_info(json.loads(creds_json), scopes=scopes)
    elif os.path.exists('credentials.json'):
        print("Using credentials.json")
        creds = Credentials.from_service_account_file('credentials.json', scopes=scopes)
    else:
        print("ERROR: No credentials found.")
        return

    try:
        gc = gspread.authorize(creds)
        sh = gc.open("100_calls")
        ws = sh.worksheet("100_calls_new")
        headers = ws.row_values(2)
        with open('headers.json', 'w') as f:
            json.dump(headers, f)
        print("Written to headers.json")
    except Exception as e:
        print(f"Error accessing sheet: {e}")

if __name__ == "__main__":
    get_headers()
