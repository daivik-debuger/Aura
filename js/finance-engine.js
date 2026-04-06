/* ============================================
   AURA — Finance Engine
   Core financial logic shared by both UI modes
   ============================================ */

import { getDocs, getDoc } from './data-layer.js';

const CATEGORY_ICONS = {
  food: '🍽️',
  groceries: '🛒',
  electronics: '🔌',
  subscription: '📺',
  income: '💰',
  transportation: '🚗',
  shopping: '🛍️',
  housing: '🏠',
  health: '💊',
  transfer: '↔️',
  default: '💳'
};

/**
 * Get formatted current balance
 */
export function getCurrentBalance() {
  const accounts = getDocs('accounts');
  if (!accounts.length) return { value: 0, formatted: '$0.00' };
  
  const balance = accounts[0].balance;
  return {
    value: balance,
    formatted: formatCurrency(balance),
    currency: accounts[0].currency
  };
}

/**
 * Determine safety status based on spending patterns
 * Returns: 'safe' | 'caution' | 'alert'
 */
export function getSafetyStatus() {
  const account = getDocs('accounts')[0];
  if (!account) return { status: 'alert', label: 'No Data', message: 'Unable to read account data' };
  
  const balance = account.balance;
  const todaySpend = getTodaySpend().value;
  const score = account.safetyScore || 50;
  
  // Safety logic
  if (balance < 100) {
    return {
      status: 'alert',
      label: 'Low Balance',
      message: 'Your balance is running low. Be careful with spending.'
    };
  }
  
  if (todaySpend > 500) {
    return {
      status: 'caution',
      label: 'High Spending',
      message: `You've spent ${formatCurrency(todaySpend)} today. Consider slowing down.`
    };
  }
  
  if (todaySpend > 300) {
    return {
      status: 'caution',
      label: 'Moderate Spending',
      message: `Today's spending of ${formatCurrency(todaySpend)} is above average.`
    };
  }
  
  return {
    status: 'safe',
    label: 'All Clear',
    message: 'Your finances look healthy today.'
  };
}

/**
 * Calculate today's total spending
 */
export function getTodaySpend() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const transactions = getDocs('transactions', tx => {
    const txDate = new Date(tx.timestamp);
    return txDate >= today && tx.amount < 0;
  });
  
  const total = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  
  return {
    value: total,
    formatted: formatCurrency(total),
    count: transactions.length
  };
}

/**
 * Get recent transactions sorted by date
 */
export function getRecentTransactions(limit = 5) {
  const transactions = getDocs('transactions');
  return transactions
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .map(tx => ({
      ...tx,
      formattedAmount: formatCurrency(Math.abs(tx.amount)),
      isNegative: tx.amount < 0,
      icon: CATEGORY_ICONS[tx.category] || CATEGORY_ICONS.default,
      timeAgo: getTimeAgo(tx.timestamp),
      isLarge: Math.abs(tx.amount) >= 200
    }));
}

/**
 * Check for large transactions above threshold
 */
export function checkLargeTransactions(threshold = 200) {
  const unread = getDocs('alerts', alert => !alert.read && alert.type === 'large_transaction');
  return unread;
}

/**
 * Generate a spoken briefing summary
 */
export function generateBriefing() {
  const balance = getCurrentBalance();
  const safety = getSafetyStatus();
  const todaySpend = getTodaySpend();
  const alerts = checkLargeTransactions();
  
  let briefing = `Good ${getTimeOfDay()}. `;
  briefing += `Your current balance is ${speakCurrency(balance.value)}. `;
  
  // Safety status
  if (safety.status === 'safe') {
    briefing += `Your account status is safe. ${safety.message} `;
  } else if (safety.status === 'caution') {
    briefing += `Caution. ${safety.message} `;
  } else {
    briefing += `Alert. ${safety.message} `;
  }
  
  // Today's spending
  if (todaySpend.count > 0) {
    briefing += `You have spent ${speakCurrency(todaySpend.value)} across ${todaySpend.count} transaction${todaySpend.count > 1 ? 's' : ''} today. `;
  } else {
    briefing += `You have no spending recorded today. `;
  }
  
  // Large transaction alerts
  if (alerts.length > 0) {
    briefing += `There ${alerts.length === 1 ? 'is' : 'are'} ${alerts.length} large transaction alert${alerts.length > 1 ? 's' : ''} that need your attention. `;
  }
  
  briefing += `That's your Aura brief. Have a calm day.`;
  
  return briefing;
}

/**
 * Generate alert speech for a specific transaction
 */
export function generateTransactionAlert(transaction) {
  const amount = Math.abs(transaction.amount);
  return `Attention. A large transaction of ${speakCurrency(amount)} was detected at ${transaction.merchant}. Please review this purchase in your Aura dashboard.`;
}

// ── Helpers ─────────────────────────────────

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}

function speakCurrency(value) {
  const dollars = Math.floor(value);
  const cents = Math.round((value % 1) * 100);
  
  if (cents === 0) {
    return `${dollars} dollars`;
  }
  return `${dollars} dollars and ${cents} cents`;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}
