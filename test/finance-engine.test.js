import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dataLayer from '../js/data-layer.js';
import {
  getCurrentBalance,
  getSafetyStatus,
  getTodaySpend,
  getRecentTransactions,
  formatCurrency
} from '../js/finance-engine.js';

// Mock the data-layer
vi.mock('../js/data-layer.js', () => ({
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}));

describe('Finance Engine', () => {

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('formatCurrency', () => {
    it('should format numbers clearly to USD currency strings', () => {
      expect(formatCurrency(1250.5)).toBe('$1,250.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('getCurrentBalance', () => {
    it('should return 0 balance when no accounts exist', () => {
      dataLayer.getDocs.mockReturnValue([]);
      const balance = getCurrentBalance();
      expect(balance.value).toBe(0);
      expect(balance.formatted).toBe('$0.00');
    });

    it('should format and return the balance of the first account', () => {
      dataLayer.getDocs.mockReturnValue([{ id: 'acc1', balance: 2847.53, currency: 'USD' }]);
      const balance = getCurrentBalance();
      expect(balance.value).toBe(2847.53);
      expect(balance.formatted).toBe('$2,847.53');
      expect(balance.currency).toBe('USD');
    });
  });

  describe('getSafetyStatus', () => {
    it('should return alert status when no account is found', () => {
      dataLayer.getDocs.mockReturnValueOnce([]); // for account
      const status = getSafetyStatus();
      expect(status.status).toBe('alert');
    });

    it('should return alert status when balance is very low (<100)', () => {
      // Mock account
      dataLayer.getDocs.mockImplementation((type) => {
        if (type === 'accounts') return [{ id: '1', balance: 45 }];
        if (type === 'transactions') return [];
        return [];
      });

      const status = getSafetyStatus();
      expect(status.status).toBe('alert');
      expect(status.label).toBe('Low Balance');
    });

    it('should return safe status when balance is healthy and no high spending', () => {
      dataLayer.getDocs.mockImplementation((type) => {
        if (type === 'accounts') return [{ id: '1', balance: 3000 }];
        if (type === 'transactions') return [];
        return [];
      });

      const status = getSafetyStatus();
      expect(status.status).toBe('safe');
      expect(status.label).toBe('All Clear');
    });
  });

  describe('getTodaySpend', () => {
    it('should sum negative amounts for today', () => {
      // Mock transactions returned by getDocs
      dataLayer.getDocs.mockImplementation((type, filterFn) => {
        if (type === 'transactions') {
          const mockTxs = [
            { id: '1', amount: -50, timestamp: new Date().toISOString() }, // Today negative
            { id: '2', amount: -20, timestamp: new Date().toISOString() }, // Today negative
            { id: '3', amount: 100, timestamp: new Date().toISOString() }, // Today positive (ignored)
          ];
          return filterFn ? mockTxs.filter(filterFn) : mockTxs;
        }
        return [];
      });

      const spend = getTodaySpend();
      expect(spend.value).toBe(70);
      expect(spend.count).toBe(2);
      expect(spend.formatted).toBe('$70.00');
    });
  });
});
