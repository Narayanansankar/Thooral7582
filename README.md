# 🚨 RAPID-100: AI-Powered Emergency Response System

**RAPID-100** is a next-generation emergency dispatch dashboard designed for the Thoothukudi District Police. It leverages Generative AI to provide real-time audio transcription, sentiment analysis, and automated triage for incoming emergency calls.

## 🌟 Key Features

*   **🎙️ Real-time Transcription**: Supports **Tanglish** (Tamil + English) audio streams, accurately transcribing mixed-language calls.
*   **🧠 AI Intelligence**: Powered by **Google Gemini 1.5 Flash** to detect:
    *   **Intent**: (e.g., Road Accident, Fire, Theft)
    *   **Sentiment**: (e.g., Panic, Aggressive, Calm)
    *   **Priority**: Auto-triage (P1 - Critical to P4 - Information)
*   **📍 Smart Geocoding**: Extracts location details (landmarks) and converts them to coordinates using **Google Maps API** (with local fallback for major cities).
*   **🗺️ Live Dispatch Map**: Visualizes incidents on an interactive Leaflet map with police station boundaries.
*   **💾 Cloud Persistence**: Automatically saves incident reports to **Google Sheets** for real-time record keeping.
*   **🗣️ Native TTS**: Generates calming, automated verbal responses in the caller's native language.

## 🛠️ System Architecture

See [Architecture Diagram](architecture_diagram.md) for a detailed visual breakdown.

## 🚀 Installation & Setup

### Prerequisites
*   Python 3.10+
*   Google Cloud Project (with Gemini & Maps APIs enabled)
*   Google Service Account (for Sheets API)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd crimedash
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_maps_api_key
SECRET_KEY=your_flask_secret
ADMIN_PASSWORD=admin
# Optional (if not using credentials.json)
# GSPREAD_SERVICE_ACCOUNT={...json_content...}
```

### 3. Google Sheets Setup
*   Ensure you have a `credentials.json` file for your Google Service Account.
*   Share your Google Sheet with the service account email.
*   Update `WORKBOOK_100_CALLS` in `app.py` if needed.

## 🏃‍♂️ Running the Application

Start the Flask server with SocketIO support:

```bash
python app.py
```

*   **Dispatch Console**: `http://localhost:5000/dispatch` (Login: `admin` / `admin`)
*   **Command Dashboard**: `http://localhost:5000/`

## 📡 API Endpoints

See [API Reference](API_REFERENCE.md) for details on backend routes.

## 🗺️ Project Structure

*   `app.py`: Main Flask application handling routes and WebSockets.
*   `ai_service.py`: Interface for Google Gemini API.
*   `tts_service.py`: Text-to-Speech generation service.
*   `static/`: Frontend assets (JS, CSS, Images).
    *   `js/dispatch.js`: Handles audio recording and dispatch logic.
    *   `script.js`: Manages the main dashboard map and analytics.
*   `templates/`: HTML templates.

---
*Built for the TN Police Hackathon 2025*
