/* ============================================
   AURA — Transaction Monitor
   Watches for large transactions ($200+)
   ============================================ */

import { getDocs, onSnapshot, simulateTransaction } from './data-layer.js';
import { generateTransactionAlert } from './finance-engine.js';
import { speak } from './voice-bridge.js';

let _lastKnownTxCount = 0;
let _onAlert = null;
let _threshold = 200;
let _autoSpeak = true;

/**
 * Initialize the transaction monitor
 */
export function initTransactionMonitor(options = {}) {
  _threshold = options.threshold || 200;
  _onAlert = options.onAlert || (() => {});
  _autoSpeak = options.autoSpeak !== false;
  
  // Get initial transaction count
  const transactions = getDocs('transactions');
  _lastKnownTxCount = transactions.length;
  
  // Subscribe to transaction changes
  onSnapshot('transactions', (transactions) => {
    if (transactions.length > _lastKnownTxCount) {
      // New transactions detected
      const newTxs = transactions.slice(_lastKnownTxCount);
      _lastKnownTxCount = transactions.length;
      
      newTxs.forEach(tx => {
        if (Math.abs(tx.amount) >= _threshold) {
          _handleLargeTransaction(tx);
        }
      });
    }
  });
  
  console.log(`[TransactionMonitor] Watching for transactions >= $${_threshold}`);
}

/**
 * Simulate a demo transaction for testing
 */
export function triggerDemoTransaction() {
  const demoTransactions = [
    { amount: -450.00, merchant: 'Nordstrom', category: 'shopping', description: 'Clothing purchase' },
    { amount: -225.00, merchant: 'Home Depot', category: 'shopping', description: 'Power tools' },
    { amount: -310.00, merchant: 'Delta Airlines', category: 'transportation', description: 'Flight booking' },
    { amount: -275.00, merchant: 'Costco', category: 'groceries', description: 'Bulk grocery run' },
  ];
  
  const randomTx = demoTransactions[Math.floor(Math.random() * demoTransactions.length)];
  return simulateTransaction(randomTx);
}

// ── Private ─────────────────────────────────

function _handleLargeTransaction(tx) {
  console.log('[TransactionMonitor] Large transaction detected:', tx);
  
  // Notify via callback
  _onAlert(tx);
  
  // Speak the alert
  if (_autoSpeak) {
    const alertText = generateTransactionAlert(tx);
    speak(alertText, true);
  }
}
