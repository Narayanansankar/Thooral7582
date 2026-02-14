import os
import logging
from tts_service import tts_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_tts():
    logger.info("Testing TTS Service...")
    
    # Test English
    text_en = "Hello, this is a test from the server."
    logger.info(f"Generating audio for: '{text_en}' (English)")
    audio_en = tts_service.generate_speech(text_en, "English")
    
    if audio_en:
        logger.info(f"SUCCESS: Generated English audio ({len(audio_en)} bytes base64)")
    else:
        logger.error("FAILURE: Could not generate English audio.")

    # Test Tamil (if configured)
    text_ta = "வணக்கம், இது ஒரு சோதனை."
    logger.info(f"Generating audio for: '{text_ta}' (Tamil)")
    audio_ta = tts_service.generate_speech(text_ta, "Tamil")
    
    if audio_ta:
        logger.info(f"SUCCESS: Generated Tamil audio ({len(audio_ta)} bytes base64)")
    else:
        logger.error("FAILURE: Could not generate Tamil audio.")

if __name__ == "__main__":
    test_tts()
