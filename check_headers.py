import os
import json
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

load_dotenv()

def check_headers():
    try:
        scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        
        # scopes = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        
        # if 'GSPREAD_SERVICE_ACCOUNT' in os.environ:
        #     creds_json = json.loads(os.environ['GSPREAD_SERVICE_ACCOUNT'])
        #     creds = Credentials.from_service_account_info(creds_json, scopes=scopes)
        # else:
            # print("No credentials found in env.")
            # return
        
        creds = Credentials.from_service_account_file('credentials.json', scopes=scopes)

        gc = gspread.authorize(creds)
        sh = gc.open("100_calls") # WORKBOOK_100_CALLS
        worksheet = sh.worksheet("100_calls_new") # TAB_100_CALLS
        
        headers = worksheet.row_values(2)
        with open("headers_output.txt", "w") as f:
            f.write(f"Headers: {headers}\n")
            f.write(f"Total rows: {worksheet.row_count}\n")
        print("Output written to headers_output.txt")

    except Exception as e:
        with open("headers_output.txt", "w") as f:
            f.write(f"Error: {e}\n")
        print(f"Error: {e}")

if __name__ == "__main__":
    check_headers()
