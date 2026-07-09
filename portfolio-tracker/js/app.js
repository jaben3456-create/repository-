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

function renderVersionFooter() {
  const el = document.getElementById('app-version');
  if (!el) return;
  if ('caches' in window) {
    caches.keys().then((keys) => {
      const swCache = keys.find((k) => k.startsWith('ptrack-')) || 'none';
      el.textContent = `App ${APP_VERSION} — cached as ${swCache}`;
    }).catch(() => { el.textContent = `App ${APP_VERSION}`; });
  } else {
    el.textContent = `App ${APP_VERSION}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  recordSnapshot(appState);
  saveState(appState);
  renderAll(appState);
  renderVersionFooter();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update().catch(() => {}))
      .catch((err) => console.warn('Service worker registration failed', err));
  }

  maybeAutoRefreshPrices(appState);
});
