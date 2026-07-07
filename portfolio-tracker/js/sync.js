const FINNHUB_KEY_STORAGE = 'ptrack_finnhub_key';

function getApiKey() {
  return localStorage.getItem(FINNHUB_KEY_STORAGE) || '';
}

function setApiKey(key) {
  if (key) localStorage.setItem(FINNHUB_KEY_STORAGE, key);
  else localStorage.removeItem(FINNHUB_KEY_STORAGE);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchQuote(symbol, apiKey) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error('Network error');
  }
  if (res.status === 401 || res.status === 403) throw new Error('Invalid API key');
  if (res.status === 429) throw new Error('Rate limited');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.c == null || (json.c === 0 && json.pc === 0)) throw new Error('Symbol not found');
  return { price: json.c, prevClose: json.pc };
}

async function refreshAllPrices(state, { onProgress } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, reason: 'no-key', updated: [], failed: [] };
  const symbols = [...new Set(state.positions.map((p) => p.symbol))];
  if (!symbols.length) return { ok: true, reason: 'no-positions', updated: [], failed: [] };

  const results = { updated: [], failed: [] };
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    if (onProgress) onProgress({ index: i, total: symbols.length, symbol });
    try {
      const { price } = await fetchQuote(symbol, apiKey);
      state.positions.forEach((p) => { if (p.symbol === symbol) p.price = price; });
      results.updated.push(symbol);
    } catch (err) {
      results.failed.push({ symbol, error: err.message });
    }
    if (i < symbols.length - 1) await sleep(1100);
  }

  state.lastSyncedAt = new Date().toISOString();
  recordSnapshot(state);
  saveState(state);
  return { ok: true, ...results };
}

const AUTO_REFRESH_STALE_MS = 5 * 60 * 1000;

async function maybeAutoRefreshPrices(state) {
  if (!getApiKey()) return;
  const lastSynced = state.lastSyncedAt ? new Date(state.lastSyncedAt).getTime() : 0;
  if (Date.now() - lastSynced < AUTO_REFRESH_STALE_MS) return;
  await refreshAllPrices(state);
  renderAll(state);
}

function formatSyncedAgo(isoString) {
  if (!isoString) return 'Never synced';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Synced just now';
  if (mins < 60) return `Synced ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Synced ${days}d ago`;
}

let lastSyncMessage = '';

function renderSyncCard(state, { compact = false, onDone } = {}) {
  const card = el('div', { class: `price-sync ${compact ? 'sync-bar' : 'card'}` });

  if (!compact) {
    card.appendChild(el('h2', { text: 'Live price sync' }));
    card.appendChild(el('p', { class: 'card-sub', text: "Pull current prices for every symbol you hold from Finnhub (a free market-data API — not a brokerage login) instead of typing prices in by hand. Once a key is saved, prices also auto-refresh whenever you open the app (if it's been more than 5 minutes since the last sync)." }));
  }

  const statusEl = el('span', { class: 'help-text sync-status', text: lastSyncMessage || formatSyncedAgo(state.lastSyncedAt) });
  if (compact) statusEl.style.margin = '0';

  const keyRow = el('div', { class: 'btn-row', style: compact ? 'margin-bottom:0;align-items:center' : '' });

  if (!compact) {
    const keyInput = el('input', { type: 'password', placeholder: 'Finnhub API key', style: 'max-width:260px', value: getApiKey() });
    const saveBtn = el('button', { class: 'btn secondary', type: 'button', text: 'Save key' });
    saveBtn.addEventListener('click', () => {
      setApiKey(keyInput.value.trim());
      lastSyncMessage = keyInput.value.trim() ? 'API key saved.' : 'API key cleared.';
      statusEl.textContent = lastSyncMessage;
    });
    keyRow.appendChild(keyInput);
    keyRow.appendChild(saveBtn);
  }

  const refreshBtn = el('button', { class: 'btn', type: 'button', text: 'Refresh prices now' });
  keyRow.appendChild(refreshBtn);
  keyRow.appendChild(statusEl);
  card.appendChild(keyRow);

  if (!compact) {
    card.appendChild(el('p', { class: 'help-text', text: 'Get a free key at finnhub.io (free tier: 60 requests/minute, no credit card required). The key is stored only in this browser and is never included in JSON backups. Some tickers — mutual funds, certain international listings — may not be covered by the free tier; edit those prices manually below.' }));
  }

  refreshBtn.addEventListener('click', async () => {
    if (!getApiKey()) { lastSyncMessage = 'Add your Finnhub API key first.'; statusEl.textContent = lastSyncMessage; return; }
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing…';
    const result = await refreshAllPrices(state, {
      onProgress: ({ index, total, symbol }) => { statusEl.textContent = `Fetching ${symbol} (${index + 1}/${total})…`; },
    });
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh prices now';
    if (result.reason === 'no-key') {
      lastSyncMessage = 'Add your Finnhub API key first.';
    } else if (result.reason === 'no-positions') {
      lastSyncMessage = 'No positions to refresh yet.';
    } else {
      const parts = [];
      if (result.updated.length) parts.push(`updated ${result.updated.length}`);
      if (result.failed.length) parts.push(`failed ${result.failed.length} (${result.failed.map((f) => `${f.symbol}: ${f.error}`).join(', ')})`);
      lastSyncMessage = `${formatSyncedAgo(state.lastSyncedAt)} — ${parts.join(', ') || 'nothing to update'}`;
    }
    statusEl.textContent = lastSyncMessage;
    if (onDone) onDone();
  });

  return card;
}
