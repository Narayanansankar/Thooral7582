
import os
from dotenv import load_dotenv
import pathlib
env_path = pathlib.Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
import json
import gspread
from google.oauth2.service_account import Credentials

WORKBOOK_100_CALLS = "100_calls"
TAB_100_CALLS = "100_calls_new"

def inspect():
    try:
        scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        env_creds = os.environ.get('GSPREAD_SERVICE_ACCOUNT')
        
        if env_creds:
            creds_json = json.loads(env_creds)
            creds = Credentials.from_service_account_info(creds_json, scopes=scopes)
        elif os.path.exists('credentials.json'):
            creds = Credentials.from_service_account_file('credentials.json', scopes=scopes)
        else:
            print("No GSPREAD_SERVICE_ACCOUNT in env AND no credentials.json found")
            return

        gc = gspread.authorize(creds)
        try:
            sh = gc.open(WORKBOOK_100_CALLS)
            ws = sh.worksheet(TAB_100_CALLS)
            headers = ws.row_values(1)
            row2 = ws.row_values(2)
            
            with open('headers.txt', 'w') as f:
                f.write(f"HEADERS: {headers}\n")
                f.write(f"ROW 2: {row2}\n")
            print("Written to headers.txt")

        except Exception as e:
            print(f"Sheet Error: {e}")

    except Exception as e:
        print(f"Sheet Error: {e}")

if __name__ == '__main__':
    inspect()
