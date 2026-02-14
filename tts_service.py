import os
import json
import base64
import logging
from google.cloud import texttospeech
from google.oauth2 import service_account

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initializes the TextToSpeechClient with available credentials."""
        try:
            # 1. Try GSPREAD_SERVICE_ACCOUNT (from .env) if available
            # This is common in this project structure
            creds_json_str = os.environ.get('GSPREAD_SERVICE_ACCOUNT')
            if creds_json_str:
                try:
                    creds_dict = json.loads(creds_json_str)
                    credentials = service_account.Credentials.from_service_account_info(creds_dict)
                    self.client = texttospeech.TextToSpeechClient(credentials=credentials)
                    logger.info("TTSService initialized with GSPREAD_SERVICE_ACCOUNT credentials.")
                    return
                except Exception as e:
                    logger.warning(f"Failed to load GSPREAD_SERVICE_ACCOUNT for TTS: {e}")

            # 2. Fallback to Application Default Credentials (ADC)
            # This handles GOOGLE_APPLICATION_CREDENTIALS env var automatically
            self.client = texttospeech.TextToSpeechClient()
            logger.info("TTSService initialized with default credentials.")
            
        except Exception as e:
            logger.error(f"Failed to initialize TTSService: {e}")
            self.client = None

    def generate_speech(self, text, language_code="en-IN"):
        """
        Generates audio from text using Google Cloud TTS.
        Returns base64 encoded audio string (MP3).
        """
        if not self.client:
            logger.error("TTS Client not initialized.")
            return None

        if not text:
            return None

        try:
            # Map detect language to Google Cloud TTS language codes
            # Ensure these match available voices
            target_lang = "en-IN"
            voice_name = "en-IN-Wavenet-C" # Default English (Female)

            if language_code == "Tamil":
                target_lang = "ta-IN"
                voice_name = "ta-IN-Wavenet-D" # Female (Better quality)
            elif language_code == "Tanglish":
                target_lang = "ta-IN" # Use Tamil voice for Tanglish
                voice_name = "ta-IN-Wavenet-D"
            
            # Prepare synthesis input
            synthesis_input = texttospeech.SynthesisInput(text=text)

            # Build voice params
            voice = texttospeech.VoiceSelectionParams(
                language_code=target_lang,
                name=voice_name
            )

            # Select audio file type
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=1.0 # Natural speed
            )

            # Perform the text-to-speech request
            response = self.client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )

            # Return the binary audio content as base64 string
            return base64.b64encode(response.audio_content).decode("utf-8")

        except Exception as e:
            logger.error(f"Error generating TTS: {e}")
            return None

# Singleton instance for import
tts_service = TTSService()
