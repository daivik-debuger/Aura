/* ============================================
   AURA — UI Manager
   Handles mode switching & accessibility
   ============================================ */

import { speak } from './voice-bridge.js';

const STORAGE_KEY_MODE = 'aura-ui-mode';
const STORAGE_KEY_CONTRAST = 'aura-high-contrast';
const STORAGE_KEY_MEDICAL = 'aura-medical-mode';

let _currentMode = 'standard'; // 'standard' | 'aura'
let _currentMedicalMode = 'none'; // 'none' | 'glaucoma' | 'macular' | 'total_blindness' | 'adhd' | 'dyslexia'
let _onModeChange = null;

/**
 * Initialize UI manager, restore saved preferences
 */
export function initUIManager(options = {}) {
  _onModeChange = options.onModeChange || (() => {});
  
  // Restore saved medical mode
  const savedMedical = localStorage.getItem(STORAGE_KEY_MEDICAL);
  if (savedMedical) {
    setMedicalMode(savedMedical, false);
  }

  // Restore saved mode
  const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
  if (savedMode === 'aura' || savedMode === 'standard') {
    setMode(savedMode, false); // Don't announce on init
  }
  
  // Bind Medical Mode Select
  const medicalSelect = document.getElementById('medical-profile-select');
  if (medicalSelect) {
    medicalSelect.value = _currentMedicalMode;
    medicalSelect.addEventListener('change', (e) => {
      setMedicalMode(e.target.value, true);
    });
  }
  
  console.log(`[UIManager] Initialized in ${_currentMode} mode`);
}

/**
 * Get the current UI mode
 */
export function getMode() {
  return _currentMode;
}

/**
 * Switch between Standard and Aura modes
 */
export function setMode(mode, announce = true) {
  if (mode !== 'standard' && mode !== 'aura') return;
  
  const body = document.body;
  
  // Add transition class for smooth switch
  body.classList.add('mode-transitioning');
  
  // Remove old mode
  body.classList.remove('standard-mode', 'aura-mode');
  
  // Apply new mode
  body.classList.add(`${mode}-mode`);
  _currentMode = mode;
  
  // Save preference
  localStorage.setItem(STORAGE_KEY_MODE, mode);
  
  // Update toggle buttons
  _updateToggleUI(mode);
  
  // Remove transition class after animations
  setTimeout(() => {
    body.classList.remove('mode-transitioning');
  }, 600);
  
  // Announce mode change (only in Aura mode)
  if (announce && mode === 'aura') {
    setTimeout(() => {
      speak('Aura mode activated. High contrast and voice guidance are now enabled.');
    }, 300);
  } else if (announce && mode === 'standard') {
    // Brief subtle announcement
  }
  
  _onModeChange(mode);
  console.log(`[UIManager] Switched to ${mode} mode`);
}

/**
 * Switch Medical Vision Profile
 */
export function setMedicalMode(mode, announce = true) {
  const body = document.body;
  
  // Remove existing medical modes
  body.classList.remove('medical-glaucoma', 'medical-macular', 'medical-total_blindness', 'medical-adhd', 'medical-dyslexia');
  
  _currentMedicalMode = mode;
  localStorage.setItem(STORAGE_KEY_MEDICAL, mode);
  
  if (mode !== 'none') {
    body.classList.add(`medical-${mode}`);
    // If selecting any heavy medical mode, automatically turn on Aura Mode base
    if (_currentMode !== 'aura') {
      setMode('aura', false);
    }
  }

  if (announce) {
    if (mode === 'total_blindness') {
      setTimeout(() => speak('Total Blindness profile active. Screen deactivated for privacy.'), 300);
    } else if (mode === 'glaucoma') {
      setTimeout(() => speak('Glaucoma profile active. Interface is now centralized.'), 300);
    } else if (mode === 'macular') {
      setTimeout(() => speak('Macular Degeneration active. Interface is pushed to the edges.'), 300);
    } else if (mode === 'adhd') {
      setTimeout(() => speak('Hyper-Focus profile active. Peripheral elements are now blurred.'), 300);
    } else if (mode === 'dyslexia') {
      setTimeout(() => speak('Dyslexia profile active. Enhanced legibility enabled.'), 300);
    } else {
      setTimeout(() => speak('Aura features muted. Standard banking experience active.'), 300);
      setMode('standard', false); // Fallback to standard if no medical profile
    }
  }

  const medicalSelect = document.getElementById('medical-profile-select');
  if (medicalSelect && medicalSelect.value !== mode) {
    medicalSelect.value = mode;
  }
}

/**
 * Toggle between modes
 */
export function toggleMode() {
  setMode(_currentMode === 'standard' ? 'aura' : 'standard');
}

/**
 * Update the toggle button visuals
 */
function _updateToggleUI(mode) {
  const standardBtn = document.getElementById('mode-standard');
  const auraBtn = document.getElementById('mode-aura');
  
  if (standardBtn && auraBtn) {
    standardBtn.classList.toggle('active', mode === 'standard');
    auraBtn.classList.toggle('active', mode === 'aura');
  }
}
