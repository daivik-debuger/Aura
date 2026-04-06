/* ============================================
   AURA — Trend-Guard Agent
   Predicts market anomalies and triggers safety
   ============================================ */

export function initTrendAgent() {
  const demoBtn = document.getElementById('demo-trend-anomaly-btn');
  
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      console.warn('📉 [Trend-Guard] Predicted Market Anomaly: >3% decline in Tech assets detected.');
      
      const evt = new CustomEvent('aura-market-drop', {
        detail: {
          asset: 'Tech Market',
          drop: 3.2,
          fromFund: 'Vacation Fund',
          toFund: 'Gold'
        }
      });
      
      window.dispatchEvent(evt);
    });
  }
  
  console.log('[Trend-Guard] Agent active. Monitoring delta across top 5 assets.');
}
