import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

try:
    models = []
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            models.append(m.name)
    
    with open("available_models.txt", "w") as f:
        f.write("\n".join(models))
    print(f"Successfully wrote {len(models)} models to available_models.txt")
except Exception as e:
    with open("available_models.txt", "w") as f:
        f.write(f"Error: {e}")
    print(f"Error: {e}")
