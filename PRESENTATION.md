# 🎙️ RAPID-100: AI-Powered Emergency Response System
## Next-Gen Dispatch for Thoothukudi District Police

---

## 1. 🚨 The Problem
**Why current systems fall short during critical moments.**

*   **Language Barrier**: Callers in panic often speak **"Tanglish"** (Tamil + English mixed). Traditional systems fails to transcribe or translate this accurately.
*   **Manual Latency**: Dispatchers manually type details, leading to a **30-60 second delay** in creating a report.
*   ** vague Locations**: Callers give landmark-based locations (e.g., *"Near the old temple"*), which standard GPS systems often miss.
*   **Data Silos**: Incident data is trapped in voice logs and paper records, making real-time heatmaps impossible.

---

## 2. 🛡️ The Solution: RAPID-100
**Real-time AI-Powered Incident Dispatch System**

A "Force Multiplier" dashboard that listens, understands, and acts.

### 🌟 Key Capabilities
1.  **🎙️ Real-time "Tanglish" Transcription**: 
    *   Powered by **Gemini 1.5 Flash**.
    *   Understands mixed language streams instantly.
2.  **🧠 Smart Triage**:
    *   **Sentiment Analysis**: Detects Panic, Crying, or Aggression.
    *   **Auto-Priority**: Assigns P1 (Critical) to P4 (Info) automatically.
3.  **📍 Context-Aware Geocoding**:
    *   Extracts landmarks and converts them to coordinates.
    *   **Local Fallback**: Instant offline resolution for major cities (Chennai, Thoothukudi, etc.).
4.  **🗣️ Native AI Voice**:
    *   Generates calming, automated responses in the caller's native language using **Google TTS**.

---

## 3. 🏗️ System Architecture
**From Call to Dispatch in Milliseconds.**

![Detailed Architecture](architecture.png)

### Data Flow
1.  **Input**: Browser captures audio via `MediaRecorder` API.
2.  **Stream**: Audio chunks sent via **WebSockets (Socket.IO)** to Flask Server.
3.  **Process**: 
    *   **AI Service** sends audio to **Gemini 1.5**.
    *   Returns JSON: `{ transcription, intent, sentiment, priority, location }`.
4.  **Action**:
    *   **TTS Service** generates audio response.
    *   **Geocoding** maps location -> Lat/Lon.
5.  **Persistence**: Data saved to **Google Sheets** for permanent record.

---

## 4. 🛠️ Tech Stack
**Built for Speed and Reliability.**

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | HTML5, JS, Leaflet | Real-time Dashboard & Map |
| **Backend** | Python Flask | API & WebSocket Server |
| **AI Core** | **Google Gemini 1.5** | Speech-to-Text & NLU |
| **Voice** | Google Cloud TTS | Natural sounding responses |
| **Database** | Google Sheets API | Cloud-native persistence |
| **Maps** | Google Maps API | Precise Geocoding |

---

## 5. 🎬 Live Demo Walkthrough

### Scenario: "Road Accident in Anna Nagar"

1.  **The Call**: 
    *   *Caller (in Tanglish)*: "Sir! Inga Anna Nagar la oru periya accident! Please help immediately!"
2.  **The Dashboard**:
    *   **Status**: Updates to 🔴 **Recording**.
    *   **Transcription**: Appears in real-time.
    *   **AI Analysis**: 
        *   **Intent**: `Road Accident`
        *   **Priority**: `P1 - Critical`
        *   **Sentiment**: `Panic`
3.  **The Response**:
    *   System plays audio: *"Help is on the way. Please stay safe."* (in Tamil/English).
4.  **The Dispatch**:
    *   Dispatcher clicks **"Confirm & Dispatch"**.
    *   Incident is logged to database and pinned on the **Live Map**.

---

## 6. 🚀 Future Roadmap

*   **Offline First**: Run quantization models (Gemini Nano) directly on edge devices.
*   **Media Integration**: Allow callers to upload photos/videos of the scene.
*   **WhatsApp Bot**: Citizen reporting via WhatsApp API.
*   **IoT Triggers**: Auto-dispatch from crash detection sensors in vehicles.

---
*Built for the TN Police Hackathon 2025*
