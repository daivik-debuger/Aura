/* ============================================
   AURA — Auth & Identity
   Login overlay and mock Firebase initialization
   ============================================ */

import { speak } from './voice-bridge.js';
import { auth } from './firebase-init.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

let _onComplete = null;

/**
 * Boot auth flow. If user is already "logged in", it immediately calls onComplete().
 * Otherwise it shows the login screen.
 */
export function initAuth(options = {}) {
  _onComplete = options.onComplete || (() => {});
  
  const isLoggedIn = localStorage.getItem('aura_is_logged_in') === 'true';
  const hasSeenTutorial = localStorage.getItem('aura_tutorial_complete') === 'true';

  if (isLoggedIn) {
    if (hasSeenTutorial) {
      _onComplete();
    } else {
      _showTutorial();
    }
  } else {
    _showLoginScreen();
  }
}

function _showLoginScreen() {
  // Inject login HTML
  const loginOverlay = document.createElement('div');
  loginOverlay.id = 'auth-overlay';
  loginOverlay.className = 'auth-overlay';
  loginOverlay.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo">✦ Aura</div>
      <h2 class="auth-title">Welcome back</h2>
      <p class="auth-subtitle">Sign in to your financial shield</p>
      
      <div class="auth-form">
        <label class="auth-label">Email Address</label>
        <input id="auth-email" type="email" class="auth-input" value="alex@example.com">
        
        <label class="auth-label">Password</label>
        <input id="auth-password" type="password" class="auth-input" value="password123">
        
        <button id="auth-login-btn" class="auth-primary-btn">
          Sign In
        </button>
        
        <button id="auth-firebase-btn" class="auth-secondary-btn">
          <span class="fb-icon">🔥</span> Login with Firebase
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(loginOverlay);

  // Hide the app shell
  const shell = document.querySelector('.app-shell');
  if (shell) shell.style.display = 'none';

  const handleMockLogin = () => {
    localStorage.setItem('aura_is_logged_in', 'true');
    const btn = document.getElementById('auth-login-btn');
    btn.innerHTML = '<span class="auth-spinner"></span> Authenticating...';
    setTimeout(() => {
      loginOverlay.remove();
      _showMedicalOnboarding();
    }, 1200);
  };

  const handleFirebaseLogin = async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('auth-firebase-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="auth-spinner"></span> Securely connecting...';
    btn.disabled = true;
    
    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('[Auth] Signed in safely using Firebase.');
      } catch (err) {
        console.log('[Auth] Auto-registering for Hackathon Demo...', err.code);
        await createUserWithEmailAndPassword(auth, email, password);
      }
      
      localStorage.setItem('aura_is_logged_in', 'true');
      loginOverlay.remove();
      _showMedicalOnboarding();
      
    } catch (error) {
      console.error('[Auth] Error:', error);
      alert('Firebase Login Failed: ' + error.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  };

  document.getElementById('auth-login-btn').addEventListener('click', handleMockLogin);
  document.getElementById('auth-firebase-btn').addEventListener('click', handleFirebaseLogin);
}

function _showMedicalOnboarding() {
  const onboardOverlay = document.createElement('div');
  onboardOverlay.id = 'medical-onboard-overlay';
  onboardOverlay.className = 'auth-overlay';
  
  onboardOverlay.innerHTML = `
    <div class="auth-card tutorial-card" style="max-height: 90vh; overflow-y: auto;">
      <h2 class="auth-title">Aura Personalization</h2>
      <p class="auth-subtitle">To personalize your safety net, do you have any visual or cognitive preferences?</p>
      
      <div class="onboard-options">
        <button class="onboard-btn" data-profile="none">🌈 Neurotypical (Standard Experience)</button>
        <button class="onboard-btn" data-profile="glaucoma">👁️ Glaucoma (Tunnel Vision Adapter)</button>
        <button class="onboard-btn" data-profile="macular">🎯 Macular Degeneration (Scotoma Split)</button>
        <button class="onboard-btn" data-profile="total_blindness">🦯 Total Blindness (Screen Optimizer)</button>
        <button class="onboard-btn" data-profile="adhd">⚡ ADHD (Hyper-Focus Mode)</button>
        <button class="onboard-btn" data-profile="dyslexia">📚 Dyslexia (Legibility Mode)</button>
      </div>
    </div>
  `;

  document.body.appendChild(onboardOverlay);
  
  setTimeout(() => {
    speak('Welcome. To personalize your safety net, do you have any visual or cognitive preferences? Please select an option on the screen.');
  }, 500);

  const btns = onboardOverlay.querySelectorAll('.onboard-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const profile = e.target.getAttribute('data-profile');
      
      // Update UI manager dynamically
      const medicalSelect = document.getElementById('medical-profile-select');
      if (medicalSelect) {
        medicalSelect.value = profile;
        medicalSelect.dispatchEvent(new Event('change'));
      }
      
      onboardOverlay.remove();
      _showTutorial();
    });
  });
}

function _showTutorial() {
  const tutorialOverlay = document.createElement('div');
  tutorialOverlay.id = 'tutorial-overlay';
  tutorialOverlay.className = 'auth-overlay tutorial-overlay';
  
  const steps = [
    {
      title: 'Voice Guidance Ready 🔊',
      desc: 'Aura is your calm financial companion. Whenever you see the Aura icon or need help, just speak.',
      voice: 'Welcome to Aura. I am ready to guide you through your finances.',
      action: 'Next'
    },
    {
      title: 'Family Link Active 👨‍👩‍👧',
      desc: 'Your Guardian (Sarah) is connected. We will notify her securely if any unusual activity occurs.',
      voice: 'Your family link is active. Your daughter Sarah is connected as your primary guardian.',
      action: 'Next'
    },
    {
      title: 'Biometric Shield ⌚',
      desc: 'Apple Watch detected via TRIBE v2. Aura will automatically activate the Scam Shield if your heart rate spikes during suspicious calls.',
      voice: 'Health link established. I am monitoring your vital signs to provide protective intervention during stressful situations.',
      action: 'Enter Dashboard'
    }
  ];

  let currentStep = 0;

  const renderStep = () => {
    const step = steps[currentStep];
    tutorialOverlay.innerHTML = `
      <div class="auth-card tutorial-card">
        <div class="tutorial-progress">
          <span class="tut-dot ${currentStep === 0 ? 'active' : ''}"></span>
          <span class="tut-dot ${currentStep === 1 ? 'active' : ''}"></span>
          <span class="tut-dot ${currentStep === 2 ? 'active' : ''}"></span>
        </div>
        <h2 class="auth-title">${step.title}</h2>
        <p class="auth-subtitle tutorial-desc">${step.desc}</p>
        
        <button id="tut-action-btn" class="auth-primary-btn">
          ${step.action}
        </button>
      </div>
    `;

    document.getElementById('tut-action-btn').addEventListener('click', () => {
      currentStep++;
      if (currentStep >= steps.length) {
        // Finish tutorial
        localStorage.setItem('aura_tutorial_complete', 'true');
        tutorialOverlay.remove();
        
        const shell = document.querySelector('.app-shell');
        if (shell) shell.style.display = ''; // restore main app
        
        _onComplete();
      } else {
        renderStep();
      }
    });

    // Speak introduction
    speak(step.voice);
  };

  document.body.appendChild(tutorialOverlay);
  renderStep();
}

/**
 * Utility to clear auth and session for testing or signing out
 */
export async function logout() {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('[Auth] Firebase signout error:', e);
  }
  localStorage.removeItem('aura_is_logged_in');
  localStorage.removeItem('aura_tutorial_complete');
  localStorage.removeItem('aura-medical-mode');
  window.location.reload();
}
