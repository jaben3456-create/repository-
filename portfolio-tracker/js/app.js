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

const THEME_STORAGE = 'ptrack_theme';
const THEME_CYCLE = ['auto', 'light', 'dark'];
const THEME_LABELS = { auto: 'Theme: Auto', light: 'Theme: Light', dark: 'Theme: Dark' };

function getStoredTheme() {
  const t = localStorage.getItem(THEME_STORAGE);
  return (t === 'light' || t === 'dark') ? t : 'auto';
}

function applyTheme(theme) {
  if (theme === 'auto') {
    localStorage.removeItem(THEME_STORAGE);
    document.documentElement.removeAttribute('data-theme');
  } else {
    localStorage.setItem(THEME_STORAGE, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = THEME_LABELS[theme];
}

function initThemeToggle() {
  applyTheme(getStoredTheme());
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(getStoredTheme()) + 1) % THEME_CYCLE.length];
    applyTheme(next);
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
  initThemeToggle();
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
