/* ============================================
   AURA — Voice Intent Engine
   Listens to user voice, parses intents,
   and triggers the appropriate action
   ============================================ */

import { speak } from './voice-bridge.js';

let _recognition = null;
let _isListening = false;
let _onIntent = null;
let _onListeningChange = null;
let _onTranscript = null;

// ── Intent Definitions ──────────────────────
const INTENTS = [
  {
    id: 'brief',
    keywords: ['brief', 'briefing', 'morning', 'update', 'news', 'how am i doing', 'what\'s happening'],
    response: 'Preparing your Aura brief now.'
  },
  {
    id: 'scan',
    keywords: ['scan', 'read', 'document', 'paper', 'bill', 'letter', 'photo', 'camera', 'vision'],
    response: 'Opening Aura Vision. Hold the document steady.'
  },
  {
    id: 'safety',
    keywords: ['scam', 'safe', 'safety', 'shield', 'threat', 'danger', 'protect', 'secure', 'check safety'],
    response: 'Checking your shield status now.'
  },
  {
    id: 'family',
    keywords: ['family', 'guardian', 'son', 'daughter', 'parent', 'send', 'share', 'link'],
    response: 'Opening the Family Link.'
  },
  {
    id: 'balance',
    keywords: ['balance', 'money', 'how much', 'account', 'bank'],
    response: 'Let me check your balance.'
  },
  {
    id: 'help',
    keywords: ['help', 'confused', 'what can you do', 'assist'],
    response: 'I can help you check your balance, scan documents, detect scams, and connect with your family. Just tell me what you need.'
  }
];

/**
 * Initialize the voice intent engine
 */
export function initIntentEngine(options = {}) {
  _onIntent = options.onIntent || (() => {});
  _onListeningChange = options.onListeningChange || (() => {});
  _onTranscript = options.onTranscript || (() => {});

  // Check for browser speech recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('[IntentEngine] Speech recognition not supported in this browser');
    return false;
  }

  _recognition = new SpeechRecognition();
  _recognition.continuous = false;
  _recognition.interimResults = true;
  _recognition.lang = 'en-US';
  _recognition.maxAlternatives = 1;

  _recognition.onstart = () => {
    _isListening = true;
    _onListeningChange(true);
    console.log('[IntentEngine] Listening...');
  };

  _recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join('');

    _onTranscript(transcript, event.results[0].isFinal);

    if (event.results[0].isFinal) {
      _processTranscript(transcript);
    }
  };

  _recognition.onerror = (event) => {
    console.warn('[IntentEngine] Error:', event.error);
    _isListening = false;
    _onListeningChange(false);
  };

  _recognition.onend = () => {
    _isListening = false;
    _onListeningChange(false);
    console.log('[IntentEngine] Stopped listening');
  };

  console.log('[IntentEngine] Initialized');
  return true;
}

/**
 * Start listening for voice input
 */
export function startListening() {
  if (!_recognition) {
    // Fallback: show a prompt
    const userInput = prompt('Aura is listening... (Type your command since speech recognition isn\'t available in this browser)');
    if (userInput) {
      _processTranscript(userInput);
    }
    return;
  }

  if (_isListening) {
    _recognition.stop();
    return;
  }

  try {
    _recognition.start();
  } catch (e) {
    console.warn('[IntentEngine] Could not start:', e);
  }
}

/**
 * Stop listening
 */
export function stopListening() {
  if (_recognition && _isListening) {
    _recognition.stop();
  }
}

/**
 * Check if currently listening
 */
export function isListening() {
  return _isListening;
}

// ── Private ─────────────────────────────────

async function _processTranscript(transcript) {
  const lower = transcript.toLowerCase().trim();
  console.log('[IntentEngine] Transcript:', lower);

  // Live Internet Agent Check (Reaching out to Python Backend -> yfinance)
  if (lower.includes('stock') || lower.includes('market') || lower.includes('trading') || lower.includes('price of')) {
    let symbol = 'AAPL';
    if (lower.includes('microsoft')) symbol = 'MSFT';
    else if (lower.includes('tesla')) symbol = 'TSLA';
    else if (lower.includes('google') || lower.includes('alphabet')) symbol = 'GOOGL';
    else if (lower.includes('amazon')) symbol = 'AMZN';

    speak('Let me check the live internet for you right now.', true);
    
    try {
      const resp = await fetch(`http://127.0.0.1:5050/api/stock_check?symbol=${symbol}`);
      const data = await resp.json();
      if (data.text) {
        speak(data.text, true);
      }
    } catch(e) {
      speak('I was unable to connect to the live market database.', true);
    }
    _onIntent('stock_agent', transcript);
    return;
  }

  // Find matching intent
  for (const intent of INTENTS) {
    for (const keyword of intent.keywords) {
      if (lower.includes(keyword)) {
        console.log(`[IntentEngine] Intent matched: ${intent.id}`);
        speak(intent.response, true);
        _onIntent(intent.id, transcript);
        return;
      }
    }
  }

  // No match — friendly fallback
  speak("I am still learning, but I can check the live stock market, scan documents, read your balance, or connect you with your family guardian.", true);
  _onIntent('unknown', transcript);
}
