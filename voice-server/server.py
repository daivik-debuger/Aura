"""
AURA Voice Server
Flask API for text-to-speech using edge-tts (Microsoft Azure Neural Voices)

Endpoints:
  POST /api/speak  — Generate speech audio from text
  GET  /api/health — Health check

Voice: en-US-AvaNeural at -10% rate with gentle pitch
"""

import asyncio
import hashlib
import os
import sys
import time
from pathlib import Path

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import edge_tts
import yfinance as yf
import json

# ── Configuration ────────────────────────────
VOICE = "en-US-AvaNeural"
RATE = "-10%"
PITCH = "-5Hz"
CACHE_DIR = Path(__file__).parent / "audio_cache"

# State for Apple Watch Bridge
last_stress_time = 0

app = Flask(__name__)
CORS(app) # Allow frontend dev server

# Ensure cache directory exists
CACHE_DIR.mkdir(exist_ok=True)


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "voice": VOICE,
        "rate": RATE,
        "pitch": PITCH
    })


@app.route('/stress_alert', methods=['POST'])
def stress_alert():
    """Triggered by Apple Watch Shortcuts when HR > 100"""
    global last_stress_time
    last_stress_time = time.time()
    print("🚨 STRESS DETECTED BY APPLE WATCH")
    return "Alert Received", 200


@app.route('/stress_status', methods=['GET'])
def stress_status():
    """Polled by frontend to check for recent stress spikes"""
    global last_stress_time
    # Check if a stress alert happened within the last 5 seconds
    if time.time() - last_stress_time < 5:
        last_stress_time = 0  # Consume the alert
        return jsonify({"stress": True})
    return jsonify({"stress": False})

# This simulates the TRIBE v2 Model processing the watch data
def tribe_v2_analysis(bpm, hrv, current_task):
    if bpm and bpm > 105 and current_task == "financial_review":
        return "STRESS_OVERLOAD"
    elif bpm and bpm > 110 and current_task == "unknown_caller":
        return "SCAM_ANXIETY_DETECTION"
    return "STABLE"

@app.route('/watch_sync', methods=['POST'])
def sync_watch_data():
    """Apple Watch Integration Endpoint for TRIBE v2"""
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No JSON provided"}), 400
        
    bpm = data.get('heart_rate')
    hrv = data.get('hrv')
    task = data.get('active_app_section', 'financial_review') 

    # Run the TRIBE v2 Analysis
    state = tribe_v2_analysis(bpm, hrv, task)

    if state == "STRESS_OVERLOAD":
        # We can also update last_stress_time to trigger the frontend's /stress_status polling
        global last_stress_time
        last_stress_time = time.time()
        
        return json.dumps({
            "action": "ACTIVATE_SIMPLIFIED_UI",
            "voice_prompt": "I see this is a lot of info. Let me hide the clutter for you.",
            "haptic_feedback": "gentle_pulse"
        })
    elif state == "SCAM_ANXIETY_DETECTION":
        last_stress_time = time.time()
        return json.dumps({
            "action": "ACTIVATE_SCAM_SHIELD",
            "voice_prompt": "Your heart rate is elevating. Initiating Scam Shield protocol.",
            "haptic_feedback": "triple_tap"
        })
        
    return json.dumps({"status": "monitoring"})

@app.route('/api/stock_check', methods=['GET'])
def stock_check():
    """
    Fetch real-time stock data from the internet.
    Query: ?symbol=AAPL
    """
    symbol = request.args.get('symbol', 'AAPL').upper()
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.history(period="1d")
        if info.empty:
            return jsonify({"text": f"I couldn't find active market data for {symbol} right now."})
            
        current_price = info['Close'].iloc[-1]
        open_price = info['Open'].iloc[-1]
        
        delta = current_price - open_price
        direction = "up" if delta >= 0 else "down"
        
        # Determine appropriate company name pronunciation if possible
        name_map = {"AAPL": "Apple", "MSFT": "Microsoft", "TSLA": "Tesla", "GOOGL": "Google", "AMZN": "Amazon"}
        spoken_name = name_map.get(symbol, symbol)
        
        message = f"I just checked the live market. {spoken_name} is currently trading at ${current_price:.2f}. It is {direction} ${abs(delta):.2f} since opening today."
        
        return jsonify({
            "symbol": symbol,
            "price": current_price,
            "delta": delta,
            "text": message
        })
    except Exception as e:
        return jsonify({"error": str(e), "text": f"I encountered an error looking up {symbol} on the live market."})

@app.route('/api/speak', methods=['POST'])
def speak():
    """
    Generate speech from text.
    
    Request body: { "text": "Hello world" }
    Response: audio/mpeg file
    """
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400
    
    text = data['text'].strip()
    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    
    if len(text) > 2000:
        return jsonify({"error": "Text too long (max 2000 chars)"}), 400
    
    # Check cache
    text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
    cache_path = CACHE_DIR / f"{text_hash}.mp3"
    
    if cache_path.exists():
        print(f"[Aura Voice] Cache hit: {text_hash}")
        return send_file(
            cache_path,
            mimetype='audio/mpeg',
            as_attachment=False
        )
    
    # Generate speech
    try:
        print(f"[Aura Voice] Generating: \"{text[:60]}...\"")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        communicate = edge_tts.Communicate(
            text,
            VOICE,
            rate=RATE,
            pitch=PITCH
        )
        loop.run_until_complete(communicate.save(str(cache_path)))
        loop.close()
        
        print(f"[Aura Voice] Saved: {cache_path.name}")
        
        return send_file(
            cache_path,
            mimetype='audio/mpeg',
            as_attachment=False
        )
        
    except Exception as e:
        print(f"[Aura Voice] Error: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("  AURA Voice Server")
    print(f"  Voice:  {VOICE}")
    print(f"  Rate:   {RATE}")
    print(f"  Pitch:  {PITCH}")
    print(f"  Cache:  {CACHE_DIR}")
    print("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5050,
        debug=True
    )
