const ST_API_BASE_STORAGE = 'ptrack_snaptrade_api_base';
const ST_TOKEN_STORAGE = 'ptrack_snaptrade_token';

function getSnapTradeApiBase() {
  return (localStorage.getItem(ST_API_BASE_STORAGE) || '').replace(/\/+$/, '');
}
function setSnapTradeApiBase(url) {
  const cleaned = (url || '').trim().replace(/\/+$/, '');
  if (cleaned) localStorage.setItem(ST_API_BASE_STORAGE, cleaned);
  else localStorage.removeItem(ST_API_BASE_STORAGE);
}
function getSnapTradeToken() {
  return localStorage.getItem(ST_TOKEN_STORAGE) || '';
}
function setSnapTradeToken(token) {
  if (token) localStorage.setItem(ST_TOKEN_STORAGE, token);
  else localStorage.removeItem(ST_TOKEN_STORAGE);
}

async function callSnapTradeApi(path) {
  const base = getSnapTradeApiBase();
  const token = getSnapTradeToken();
  if (!base) throw new Error('Set the API base URL first.');
  if (!token) throw new Error('Set the API access token first.');
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

async function connectRobinhood() {
  const { redirectURI } = await callSnapTradeApi('/api/connect');
  if (!redirectURI) throw new Error('No connection URL returned.');
  window.location.href = redirectURI;
}

async function syncRobinhoodPositions(state) {
  const { positions } = await callSnapTradeApi('/api/positions');
  state.positions = state.positions.filter((p) => p.account !== 'Robinhood');
  const today = todayStr();
  for (const p of positions) {
    state.positions.push({ id: uid(), account: 'Robinhood', symbol: p.symbol, shares: p.shares, avgCost: p.avgCost, price: p.price, updatedAt: today });
  }
  recordSnapshot(state);
  saveState(state);
  return positions.length;
}

let lastRobinhoodMessage = '';

function renderRobinhoodCard(state, { onDone } = {}) {
  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', { text: 'Connect Robinhood (via SnapTrade)' }));
  card.appendChild(el('p', { class: 'card-sub', text: "Uses SnapTrade, a read-only account-aggregation service - you log into Robinhood directly on Robinhood's own page (with Robinhood's own 2FA); this app never sees your Robinhood password. M1 Finance isn't supported by SnapTrade, so M1 stays CSV/manual." }));

  const statusEl = el('span', { class: 'help-text robinhood-status', text: lastRobinhoodMessage || 'Not set up yet.' });

  const configRow = el('div', { class: 'btn-row' });
  const baseInput = el('input', { type: 'text', placeholder: 'https://your-app.vercel.app', style: 'max-width:280px', value: getSnapTradeApiBase() });
  const tokenInput = el('input', { type: 'password', placeholder: 'API access token', style: 'max-width:200px', value: getSnapTradeToken() });
  const saveBtn = el('button', { class: 'btn secondary', type: 'button', text: 'Save connection settings' });
  saveBtn.addEventListener('click', () => {
    setSnapTradeApiBase(baseInput.value);
    setSnapTradeToken(tokenInput.value.trim());
    lastRobinhoodMessage = 'Saved.';
    statusEl.textContent = lastRobinhoodMessage;
  });
  configRow.appendChild(baseInput);
  configRow.appendChild(tokenInput);
  configRow.appendChild(saveBtn);
  card.appendChild(configRow);

  const actionRow = el('div', { class: 'btn-row' });
  const connectBtn = el('button', { class: 'btn', type: 'button', text: 'Connect Robinhood' });
  const syncBtn = el('button', { class: 'btn', type: 'button', text: 'Sync Robinhood holdings' });
  actionRow.appendChild(connectBtn);
  actionRow.appendChild(syncBtn);
  actionRow.appendChild(statusEl);
  card.appendChild(actionRow);

  connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;
    try {
      lastRobinhoodMessage = 'Opening SnapTrade connection...';
      statusEl.textContent = lastRobinhoodMessage;
      await connectRobinhood();
    } catch (err) {
      lastRobinhoodMessage = `Error: ${err.message}`;
      statusEl.textContent = lastRobinhoodMessage;
      connectBtn.disabled = false;
    }
  });

  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    try {
      const count = await syncRobinhoodPositions(state);
      lastRobinhoodMessage = `Synced ${count} Robinhood position(s) just now.`;
    } catch (err) {
      lastRobinhoodMessage = `Error: ${err.message}`;
    }
    statusEl.textContent = lastRobinhoodMessage;
    syncBtn.disabled = false;
    syncBtn.textContent = 'Sync Robinhood holdings';
    if (onDone) onDone();
  });

  return card;
}
