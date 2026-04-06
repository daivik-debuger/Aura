/* ============================================
   AURA — Data Layer
   Firestore-compatible local data access
   ============================================ */

import { db } from './firebase-init.js';
import { collection, addDoc as fsAddDoc, onSnapshot as fsOnSnapshot, writeBatch, doc, updateDoc } from 'firebase/firestore';

let _data = null;
let _listeners = [];

/**
 * Initialize data layer from local JSON or Firestore
 */
export async function initDataLayer() {
  if (_data) return _data;
  
  try {
    const resp = await fetch('/data/dummy-data.json');
    const localDummy = await resp.json();
    
    // Initialize empty memory cache
    _data = { accounts: [], transactions: [], alerts: [] };
    
    console.log('[DataLayer] Setting up Firebase Cloud-Sync...');
    
    // Start syncing accounts
    fsOnSnapshot(collection(db, 'accounts'), (snapshot) => {
      _data.accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      _notifyListeners('accounts');
    });

    // Start syncing transactions
    let isSeeding = false;
    fsOnSnapshot(collection(db, 'transactions'), (snapshot) => {
      _data.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      _notifyListeners('transactions');
      
      // Auto-Seed Data Hack: If cloud is completely empty, populate it with our local dummy data
      if (snapshot.empty && !isSeeding) {
        isSeeding = true;
        console.warn('[DataLayer] 🚀 Firestore completely empty! Automatically seeding it with dummy-data.json so the demo works.');
        _seedCloudDatabase(localDummy);
      }
    });

    // Wait briefly for first snapshot return
    await new Promise(r => setTimeout(r, 1200));
    console.log('[DataLayer] 🔥 Firebase Cloud-Sync is Active');
    
    return _data;
  } catch (err) {
    console.error('[DataLayer] Failed to load data:', err);
    throw err;
  }
}

async function _seedCloudDatabase(localDummy) {
  try {
    const batch = writeBatch(db);
    localDummy.accounts.forEach(acc => batch.set(doc(collection(db, 'accounts')), acc));
    localDummy.transactions.forEach(tx => batch.set(doc(collection(db, 'transactions')), tx));
    await batch.commit();
    console.log('[DataLayer] Initial Seeding Complete ✅');
  } catch (e) {
    console.error('[DataLayer] Seeding failed:', e);
  }
}

/**
 * Get a single document by collection/id (mirrors Firestore getDoc)
 */
export function getDoc(collection, id) {
  if (!_data || !_data[collection]) return null;
  return _data[collection].find(doc => doc.id === id) || null;
}

/**
 * Get all documents in a collection (mirrors Firestore getDocs)
 */
export function getDocs(collection, queryFn) {
  if (!_data || !_data[collection]) return [];
  let docs = [..._data[collection]];
  if (queryFn) {
    docs = docs.filter(queryFn);
  }
  return docs;
}

/**
 * Add a document to a collection
 */
export async function addDoc(collectionName, docData) {
  try {
    // Write directly to cloud. The fsOnSnapshot will pull it back down automatically.
    await fsAddDoc(collection(db, collectionName), docData);
  } catch (e) {
    console.error('[DataLayer] Failed to push to cloud:', e);
  }
  return docData;
}

/**
 * Subscribe to changes (mirrors Firestore onSnapshot)
 */
export function onSnapshot(collection, callback) {
  const listener = { collection, callback };
  _listeners.push(listener);
  
  // Call immediately with current data
  callback(getDocs(collection));
  
  // Return unsubscribe function
  return () => {
    _listeners = _listeners.filter(l => l !== listener);
  };
}

/**
 * Simulate a new incoming transaction (for demo purposes)
 */
export function simulateTransaction(transaction) {
  if (!transaction.id) {
    transaction.id = `tx_${Date.now()}`;
  }
  if (!transaction.timestamp) {
    transaction.timestamp = new Date().toISOString();
  }
  if (!transaction.status) {
    transaction.status = 'completed';
  }
  // Fire-and-forget push to Firebase
  addDoc('transactions', transaction);

  const account = _data.accounts[0];
  if (account) {
    const newBalance = account.balance + transaction.amount;
    updateDoc(doc(db, 'accounts', account.id), { balance: newBalance });
  }

  return transaction;
}

function _notifyListeners(collection) {
  _listeners
    .filter(l => l.collection === collection)
    .forEach(l => l.callback(getDocs(collection)));
}
