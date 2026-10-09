# Aura — Financial Safety Companion

Aura is a calm, accessible financial safety companion designed specifically for neurodivergent individuals. It simplifies banking data into spoken alerts and accessible visual formats, providing a secure and supportive environment for managing finances.

## Key Features

- **Adaptive Vision Profiles**: Tailored UI profiles catering to different visual and cognitive needs, including:
  - Standard Vision
  - Glaucoma & Macular Profiles
  - Total Blindness Support
  - ADHD (Focus Lock)
  - Dyslexia (Legibility)
- **Aura Mode (High Contrast)**: An enhanced accessibility mode for clear, distraction-free interaction.
- **Voice Assistant**: An integrated voice companion ("Talk to Aura") that can provide financial briefings and read aloud data using natural-sounding text-to-speech.
- **Biometric Stress Monitoring (TRIBE v2 Integration)**: Simulates Apple Watch bridge integration to monitor heart rate (BPM) and HRV. The app dynamically adapts its UI (e.g., activating a simplified UI or a Scam Shield) when stress spikes are detected.
- **Guardian Link**: A feature that allows a trusted family member or guardian to receive notifications and monitor safety statuses (e.g., for unusually large transactions).
- **Market Pulse**: Real-time stock checking and trend analysis.

## Tech Stack

### Frontend
- **HTML / Vanilla CSS / JavaScript**
- **Vite**: Build tool and development server.
- **Firebase**: Backend as a Service (BaaS) for data and authentication.

### Backend (Voice Server)
- **Python / Flask**: API server handling external service integrations.
- **edge-tts**: Microsoft Azure Neural Voices for high-quality text-to-speech generation.
- **yfinance**: Real-time market data fetching.

## Project Structure

- `index.html`: Main application shell containing the UI structure and accessible elements.
- `css/`: Contains styling including standard mode, aura mode, animations, and medical modes.
- `js/`: Core application logic and agents (e.g., `app.js`, `trend-agent.js`).
- `voice-server/`: Python backend for TTS generation, biometric data simulation, and market data queries.
  - `server.py`: Flask API entry point.
  - `audio_cache/`: Local cache directory for generated speech MP3s.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Python 3](https://www.python.org/)

### 1. Setup the Frontend
```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will run on `http://localhost:3000` (or another port provided by Vite).

### 2. Setup the Voice Server (Backend)
```bash
cd voice-server

# Create and activate a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install Python requirements
pip install -r requirements.txt

# Start the Flask server
python server.py
```
The voice server will run on `http://localhost:5050`.

## Scripts

- `npm run dev`: Starts the local frontend development server.
- `npm run build`: Builds the app for production.
- `npm run preview`: Previews the production build locally.
- `npm run test`: Runs tests via Vitest.

## Usage

Once both servers are running, access the web interface. You can experiment with different accessible modes via the header controls. Trigger demo functions like a "Simulate Watch Stress Spike" or a large transaction to observe how the app adapts and notifies the Guardian Link.
