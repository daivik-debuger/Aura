/* ============================================
   AURA — Voice Bridge
   Connects to Python edge-tts API
   Falls back to browser SpeechSynthesis
   ============================================ */

const VOICE_API_URL = '/api/speak';
let _audioQueue = [];
let _isPlaying = false;
let _currentAudio = null;
let _voiceIndicator = null;
let _onSpeakStart = null;
let _onSpeakEnd = null;

/**
 * Initialize the voice bridge
 */
export function initVoiceBridge(options = {}) {
  _voiceIndicator = document.getElementById('voice-indicator');
  _onSpeakStart = options.onSpeakStart || (() => {});
  _onSpeakEnd = options.onSpeakEnd || (() => {});
  
  console.log('[VoiceBridge] Initialized');
}

/**
 * Speak text using Aura's voice
 * Tries edge-tts API first, falls back to browser speech
 */
export async function speak(text, force = false) {
  if (!text) return;
  
  // Mute Logic: If the user is Neurotypical (none), only speak if forced (emergency)
  const medicalMode = localStorage.getItem('aura-medical-mode');
  if (medicalMode === 'none' && !force) {
    console.log('[VoiceBridge] Muted: Skipping non-critical message.');
    return;
  }
  
  _audioQueue.push(text);
  
  if (!_isPlaying) {
    _processQueue();
  }
}

/**
 * Stop all speech
 */
export function stopSpeaking() {
  _audioQueue = [];
  _isPlaying = false;
  
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.currentTime = 0;
    _currentAudio = null;
  }
  
  window.speechSynthesis?.cancel();
  _hideVoiceIndicator();
  _onSpeakEnd?.();
}

/**
 * Check if currently speaking
 */
export function isSpeaking() {
  return _isPlaying;
}

// ── Private Methods ─────────────────────────

async function _processQueue() {
  if (_audioQueue.length === 0) {
    _isPlaying = false;
    _hideVoiceIndicator();
    _onSpeakEnd?.();
    return;
  }
  
  _isPlaying = true;
  const text = _audioQueue.shift();
  
  _showVoiceIndicator();
  _onSpeakStart?.();
  
  try {
    // Try the Python edge-tts API first
    await _speakViaAPI(text);
  } catch (err) {
    console.warn('[VoiceBridge] API failed, falling back to browser speech:', err.message);
    await _speakViaBrowser(text);
  }
  
  // Process next in queue
  _processQueue();
}

async function _speakViaAPI(text) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(VOICE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      _currentAudio = new Audio(url);
      _currentAudio.volume = 0.9;
      
      _currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        _currentAudio = null;
        resolve();
      };
      
      _currentAudio.onerror = (err) => {
        URL.revokeObjectURL(url);
        _currentAudio = null;
        reject(new Error('Audio playback failed'));
      };
      
      await _currentAudio.play();
    } catch (err) {
      reject(err);
    }
  });
}

async function _speakViaBrowser(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.warn('[VoiceBridge] No speech synthesis available');
      resolve();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // -10% speech rate
    utterance.pitch = 0.95; // Gentle tone
    utterance.volume = 0.9;
    
    // Try to find a female voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => 
      v.name.includes('Zira') || 
      v.name.includes('Samantha') || 
      v.name.includes('female')
    ) || voices.find(v => v.lang === 'en-US') || voices[0];
    
    if (preferred) {
      utterance.voice = preferred;
    }
    
    utterance.onend = resolve;
    utterance.onerror = resolve;
    
    window.speechSynthesis.speak(utterance);
  });
}

function _showVoiceIndicator() {
  if (_voiceIndicator) {
    _voiceIndicator.classList.add('active');
  }
}

function _hideVoiceIndicator() {
  if (_voiceIndicator) {
    _voiceIndicator.classList.remove('active');
  }
}
