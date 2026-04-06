import asyncio
import edge_tts
import pygame
import os

TEXT = "Alert. I have detected a two thousand dollar transfer to an unrecognized vendor. I have paused your card for your safety. Would you like to verify this transaction?"
VOICE = "en-US-AvaNeural"
OUTPUT_FILE = "aura_alert.mp3"

async def aura_speak():
    # 1. Generate the high-quality voice
    communicate = edge_tts.Communicate(TEXT, VOICE, rate="-10%")
    await communicate.save(OUTPUT_FILE)

    # 2. Play it immediately and smoothly using pygame
    pygame.mixer.init()
    pygame.mixer.music.load(OUTPUT_FILE)
    pygame.mixer.music.play()

    print("📢 Aura is speaking...")
    while pygame.mixer.music.get_busy():
        continue
        
    # 3. Clean up
    pygame.mixer.quit()
    
    # Optional: clean up the generated mp3 file if you don't want it lingering
    # if os.path.exists(OUTPUT_FILE):
    #     os.remove(OUTPUT_FILE)

if __name__ == "__main__":
    asyncio.run(aura_speak())
