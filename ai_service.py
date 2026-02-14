import os
import google.generativeai as genai
import json
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# System Prompt for "Expert Indian Dispatcher"
SYSTEM_PROMPT = """
You are an expert Emergency Dispatcher for India (RAPID-100 system).
Your task is to analyze real-time emergency audio and output structured JSON.

### CRITICAL INSTRUCTION:
You must understand **Tanglish** (Tamil + English). Users will often switch languages in panic.
**Role:** You are a PASSIVE TRANSCRIPTIONIST. Your job is ONLY to transcribe what the USER says. Do NOT hallucinate.

### Capabilities & Instructions:
1.  **Listen & Transcribe:** Accurately transcribe the user's speech in the original mixed language.
2.  **Language Resilience:** Translate the *intent* into clear English for the report.
3.  **Acoustic Analysis:**
    *   **Sentiment:** Detect emotional state (Panic, Calm, Crying, Whispering, Aggressive).
    *   **Background:** Identify sounds (Traffic, Sirens, Glass Breaking, Screams, Silence, Rain).
4.  **Triage Priority (P1-P4):**
    *   **P1 (Critical):** Life-threatening, Violence, Fire, Major Accident.
    *   **P2 (High):** Serious injury, potential escalation.
    *   **P3 (Medium):** Non-critical disputes, theft *after* the fact.
    *   **P4 (Low):** Noise complaints, information requests.
5.  **Location Extraction (Indian Context):**
    *   Extract specific **Landmarks** (e.g., "Opposite to Temple", "Near Ration Shop").
    *   Function: `extract_landmark(text)`.
    *   Do NOT just look for street names. Look for descriptive locations.
6.  **Dispatcher Script:** Generate a short, calming, and directive response for the dispatcher to say to the caller.
    *   **Style:** Empathetic but authoritative ("Customer Care" style).
    *   **Language:** Match the caller's language/dialect if possible, or use clear English.

### JSON Output Format:
{
  "transcription": "Original spoken text (or empty if silence)",
  "intent_english": "Clear English summary",
  "detected_language": "Tamil",
  "priority": "P1",
  "type": "Road Accident",
  "subtype": "Hit and Run",
  "location_raw": "Raw location text from user",
  "landmark": "Extracted landmark",
  "sentiment": "Panic",
  "background_audio": "Traffic noise",
  "suggested_response": "English response",
  "suggested_response_native": "Native language response",
  "police_alert": true,
  "dispatch_recommendation": "Dispatch recommendation"
}

IMPORTANT: 
- detected_language must be one of: "Tamil", "English", "Tanglish"
- Detect the primary language from the transcription
- Generate "suggested_response" in English (for dispatcher)
- Generate "suggested_response_native" in the CALLER'S DETECTED LANGUAGE (for TTS playback to caller)
- For mixed languages (Tanglish), use the dominant language for native response

Return ONLY VALID JSON. Do not include markdown formatting like ```json ... ```.
"""

class AIService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY environment variable not set!")
            self.model = None
            return

        genai.configure(api_key=api_key)
        
        # Try multiple model names as fallbacks (Updated with actual available models)
        model_candidates = [
            "gemini-2.0-flash", 
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash"
        ]
        self.model = None
        
        # Speed-optimized generation config
        self.generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.3,  # Lower = faster, more deterministic
            "max_output_tokens": 512,  # Limit output for speed
            "top_p": 0.8,
            "top_k": 20
        }
        
        for model_name in model_candidates:
            try:
                # Test if model is available by listing or creating
                # Note: list_models() is safer but creation is direct test
                m = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=SYSTEM_PROMPT,
                    generation_config=self.generation_config
                )
                logger.info(f"AIService initialized with model: {model_name}")
                self.model = m
                break
            except Exception as e:
                logger.warning(f"Failed to initialize {model_name}: {e}")
        
        if not self.model:
            logger.error("CRITICAL: Could not initialize ANY Gemini model.")
        
        # Store context for consistent language responses
        self.last_detected_language = None
        self.incident_memory = None # Stores {type, priority, timestamp}


    def process_audio(self, audio_data_base64):
        """
        Sends audio to Gemini and returns the JSON analysis.
        Args:
            audio_data_base64 (str): Base64 encoded audio data (WebM/WAV).
        """
        if not self.model:
            return {"error": "AI Service not configured"}

        try:
            # Skip if audio chunk is too small (likely silence or noise)
            import base64
            import math
            import struct
            
            audio_bytes = base64.b64decode(audio_data_base64)
            
            # 1. Size Check: Too small = silence
            if len(audio_bytes) < 5000:  # Increased to 5KB for better silence filtering
                logger.info("Skipping small audio chunk (size < 5KB)")
                return {"transcription": "", "priority": "P4", "skip": True}

            # 2. RMS Amplitude Check (Server-side VAD)
            # WebM encoding makes raw PCM parsing complex without external libraries.
            # We rely on the AI's "detected_language" filter to catch silence/noise.

            # Send to Gemini with timeout handling
            logger.info(f"Processing audio chunk ({len(audio_bytes)} bytes)...")
            
            # Construct prompt with language context
            prompt_parts = []
            
            # CRITICAL: Prevent hallucinations on silence
            prompt_parts.append("ROLE: You are a PASSIVE TRANSCRIPTIONIST. Your job is ONLY to transcribe what the USER says.\nINSTRUCTION: If the audio contains only SILENCE, BACKGROUND NOISE, HEAVY BREATHING, or STATIC, return 'detected_language': 'Unknown' and empty 'transcription'.\nCRITICAL: Do NOT hallucinate. Do NOT generate questions like 'Address sollunga'. Do NOT complete sentences. If no speech, return empty.")

            # --- CONTEXT INJECTION (Memory) ---
            if self.last_detected_language and self.last_detected_language != "English":
                prompt_parts.append(f"Language Context: The user previously spoke in {self.last_detected_language}. Please provide 'suggested_response_native' in {self.last_detected_language} if appropriate.")
            
            if self.incident_memory:
                 prompt_parts.append(f"INCIDENT HISTORY: The user previously reported a '{self.incident_memory.get('type')}' (Priority: {self.incident_memory.get('priority')}).\n"
                                     f"INSTRUCTION: If the user is now providing details (like location/address) for this SAME incident, MAINTAIN the Priority '{self.incident_memory.get('priority')}' and Type '{self.incident_memory.get('type')}'. "
                                     f"Merge the new info. Do NOT downgrade to 'Information/P4' if it clearly relates to the previous accident.")

            prompt_parts.append({"mime_type": "audio/webm", "data": audio_data_base64})

            # Generate content with strict parameters
            generation_config = {
                "temperature": 0.0,  # Max determinism to stop hallucinations
                "max_output_tokens": 512,
            }

            response = self.model.generate_content(prompt_parts, generation_config=generation_config)
            
            result = json.loads(response.text)
            
            # Post-processing filters
            transcription = result.get("transcription", "").strip()
            detected = result.get("detected_language", "Unknown")
            
            # 1. Block empty/unknown
            if detected == "Unknown" or not transcription:
                logger.info("AI detected silence/unknown language. Skipping.")
                return {"transcription": "", "priority": "P4", "skip": True}

            # 2. Block Known Hallucinations (Blacklist)
            hallucination_blacklist = ["siri", "google", "alexa", "copyright", "address sollunga", "vaanga sir", "enna problem", "hello", "test", "mic check"]
            if any(h in transcription.lower() for h in hallucination_blacklist):
                logger.info(f"Blocked hallucination: '{transcription}'")
                return {"transcription": "", "priority": "P4", "skip": True}

            # 3. Block tiny "breath" transcriptions (< 3 chars)
            if len(transcription) < 3:
                 logger.info(f"Blocked tiny transcription: '{transcription}'")
                 return {"transcription": "", "priority": "P4", "skip": True}

            if detected and detected not in ["English", "Unknown"]:
                self.last_detected_language = detected
                logger.info(f"Language context updated to: {detected}")

            # Update Memory if meaningful incident
            p_val = result.get('priority', 'P4')
            if p_val in ['P1', 'P2']:
                self.incident_memory = {
                    "type": result.get('type'),
                    "priority": p_val
                }
                logger.info(f"Updated Incident Memory: {self.incident_memory}")

            logger.info(f"AI Response received: {result.get('priority', 'N/A')} | Lang: {detected}")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            return {
                "transcription": "(Invalid AI response format)",
                "priority": "P4", 
                "error": "JSON decode error"
            }
        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            return {
                "transcription": "(Error processing audio)",
                "priority": "P4", 
                "error": str(e)
            }


# Singleton instance
ai_service = AIService()
