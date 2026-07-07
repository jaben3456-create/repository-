let appState = loadState();

function renderAll(state) {
  renderDashboard(state);
  renderHoldings(state);
  renderDividends(state);
  renderProjection(state);
}

const TAB_RENDERERS = {
  dashboard: renderDashboard,
  holdings: renderHoldings,
  dividends: renderDividends,
  projection: renderProjection,
};

function initTabs() {
  const buttons = document.querySelectorAll('#tabs button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      TAB_RENDERERS[btn.dataset.tab](appState);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  recordSnapshot(appState);
  saveState(appState);
  renderAll(appState);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker registration failed', err));
  }
});
