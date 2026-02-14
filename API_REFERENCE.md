# 📡 RAPID-100 API Reference

This document outlines the backend API routes available in the Flask application (`app.py`).

## 🔐 Authentication

Most routes are protected by `@login_required` and require an active session.
Default Credentials: `admin` / `admin`.

## 🔄 Real-time Communication (SocketIO)

*   **Namespace**: `/`
*   **Event: `audio_chunk`**
    *   **Input**: Binary audio data (Linear16 PCM).
    *   **Process**: Streams chunks to Google Gemini for real-time analysis.
*   **Event: `analysis_result`**
    *   **Output**: JSON object containing:
        *   `transcription`: Thanglish text.
        *   `sentiment`: Detected emotion.
        *   `priority`: P1/P2/P3/P4.
        *   `type`: Incident classification.
        *   `suggested_response`: English text for dispatcher.
        *   `audio_response`: Binary audio blob (TTS) for playback.

## 🛣️ HTTP Routes

### 1. Dashboard & Views

#### `GET /`
*   **Description**: Renders the main command dashboard.
*   **Response**: HTML (`index.html`).

#### `GET /dispatch`
*   **Description**: Renders the Dispatch Console for handling calls.
*   **Response**: HTML (`dispatch.html`).

### 2. Data Persistence

#### `POST /submit_dispatch`
*   **Description**: Saves a confirmed incident report to Google Sheets.
*   **Auth**: Required.
*   **Payload (JSON)**:
    ```json
    {
      "priority": "P1",
      "type": "Road Accident",
      "transcription": "Accident in Anna Nagar...",
      "sentiment": "Panic",
      "suggested_response": "Help is on the way...",
      "dispatch_recommendation": "Police Station X",
      "landmark": "Near bus stop",
      "location_raw": "Anna Nagar"
    }
    ```
*   **Process**:
    1.  Geocodes the location (via Google Maps API or Local Fallback).
    2.  Authenticates with Google Sheets API.
    3.  Appends a new row to the `100_calls` sheet.
*   **Response**:
    ```json
    {
      "status": "success",
      "message": "Incident dispatched and saved.",
      "latitude": "13.0827",
      "longitude": "80.2707"
    }
    ```

### 3. Data Retrieval

#### `GET /api/data/<sheet_name>`
*   **Description**: Fetches historical data for the dashboard visualization.
*   **Params**: `sheet_name` (e.g., `100_calls_new`, `Robbrey-theft`, `Hurt`).
*   **Response**: JSON object with filtering metadata and raw data rows.
