/* ============================================
   AURA — Pages / Views
   Aura Vision, Shield, Family Link, Talk
   ============================================ */

import { speak } from './voice-bridge.js';
import { getCurrentBalance, getSafetyStatus, getTodaySpend, formatCurrency } from './finance-engine.js';

// ── Page State ──────────────────────────────
let _currentPage = 'home';
let _pageContainer = null;

export function initPages() {
  _pageContainer = document.getElementById('page-container');
}

export function getCurrentPage() {
  return _currentPage;
}

/**
 * Navigate to a page/view
 */
export function navigateTo(page) {
  _currentPage = page;
  if (!_pageContainer) return;

  switch (page) {
    case 'home':
      _pageContainer.innerHTML = '';
      _pageContainer.style.display = 'none';
      document.getElementById('home-view').style.display = 'block';
      break;
    case 'talk':
      _showTalkPage();
      break;
    case 'scan':
      _showScanPage();
      break;
    case 'safety':
      _showSafetyPage();
      break;
    case 'family':
      _showFamilyPage();
      break;
    default:
      navigateTo('home');
  }
}

function _activatePage(html) {
  document.getElementById('home-view').style.display = 'none';
  _pageContainer.style.display = 'block';
  _pageContainer.innerHTML = html;
  _pageContainer.scrollTop = 0;
  window.scrollTo(0, 0);
}

// ── Talk to Aura Page ───────────────────────
function _showTalkPage() {
  const balance = getCurrentBalance();
  const safety = getSafetyStatus();
  const spend = getTodaySpend();

  _activatePage(`
    <div class="page-content">
      <button class="page-back-btn" id="page-back" aria-label="Go back to home">
        ← Back
      </button>
      <div class="talk-page">
        <div class="aura-avatar" aria-hidden="true">
          <div class="aura-avatar-ring"></div>
          <div class="aura-avatar-core">✦</div>
        </div>
        <h2 class="talk-title">Talk to Aura</h2>
        <p class="talk-subtitle">Tap the microphone and ask me anything</p>
        
        <button id="talk-mic-btn" class="talk-mic-btn" aria-label="Start listening">
          <span class="mic-icon">🎤</span>
        </button>
        <div id="talk-transcript" class="talk-transcript" aria-live="polite"></div>
        
        <div class="talk-suggestions">
          <h3 class="suggestions-title">Try saying:</h3>
          <div class="suggestion-chips">
            <button class="suggestion-chip" data-phrase="Give me the brief">"Give me the brief"</button>
            <button class="suggestion-chip" data-phrase="How much money do I have">"How much money do I have?"</button>
            <button class="suggestion-chip" data-phrase="Is this a scam">"Is this a scam?"</button>
            <button class="suggestion-chip" data-phrase="Read this document">"Read this document"</button>
            <button class="suggestion-chip" data-phrase="Send this to my family">"Send to my family"</button>
          </div>
        </div>

        <div class="talk-quick-info">
          <div class="quick-info-item">
            <span class="quick-info-label">Balance</span>
            <span class="quick-info-value">${balance.formatted}</span>
          </div>
          <div class="quick-info-item">
            <span class="quick-info-label">Status</span>
            <span class="quick-info-value status-${safety.status}">${safety.label}</span>
          </div>
          <div class="quick-info-item">
            <span class="quick-info-label">Today</span>
            <span class="quick-info-value">${spend.formatted}</span>
          </div>
        </div>
      </div>
    </div>
  `);

  // Back button
  document.getElementById('page-back').addEventListener('click', () => navigateTo('home'));

  // Mic button
  const micBtn = document.getElementById('talk-mic-btn');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      // Dispatch custom event so app.js can handle it
      window.dispatchEvent(new CustomEvent('aura-start-listening'));
    });
  }

  // Suggestion chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const phrase = chip.dataset.phrase;
      document.getElementById('talk-transcript').textContent = `"${phrase}"`;
      window.dispatchEvent(new CustomEvent('aura-simulate-intent', { detail: { phrase } }));
    });
  });
}

// ── Aura Vision (Document Scanner) ──────────
function _showScanPage() {
  _activatePage(`
    <div class="page-content">
      <button class="page-back-btn" id="page-back" aria-label="Go back to home">
        ← Back
      </button>
      <div class="scan-page">
        <div class="scan-header">
          <h2 class="scan-title">📄 Aura Vision</h2>
          <p class="scan-subtitle">Scan any document — I'll remove the clutter and summarize it for you</p>
        </div>

        <div class="scan-area" id="scan-area">
          <div class="scan-placeholder">
            <span class="scan-camera-icon">📸</span>
            <p>Tap to scan a document</p>
            <p class="scan-hint">or take a photo of a bill, letter, or bank statement</p>
          </div>
          <input type="file" id="scan-file-input" accept="image/*" capture="environment" style="display:none">
        </div>

        <div id="scan-result" class="scan-result" style="display:none">
          <div class="scan-result-header">
            <span>✨</span>
            <span>Aura Story Mode</span>
          </div>
          <div class="scan-story-container" id="scan-story-container">
            <!-- Dynamically populated story steps -->
          </div>
          <div class="scan-result-action">
            <button id="scan-story-next-btn" class="scan-pay-btn">
              Next Step →
            </button>
            <button id="scan-read-btn" class="scan-read-btn">
              🔊 Read Aloud
            </button>
          </div>
        </div>

        <button id="scan-demo-btn" class="demo-chip-btn">
          ⚡ Demo: Scan 30-page Mortgage Document
        </button>
      </div>
    </div>
  `);

  document.getElementById('page-back').addEventListener('click', () => navigateTo('home'));

  // File input trigger
  const scanArea = document.getElementById('scan-area');
  const fileInput = document.getElementById('scan-file-input');
  scanArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => _simulateScanResult());

  // Demo button
  document.getElementById('scan-demo-btn').addEventListener('click', () => _simulateScanResult());

  // Read aloud
  document.getElementById('scan-result')?.addEventListener('click', (e) => {
    if (e.target.id === 'scan-read-btn' || e.target.closest('#scan-read-btn')) {
      speak("I've analyzed this document. This is your monthly water bill for 45 dollars, due on April 15th. You have enough money in your account to cover it. Should I pay it for you?");
    }
  });
}

function _simulateScanResult() {
  const scanArea = document.getElementById('scan-area');
  const result = document.getElementById('scan-result');

  // Fake processing
  scanArea.innerHTML = `
    <div class="scan-processing">
      <div class="scan-spinner"></div>
      <p>Analyzing 30 pages...</p>
      <p class="scan-hint">Extracting key points & translating legal jargon</p>
    </div>
  `;

  setTimeout(() => {
    scanArea.style.display = 'none';
    result.style.display = '';

    const storySteps = [
      {
        page: "Page 1: The Summary",
        title: "You owe $1,250.00",
        desc: "This is your monthly mortgage statement from Bank of America.",
        voice: "Page 1 of 30. This is your monthly mortgage statement. You owe one thousand two hundred and fifty dollars."
      },
      {
        page: "Page 5: The Details",
        title: "Danger if you don't pay",
        desc: "If payment is not received by April 15th, a $50 late fee will be applied and your credit score may be affected.",
        voice: "Page 5. Here is the danger if you don't pay. A fifty dollar late fee will be applied after April 15th."
      },
      {
        page: "Page 30: Action Required",
        title: "Sign Here",
        desc: "You need to sign the document acknowledging the updated escrow terms.",
        voice: "Page 30. Action required. You need to sign the document. I can help you e-sign it now if you are ready."
      }
    ];

    let currentStoryStep = 0;
    const container = document.getElementById('scan-story-container');
    const nextBtn = document.getElementById('scan-story-next-btn');

    const renderStoryStep = () => {
      const step = storySteps[currentStoryStep];
      container.innerHTML = `
        <div class="scan-story-step">
          <div class="scan-story-page">${step.page}</div>
          <div class="scan-story-title">${step.title}</div>
          <div class="scan-story-desc">${step.desc}</div>
        </div>
      `;
      speak(step.voice);
      
      if (currentStoryStep === storySteps.length - 1) {
        nextBtn.innerHTML = "🖋️ E-Sign Document";
      } else {
        nextBtn.innerHTML = "Next Step →";
      }
    };

    renderStoryStep();

    nextBtn.onclick = () => {
      if (currentStoryStep < storySteps.length - 1) {
        currentStoryStep++;
        renderStoryStep();
      } else {
        speak("Opening electronic signature pad.");
        nextBtn.innerHTML = "✅ Signed successfully";
        nextBtn.style.background = "var(--safe)";
        nextBtn.style.color = "var(--bg-primary)";
      }
    };

    document.getElementById('scan-read-btn').onclick = () => {
      speak(storySteps[currentStoryStep].voice);
    };

  }, 2500);
}

// ── Shield (Scam Detection) ─────────────────
function _showSafetyPage() {
  _activatePage(`
    <div class="page-content">
      <button class="page-back-btn" id="page-back" aria-label="Go back to home">
        ← Back
      </button>
      <div class="safety-page">
        <div class="shield-status" id="shield-status">
          <div class="shield-icon-large">🛡️</div>
          <h2 class="shield-title">Shield Active</h2>
          <p class="shield-subtitle">Your financial safety net is online</p>
        </div>

        <div class="shield-stats">
          <div class="shield-stat">
            <div class="shield-stat-value">3</div>
            <div class="shield-stat-label">Scams Blocked<br>This Month</div>
          </div>
          <div class="shield-stat">
            <div class="shield-stat-value">$1,240</div>
            <div class="shield-stat-label">Money<br>Protected</div>
          </div>
          <div class="shield-stat">
            <div class="shield-stat-value">24/7</div>
            <div class="shield-stat-label">Active<br>Monitoring</div>
          </div>
        </div>

        <div class="shield-log">
          <h3 class="shield-log-title">Recent Threats Blocked</h3>
          <div class="shield-log-item threat-blocked">
            <span class="shield-log-icon">🚫</span>
            <div class="shield-log-details">
              <div class="shield-log-name">Phishing SMS: "Your account is locked"</div>
              <div class="shield-log-time">Blocked 2 hours ago</div>
            </div>
          </div>
          <div class="shield-log-item threat-blocked">
            <span class="shield-log-icon">🚫</span>
            <div class="shield-log-details">
              <div class="shield-log-name">Suspicious call from +1-800-FAKE-BNK</div>
              <div class="shield-log-time">Blocked yesterday</div>
            </div>
          </div>
          <div class="shield-log-item threat-blocked">
            <span class="shield-log-icon">🚫</span>
            <div class="shield-log-details">
              <div class="shield-log-name">Duplicate payment attempt (Electric bill × 3)</div>
              <div class="shield-log-time">Blocked 3 days ago</div>
            </div>
          </div>
        </div>

        <button id="shield-demo-btn" class="demo-chip-btn danger-demo">
          ⚡ Demo: Simulate a scam attack
        </button>
      </div>
    </div>
  `);

  document.getElementById('page-back').addEventListener('click', () => navigateTo('home'));

  document.getElementById('shield-demo-btn').addEventListener('click', () => {
    _simulateScamAlert();
  });
}

function _simulateScamAlert() {
  const shieldStatus = document.getElementById('shield-status');
  if (!shieldStatus) return;

  // Turn screen red
  shieldStatus.className = 'shield-status shield-alert-active';
  shieldStatus.innerHTML = `
    <div class="shield-icon-large shield-icon-danger">⚠️</div>
    <h2 class="shield-title shield-title-danger">INTERCEPTING CALL</h2>
    <p class="shield-subtitle shield-subtitle-danger">Biometric stress spike detected.</p>
    <div class="shield-intercepted">
      <div class="shield-intercepted-label">Live Call Analysis:</div>
      <div class="shield-intercepted-text">"This is the IRS. If you do not pay your outstanding balance immediately with gift cards, we will issue a warrant for your arrest."</div>
    </div>
    <div class="shield-action-taken">
      ✅ Mic Muted &nbsp; ✅ Audio Blocked &nbsp; ✅ Guardian Link Active
    </div>
  `;

  speak("I sense you're feeling under pressure. I've analyzed this caller's script—it matches a known IRS scam. I'm muting your mic right now so you can breathe. Let me handle hanging up for you.");

  // Reset after 12 seconds
  setTimeout(() => {
    navigateTo('safety');
  }, 12000);
}

// ── Family Link ─────────────────────────────
function _showFamilyPage() {
  _activatePage(`
    <div class="page-content">
      <button class="page-back-btn" id="page-back" aria-label="Go back to home">
        ← Back
      </button>
      <div class="family-page">
        <h2 class="family-title">👨‍👩‍👧 Family Link</h2>
        <p class="family-subtitle">Connected guardians who watch over your finances</p>

        <div class="family-members">
          <div class="family-member">
            <div class="family-avatar">SM</div>
            <div class="family-info">
              <div class="family-name">Sarah Martinez</div>
              <div class="family-role">Primary Guardian (Daughter)</div>
            </div>
            <div class="family-status family-status-online">
              <span class="family-status-dot"></span>
              Online
            </div>
          </div>
          <div class="family-member">
            <div class="family-avatar">JM</div>
            <div class="family-info">
              <div class="family-name">James Martinez</div>
              <div class="family-role">Secondary Guardian (Son)</div>
            </div>
            <div class="family-status family-status-offline">
              <span class="family-status-dot"></span>
              Last seen 2h ago
            </div>
          </div>
        </div>

        <div class="family-permissions">
          <h3 class="family-section-title">Guardian Permissions</h3>
          <div class="family-perm-item">
            <span>🔔 Transaction alerts over $200</span>
            <span class="perm-badge perm-on">ON</span>
          </div>
          <div class="family-perm-item">
            <span>📍 Unusual location alerts</span>
            <span class="perm-badge perm-on">ON</span>
          </div>
          <div class="family-perm-item">
            <span>🛡️ Scam interception notifications</span>
            <span class="perm-badge perm-on">ON</span>
          </div>
          <div class="family-perm-item">
            <span>📊 Weekly spending reports</span>
            <span class="perm-badge perm-on">ON</span>
          </div>
          <div class="family-perm-item">
            <span>🏪 Whitelisted stores</span>
            <span class="perm-badge perm-count">12 stores</span>
          </div>
        </div>

        <div class="family-alert-log">
          <h3 class="family-section-title">Recent Guardian Alerts</h3>
          <div class="family-alert-item">
            <span>🚨</span>
            <div>
              <div class="family-alert-text">Large purchase: $310 at Delta Airlines</div>
              <div class="family-alert-time">Sarah was notified • 5 min ago</div>
            </div>
          </div>
          <div class="family-alert-item">
            <span>🛡️</span>
            <div>
              <div class="family-alert-text">Phishing SMS blocked</div>
              <div class="family-alert-time">Sarah was notified • 2 hours ago</div>
            </div>
          </div>
          <div class="family-alert-item">
            <span>📊</span>
            <div>
              <div class="family-alert-text">Weekly spending report shared</div>
              <div class="family-alert-time">Both guardians • Sunday</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  document.getElementById('page-back').addEventListener('click', () => navigateTo('home'));
}
