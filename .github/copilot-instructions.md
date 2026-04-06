# Aura — Copilot Instructions

## Project Overview
Aura is a **financial safety companion PWA** designed for neurodivergent individuals and seniors with cognitive decline. It simplifies complex banking data into calm, spoken alerts using Microsoft's neural TTS voices.

## Architecture

### Frontend (Vite PWA)
- **Location**: `aura/` root directory
- **Entry**: `index.html` → loads `js/app.js` as ES module
- **Dev server**: `npm run dev` on port 3000
- **Proxy**: `/api/*` routes proxy to Python voice server at `http://127.0.0.1:5050`

### Voice Server (Python Flask)
- **Location**: `aura/voice-server/server.py`
- **Port**: 5050
- **Voice**: `en-US-AvaNeural` at `-10%` rate, `-5Hz` pitch
- **Caches**: SHA256-based audio caching in `voice-server/audio_cache/`
- **Internet Agent**: Exposes `/api/stock_check` which dynamically hits `yfinance` to parse live US market data.
- **Biometric Hub (TRIBE v2)**: Exposes `/watch_sync` to ingest real-time JSON packets (Heart Rate, HRV, App Context) from an Apple Watch iOS Shortcut to perform dynamic stress mapping and trigger UI changes.

### Module Structure
js/
├── app.js              # Main controller — boots all modules, sets up events
├── auth.js             # Mock Firebase authentication and tutorial overlay states
├── data-layer.js       # Firestore-compatible local data access (JSON-backed)
├── finance-engine.js   # Core finance logic (balance, safety, spending, briefings)
├── indent-engine.js    # NLP voice command regex handling
├── pages.js            # View controller (Talk, Scan, Safety, Family)
├── trend-agent.js      # Trend-Guard Market Predictor (Anomaly detection)
├── transaction-monitor.js  # Watches for $200+ transactions, triggers alerts
├── ui-manager.js       # Medial profiles, mode switching, localStorage persistence
└── voice-bridge.js     # Connects to edge-tts API, falls back to SpeechSynthesis
```

### CSS Architecture
```
css/
├── design-tokens.css   # Two complete palettes (Standard + Aura), spacing, typography
├── standard-mode.css   # Glassmorphism dashboard, ambient orbs, Guardian styles
├── aura-mode.css       # WCAG AAA high-contrast overrides, Liberty HUD
├── medical-modes.css   # Medical profile transformations (Glaucoma, Macular)
├── animations.css      # Entrance animations, pulses, reduced-motion support
├── auth.css            # Login and tutorial overlay styles
└── pages.css           # Sub-page and Component level structure
```

## Key Design Decisions

### Universal Design — Two UI Modes
The app has two presentation modes that share the same finance logic:

1. **Standard Mode** (`body.standard-mode`)
   - Dark navy glassmorphism dashboard
   - Subtle ambient gradient orbs
   - Moderate text sizes, soft animations
   - Optional voice summaries

2. **Aura Mode (Liberty HUD)** (`body.aura-mode`)
   - Near-black background, yellow accent, pure white text
   - Secondary metrics hidden. Replaces Balance with "Daily Allowance"
   - Single "focused" transaction cards with Memory Map photos
   - Constant voice guidance
   - WCAG AAA contrast ratios

### Dynamic Medical Vision Engine (Cognitive Sight)
Aura adapts to specific physical impairments using `medical-modes.css`:
- **Glaucoma:** `.medical-glaucoma` applies radical vignette blackout overlays and forces layout tuning toward the absolute vertical center.
- **Macular Degeneration:** `.medical-macular` applies a central scotoma blur (blind spot) and splits grid layouts to the extreme edges.
- **Total Blindness:** `.medical-total_blindness` drops app shell opacity to 0 turning the screen black (for privacy/battery) and heavily asserts VoiceOver / auditory taps.
- **Neurotypical (None):** The "Normal" user profile. Globally suppresses all non-emergency `speak()` calls via a `localStorage` check in `voice-bridge.js`. Aura only intervenes for high-stress Scam Shield alerts.

### Guardian System (Family Notifications)
- **Guardian Link**: Green dot in header showing active family connection
- **Alert Toast**: Shows "Guardian has been notified" on large transactions
- **Guardian Toast**: Simulated second-device notification (slides in bottom-right after 1.5s delay)
- **Purpose**: Demonstrates the "Continuum of Care" concept for hackathon pitch

### Voice System
- Primary: Python Flask API using `edge-tts` (Microsoft Azure Neural Voices)
- Fallback: Browser `SpeechSynthesis` API if voice server is unavailable
- Audio queue for sequential playback
- Visual "Aura is speaking..." indicator with equalizer bars

### Data Layer
- Local JSON (`data/dummy-data.json`) mirrors Firestore structure
- Collections: `accounts`, `transactions`, `alerts`
- API mirrors Firestore: `getDoc()`, `getDocs()`, `onSnapshot()`, `addDoc()`
- `simulateTransaction()` for demo purposes — updates balance and generates alerts

## Coding Conventions
- ES Modules (`type: "module"` in package.json)
- CSS custom properties via `var(--token-name)`
- DOM refs prefixed with `$` (e.g., `$balanceValue`)
- Private functions prefixed with `_` (e.g., `_renderBalance()`)
- Console logs use `[ModuleName]` prefix (e.g., `[Aura]`, `[VoiceBridge]`)
- All interactive elements have ARIA labels and unique IDs
- All buttons meet 44px minimum tap target (56px in Aura Mode)

## Running the App
```bash
# Terminal 1 — Voice Server
cd aura
python voice-server/server.py

# Terminal 2 — Frontend
cd aura
npm run dev

# Terminal 3 — Unit Tests
cd aura
npm test

# Verify TTS capabilities locally
cd aura
python tests.py
```

## Important Notes
- The app is a **PWA** (Progressive Web App), not Flutter — designed to be installable on phone home screens
- Font loading via Google Fonts: Inter (body) + DM Sans (headings)
- The demo button "Simulate $200+ Transaction" triggers the full alert flow: voice alert + alert toast + guardian notification
- The "Demo Stock Drop" button triggers the `Trend-Guard` Agent via the `aura-market-drop` event hook.
- Unit Testing is implemented via `vitest` against `finance-engine.js`.
- Standalone TTS testing via `pygame` and `edge_tts` is stored in the `tests.py` root script.
