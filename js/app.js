/* ============================================
   AURA — Main Application Controller
   ============================================ */

import { initDataLayer } from './data-layer.js';
import {
  getCurrentBalance,
  getSafetyStatus,
  getTodaySpend,
  getRecentTransactions,
  generateBriefing,
  formatCurrency
} from './finance-engine.js';
import { initVoiceBridge, speak, stopSpeaking, isSpeaking } from './voice-bridge.js';
import { initTransactionMonitor, triggerDemoTransaction } from './transaction-monitor.js';
import { initUIManager, setMode, getMode, toggleMode } from './ui-manager.js';
import { initIntentEngine, startListening } from './intent-engine.js';
import { initPages, navigateTo } from './pages.js';
import { initAuth, logout } from './auth.js';
import { initTrendAgent } from './trend-agent.js';

// ── DOM References ──────────────────────────
let $balanceValue, $balanceSubtitle;
let $safetyValue, $safetyBadge, $safetyDot, $safetyLabel;
let $spendValue, $spendSubtitle;
let $transactionList;
let $auraBriefBtn, $auraBriefIcon;
let $alertToast, $alertToastTitle, $alertToastMessage;
let $guardianToast, $guardianToastMessage;
let $greetingTime, $greetingName;
let $modeStandard, $modeAura;
let $demoBtn;
let $authSignoutBtn;

// State for Dynamic Reduction mode
let _currentTxIndex = 0;

/**
 * Boot the application
 */
async function boot() {
  console.log('[Aura] Booting...');

  // Cache DOM refs
  _cacheDOMRefs();

  // Initialize data layer
  await initDataLayer();

  // Initialize voice bridge
  initVoiceBridge({
    onSpeakStart: () => {
      $auraBriefBtn?.classList.add('speaking');
    },
    onSpeakEnd: () => {
      $auraBriefBtn?.classList.remove('speaking');
    }
  });

  // Initialize UI manager
  initUIManager({
    onModeChange: (mode) => {
      renderDashboard();
    }
  });

  // Initialize transaction monitor
  initTransactionMonitor({
    threshold: 200,
    autoSpeak: true,
    onAlert: (tx) => {
      _showAlertToast(tx);
      renderDashboard();
    }
  });

  // Initialize pages
  initPages();

  // Initialize voice intent engine
  initIntentEngine({
    onIntent: _handleIntent,
    onListeningChange: (listening) => {
      const micBtn = document.getElementById('talk-mic-btn');
      if (micBtn) {
        micBtn.classList.toggle('listening', listening);
      }
    },
    onTranscript: (text, isFinal) => {
      const el = document.getElementById('talk-transcript');
      if (el) {
        el.textContent = isFinal ? `"${text}"` : text;
      }
    }
  });

  // Start Auth Flow
  initAuth({
    onComplete: () => {
      // Set up event listeners
      _setupEventListeners();

      // Set greeting
      _setGreeting();

      // Render the dashboard
      renderDashboard();

      // Start Apple Watch Biometric polling
      _startBiometricPolling();

      // Start Trend-Guard Agent
      initTrendAgent();

      console.log('[Aura] Ready ✨');
    }
  });
}

function _startBiometricPolling() {
  setInterval(async () => {
    try {
      const resp = await fetch('http://127.0.0.1:5050/stress_status');
      const data = await resp.json();
      if (data.stress) {
        console.warn('🚨 [Aura] Biometric stress alert detected from Apple Watch!');
        
        // Hide whatever page we are on and force navigation to Safety page
        navigateTo('safety');
        
        // Wait rendering then simulate scam alert
        setTimeout(() => {
          // This fires the _simulateScamAlert method from pages.js
          const shieldBtn = document.getElementById('shield-demo-btn');
          if (shieldBtn) {
            shieldBtn.click();
          } else {
            // Fallback if not rendered yet
            window.dispatchEvent(new CustomEvent('aura-trigger-shield'));
          }
        }, 300);
      }
    } catch (err) {
      // Ignore network errors silently (server might be down)
    }
  }, 1500);
}

/**
 * Handle voice intents from the intent engine
 */
function _handleIntent(intentId, transcript) {
  console.log(`[Aura] Intent: ${intentId} from "${transcript}"`);

  switch (intentId) {
    case 'brief':
      const briefing = generateBriefing();
      setTimeout(() => speak(briefing), 1500);
      break;
    case 'scan':
      navigateTo('scan');
      break;
    case 'safety':
      navigateTo('safety');
      break;
    case 'family':
      navigateTo('family');
      break;
    case 'balance':
      const bal = getCurrentBalance();
      setTimeout(() => speak(`Your current balance is ${bal.formatted}. ${getSafetyStatus().message}`), 1500);
      break;
    case 'help':
      // Response already spoken by intent engine
      break;
    default:
      break;
  }
}

/**
 * Render all dashboard metrics and transactions
 */
function renderDashboard() {
  _renderBalance();
  _renderSafety();
  _renderTodaySpend();
  _renderTransactions();
}

// ── Render Functions ────────────────────────

function _renderBalance() {
  const balance = getCurrentBalance();
  const mode = getMode();

  if ($balanceValue) {
    if (mode === 'aura') {
      // Liberty HUD: Safe Spend Allowance
      $balanceValue.textContent = '$50.00';
    } else {
      $balanceValue.textContent = balance.formatted;
    }
  }
  
  if ($balanceSubtitle) {
    if (mode === 'aura') {
      $balanceSubtitle.textContent = "Safe to spend today";
    } else {
      $balanceSubtitle.textContent = 'Available balance';
    }
  }

  const label = document.querySelector('.metric-card--balance .metric-label');
  if (label) {
    label.textContent = mode === 'aura' ? 'Daily Allowance' : 'Current Balance';
  }
}

function _renderSafety() {
  const safety = getSafetyStatus();

  if ($safetyValue) {
    $safetyValue.textContent = safety.label;
  }

  if ($safetyBadge) {
    $safetyBadge.className = `safety-badge safety-badge--${safety.status}`;
  }

  if ($safetyLabel) {
    $safetyLabel.textContent = safety.message;
  }
}

function _renderTodaySpend() {
  const spend = getTodaySpend();
  if ($spendValue) {
    $spendValue.textContent = spend.formatted;
  }
  if ($spendSubtitle) {
    $spendSubtitle.textContent = `${spend.count} transaction${spend.count !== 1 ? 's' : ''} today`;
  }
}

function _renderTransactions() {
  const transactions = getRecentTransactions(5);
  if (!$transactionList) return;

  const mode = getMode();

  if (mode === 'aura') {
    // Dynamic Reduction Mode: Show ONE card at a time to reduce cognitive load
    if (transactions.length === 0) {
      $transactionList.innerHTML = '<p>No recent activity.</p>';
      return;
    }

    // Ensure index bounds
    if (_currentTxIndex >= transactions.length) _currentTxIndex = 0;
    if (_currentTxIndex < 0) _currentTxIndex = transactions.length - 1;

    const tx = transactions[_currentTxIndex];
    
    // Memory Map imagery logic
    const getMemoryMapImage = (tx) => {
      const lower = tx.merchant.toLowerCase();
      if (lower.includes('publix') || lower.includes('grocery') || lower.includes('market')) {
        return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
      }
      if (lower.includes('leo') || lower.includes('transfer')) {
        return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=400&h=400&q=80';
      }
      if (tx.category === 'housing' || lower.includes('rent')) {
        return 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=400&q=80';
      }
      return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80';
    };

    const memoryMapUrl = getMemoryMapImage(tx);
    
    $transactionList.innerHTML = `
      <div class="transaction-focused-card ${tx.isLarge ? 'large-amount' : ''}">
        <div class="memory-map-image" style="background-image: url('${memoryMapUrl}')" title="Memory map context for ${tx.merchant}"></div>
        <div class="tx-focus-header">
          <div class="tx-icon-large">${tx.icon}</div>
          <div class="tx-focus-merchant">${tx.merchant}</div>
        </div>
        <div class="tx-focus-amount ${tx.isNegative ? 'negative' : 'positive'}">
          ${tx.isNegative ? '-' : '+'}${tx.formattedAmount}
        </div>
        <div class="tx-focus-date">${tx.timeAgo}</div>
        
        <div class="tx-focus-controls">
          <button id="tx-prev-btn" class="tx-focus-btn">← Prev</button>
          <span class="tx-focus-counter">${_currentTxIndex + 1} of ${transactions.length}</span>
          <button id="tx-next-btn" class="tx-focus-btn">Next →</button>
        </div>
        
        <button id="tx-explain-btn" class="demo-chip-btn">🤔 What is this?</button>
      </div>
    `;

    document.getElementById('tx-prev-btn').addEventListener('click', () => {
      _currentTxIndex--;
      _renderTransactions();
    });
    document.getElementById('tx-next-btn').addEventListener('click', () => {
      _currentTxIndex++;
      _renderTransactions();
    });
    document.getElementById('tx-explain-btn').addEventListener('click', () => {
      speak(`This is a ${tx.isNegative ? 'payment of' : 'deposit of'} ${formatCurrency(Math.abs(tx.amount))} at ${tx.merchant}. Do you want to see the receipt?`);
    });

  } else {
    // Standard Mode: Show standard list
    $transactionList.innerHTML = transactions.map(tx => `
      <div class="transaction-item ${tx.isLarge ? 'large-amount' : ''}" role="listitem">
        <div class="tx-icon">${tx.icon}</div>
        <div class="tx-details">
          <div class="tx-merchant">${tx.merchant}</div>
          <div class="tx-category">${tx.category}</div>
        </div>
        <div>
          <div class="tx-amount ${tx.isNegative ? 'negative' : 'positive'}">
            ${tx.isNegative ? '-' : '+'}${tx.formattedAmount}
          </div>
          <div class="tx-time">${tx.timeAgo}</div>
        </div>
      </div>
    `).join('');
  }
}

// ── Event Handlers ──────────────────────────

function _setupEventListeners() {
  // Aura Brief button
  $auraBriefBtn?.addEventListener('click', () => {
    if (isSpeaking()) {
      stopSpeaking();
    } else {
      const briefing = generateBriefing();
      speak(briefing);
    }
  });

  // Mode toggles 
  $modeStandard?.addEventListener('click', () => setMode('standard'));
  $modeAura?.addEventListener('click', () => setMode('aura'));

  // Demo transaction button
  $demoBtn?.addEventListener('click', () => {
    const tx = triggerDemoTransaction();
    renderDashboard();
  });

  // Sign Out button
  $authSignoutBtn?.addEventListener('click', () => {
    logout();
  });

  // Alert toast close
  document.getElementById('alert-close')?.addEventListener('click', () => {
    $alertToast?.classList.remove('show');
  });

  // Command Center buttons
  document.getElementById('cmd-talk')?.addEventListener('click', () => navigateTo('talk'));
  document.getElementById('cmd-scan')?.addEventListener('click', () => navigateTo('scan'));
  document.getElementById('cmd-safety')?.addEventListener('click', () => navigateTo('safety'));
  document.getElementById('cmd-family')?.addEventListener('click', () => navigateTo('family'));

  // Voice intent triggers from pages
  window.addEventListener('aura-start-listening', () => startListening());
  window.addEventListener('aura-simulate-intent', (e) => {
    const phrase = e.detail?.phrase;
    if (phrase) {
      // Simulate processing: find matching intent
      _handleIntentFromPhrase(phrase);
    }
  });

  // Bind to Market Anomaly Event
  window.addEventListener('aura-market-drop', (e) => {
    const pulseLine = document.getElementById('market-pulse-line');
    if (pulseLine) {
      pulseLine.classList.add('pulse-alert');
    }
    
    speak(`The tech market is dipping. I’ve moved your Vacation Fund into a safer Gold bucket for now so you don't lose progress. Want to hear why?`, true);
    
    const d = e.detail;
    
    // Repurpose toast for Market Anomaly
    const toast = document.getElementById('alert-toast');
    const msg = document.getElementById('alert-toast-message');
    const title = document.getElementById('alert-toast-title');
    
    if (toast && msg && title) {
      title.textContent = 'Trend-Guard Prediction';
      msg.textContent = `${d.asset} drop detected. Autonomously shifted to ${d.toFund}.`;
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
        if (pulseLine) {
          pulseLine.classList.remove('pulse-alert');
        }
      }, 12000); // clear after 12s
    }
  });
}

function _handleIntentFromPhrase(phrase) {
  const lower = phrase.toLowerCase();
  if (lower.includes('brief') || lower.includes('news') || lower.includes('morning')) {
    const briefing = generateBriefing();
    speak(briefing, true);
  } else if (lower.includes('money') || lower.includes('balance')) {
    const bal = getCurrentBalance();
    speak(`Your current balance is ${bal.formatted}. ${getSafetyStatus().message}`, true);
  } else if (lower.includes('scam') || lower.includes('safe')) {
    navigateTo('safety');
    speak('Checking your shield status now.', true);
  } else if (lower.includes('document') || lower.includes('read')) {
    navigateTo('scan');
    speak('Opening Aura Vision. Hold the document steady.', true);
  } else if (lower.includes('family') || lower.includes('send')) {
    navigateTo('family');
    speak('Opening the Family Link.', true);
  } else {
    speak("I can help with that. Tell me more about what you need.", true);
  }
}

function _setGreeting() {
  const hour = new Date().getHours();
  let timeGreeting = 'Good evening';
  if (hour < 12) timeGreeting = 'Good morning';
  else if (hour < 17) timeGreeting = 'Good afternoon';

  if ($greetingTime) $greetingTime.textContent = timeGreeting;
  if ($greetingName) $greetingName.textContent = 'Alex';
}

function _showAlertToast(tx) {
  if (!$alertToast) return;

  if ($alertToastTitle) {
    $alertToastTitle.textContent = 'Large Transaction Detected';
  }
  if ($alertToastMessage) {
    $alertToastMessage.textContent = `${formatCurrency(Math.abs(tx.amount))} at ${tx.merchant}`;
  }

  $alertToast.classList.add('show');

  // Auto-hide after 8 seconds
  setTimeout(() => {
    $alertToast.classList.remove('show');
  }, 8000);

  // Show Guardian notification with a realistic delay (simulating FCM push)
  _showGuardianNotification(tx);
}

function _showGuardianNotification(tx) {
  if (!$guardianToast) return;

  const amount = formatCurrency(Math.abs(tx.amount));
  if ($guardianToastMessage) {
    $guardianToastMessage.textContent = `Your family member Alex just made a ${amount} purchase at ${tx.merchant}. Aura has flagged this for your review.`;
  }

  // Delayed appearance — simulates network push to second device
  setTimeout(() => {
    $guardianToast.classList.add('show');
  }, 1500);

  // Auto-hide after 10 seconds
  setTimeout(() => {
    $guardianToast.classList.remove('show');
  }, 11500);
}

function _cacheDOMRefs() {
  $balanceValue = document.getElementById('balance-value');
  $balanceSubtitle = document.getElementById('balance-subtitle');
  $safetyValue = document.getElementById('safety-value');
  $safetyBadge = document.getElementById('safety-badge');
  $safetyDot = document.getElementById('safety-dot');
  $safetyLabel = document.getElementById('safety-label');
  $spendValue = document.getElementById('spend-value');
  $spendSubtitle = document.getElementById('spend-subtitle');
  $transactionList = document.getElementById('transaction-list');
  $auraBriefBtn = document.getElementById('aura-brief-btn');
  $auraBriefIcon = document.getElementById('aura-brief-icon');
  $alertToast = document.getElementById('alert-toast');
  $alertToastTitle = document.getElementById('alert-toast-title');
  $alertToastMessage = document.getElementById('alert-toast-message');
  $guardianToast = document.getElementById('guardian-toast');
  $guardianToastMessage = document.getElementById('guardian-toast-message');
  $greetingTime = document.getElementById('greeting-time');
  $greetingName = document.getElementById('greeting-name');
  $modeStandard = document.getElementById('mode-standard');
  $modeAura = document.getElementById('mode-aura');
  $demoBtn = document.getElementById('demo-transaction-btn');
  $authSignoutBtn = document.getElementById('auth-signout-btn');
}

// ── Boot ────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
